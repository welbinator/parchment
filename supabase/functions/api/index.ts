import { createClient } from 'npm:@supabase/supabase-js@2'

const ALLOWED_ORIGINS = new Set([
  'https://theparchment.app',
  'https://staging.theparchment.app',
  'http://localhost:8080',
  'http://localhost:5173',
])

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://theparchment.app'
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
    'Vary': 'Origin',
  }
}

const MAX_BLOCK_CONTENT_BYTES = 10 * 1024 // 10KB per block
const MAX_TITLE_LENGTH = 512 // max chars for page/collection titles and names
const APP_URL = Deno.env.get('APP_URL') ?? 'https://theparchment.app'
const VALID_BLOCK_TYPES = new Set(['text', 'heading1', 'heading2', 'heading3', 'bullet_list', 'numbered_list', 'todo', 'quote', 'divider', 'code', 'group'])

// Convert styled text JSON arrays to HTML
interface StyledJsonItem {
  text?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  color?: string;
  link?: string;
  href?: string;
}

// Bots sometimes send [{"text":"hello","bold":true}] instead of "<b>hello</b>"
function convertStyledJsonToHtml(content: string): string {
  if (!content || !content.trim().startsWith('[')) return content
  try {
    const parsed = JSON.parse(content)
    if (!Array.isArray(parsed)) return content
    return parsed.map((item: StyledJsonItem | string) => {
      if (typeof item === 'string') return item
      if (typeof item !== 'object' || !item.text) return ''
      let html = item.text ?? ''
      if (item.bold) html = `<b>${html}</b>`
      if (item.italic) html = `<i>${html}</i>`
      if (item.underline) html = `<u>${html}</u>`
      if (item.strikethrough) html = `<s>${html}</s>`
      if (item.code) html = `<code>${html}</code>`
      if (item.color) html = `<span style="color:${item.color}">${html}</span>`
      if (item.link || item.href) html = `<a href="${item.link || item.href}" target="_blank" rel="noopener noreferrer">${html}</a>`
      return html
    }).join('')
  } catch {
    return content
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing x-api-key header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Validate key — rate limiting is handled atomically inside validate_api_key
    const { data: validation, error: valError } = await supabase.rpc('validate_api_key', { p_key: apiKey })
    if (valError || !validation?.valid) {
      if (validation?.rate_limited) {
        return new Response(JSON.stringify({
          error: validation.reason,
          retry_after: validation.retry_after,
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': validation.retry_after === 'tomorrow' ? '86400' : '60' },
        })
      }
      return new Response(JSON.stringify({ error: 'Invalid or expired API key' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = validation.user_id
    const keyType: 'master' | 'workspace' = validation.key_type ?? 'master'
    const keyWorkspaceIds: string[] | null = validation.workspace_ids ?? null
    const canManageWorkspaces: boolean = validation.can_manage_workspaces ?? false
    const permissions = {
      can_create_collections: validation.can_create_collections,
      can_delete_collections: validation.can_delete_collections,
      can_create_pages: validation.can_create_pages,
      can_delete_pages: validation.can_delete_pages,
      can_read_pages: validation.can_read_pages,
      can_write_blocks: validation.can_write_blocks,
    }

    // Helper: for workspace keys, restrict a collection query to allowed workspaces.
    // Returns null if the collection is accessible, or a 403 response if not.
    async function assertCollectionAccess(collection_id: string): Promise<Response | null> {
      if (keyType !== 'workspace' || !keyWorkspaceIds || keyWorkspaceIds.length === 0) return null
      const { data: col } = await supabase
        .from('collections')
        .select('workspace_id')
        .eq('id', collection_id)
        .eq('user_id', userId)
        .single()
      if (!col) return json({ error: 'Collection not found' }, corsHeaders, 404)
      if (!keyWorkspaceIds.includes(col.workspace_id)) {
        return json({ error: 'This workspace key does not have access to that collection\'s workspace' }, corsHeaders, 403)
      }
      return null
    }

    const body = await req.json()
    const { action } = body

    // Shared helper: resolve a workspace by name (partial, case-insensitive) or ID.
    // Returns the workspace ID string, or a Response error to return immediately.
    const resolveWorkspaceId = async (
      wsId: string | undefined,
      wsName: string | undefined
    ): Promise<string | Response> => {
      if (wsId) return wsId
      if (wsName) {
        const { data: matchedWs } = await supabase
          .from('workspaces').select('id, name')
          .eq('user_id', userId).is('deleted_at', null)
          .ilike('name', `%${wsName.trim()}%`)
          .order('created_at', { ascending: true })
        if (!matchedWs || matchedWs.length === 0) {
          const { data: allWs } = await supabase.from('workspaces').select('name').eq('user_id', userId).is('deleted_at', null).order('created_at', { ascending: true })
          return new Response(JSON.stringify({ error: `No workspace found matching "${wsName}".`, available_workspaces: (allWs || []).map((w: { name: string }) => w.name), hint: 'Use list_workspaces to see all workspaces.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        if (matchedWs.length > 1) {
          return new Response(JSON.stringify({ error: `Multiple workspaces match "${wsName}". Please be more specific.`, matches: matchedWs.map((w: { id: string; name: string }) => ({ id: w.id, name: w.name })), hint: 'Use the exact name or pass workspace_id.' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        return matchedWs[0].id as string
      }
      return new Response(JSON.stringify({ error: 'workspace_id or workspace_name is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Route actions
    switch (action) {
      case 'list_collections': {
        if (!permissions.can_read_pages) return deny(corsHeaders)
        let query = supabase.from('collections').select('id, name, icon, position, workspace_id, created_at').eq('user_id', userId)
        // Workspace keys only see collections in their allowed workspaces
        if (keyType === 'workspace' && keyWorkspaceIds && keyWorkspaceIds.length > 0) {
          query = query.in('workspace_id', keyWorkspaceIds)
        }
        const { data } = await query.order('position')
        return json({ collections: data }, corsHeaders)
      }

      case 'create_collection': {
        if (!permissions.can_create_collections) return deny(corsHeaders)
        const { name, workspace_id, workspace_name } = body
        if (!name || typeof name !== 'string' || name.trim().length === 0) return json({ error: 'name is required' }, corsHeaders, 400)
        if (name.length > MAX_TITLE_LENGTH) return json({ error: `name exceeds maximum length of ${MAX_TITLE_LENGTH} characters` }, corsHeaders, 400)
        // Workspace keys must provide a workspace_id that is in their allowed list
        let targetWorkspaceId = workspace_id

        // Allow workspace_name as a human-friendly alternative to workspace_id.
        // Supports partial, case-insensitive matching so AI assistants can pass
        // natural-language names like "work" and match "Work Stuff".
        // If multiple workspaces match, returns an error listing the matches so
        // the AI can ask the user to clarify.
        if (!targetWorkspaceId && workspace_name) {
          const { data: matchedWs } = await supabase
            .from('workspaces')
            .select('id, name')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .ilike('name', `%${workspace_name.trim()}%`)
            .order('created_at', { ascending: true })
          if (!matchedWs || matchedWs.length === 0) {
            const { data: allWs } = await supabase
              .from('workspaces')
              .select('name')
              .eq('user_id', userId)
              .is('deleted_at', null)
              .order('created_at', { ascending: true })
            const names = (allWs || []).map((w: { name: string }) => w.name)
            return json({
              error: `No workspace found matching "${workspace_name}".`,
              available_workspaces: names,
              hint: 'Use list_workspaces to see all workspaces, then retry with the exact or partial name.',
            }, corsHeaders, 404)
          }
          if (matchedWs.length > 1) {
            return json({
              error: `Multiple workspaces match "${workspace_name}". Please be more specific.`,
              matches: matchedWs.map((w: { id: string; name: string }) => ({ id: w.id, name: w.name })),
              hint: 'Retry with workspace_name set to the exact name, or pass workspace_id directly.',
            }, corsHeaders, 409)
          }
          targetWorkspaceId = matchedWs[0].id
        }

        if (keyType === 'workspace') {
          if (!targetWorkspaceId || !keyWorkspaceIds?.includes(targetWorkspaceId)) {
            return json({ error: 'workspace_id is required and must be one of this key\'s allowed workspaces' }, corsHeaders, 403)
          }
        }
        // For personal keys: if still no workspace_id, default to the user's
        // first workspace (sorted by created_at) so collections are always visible
        // in the UI. Without this, collections created via API land in a null-workspace
        // limbo and never appear in the sidebar.
        if (!targetWorkspaceId) {
          const { data: defaultWs } = await supabase
            .from('workspaces')
            .select('id')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .order('created_at', { ascending: true })
            .limit(1)
            .single()
          if (defaultWs) targetWorkspaceId = defaultWs.id
        }

        // Enforce free plan limits
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('plan')
          .eq('user_id', userId)
          .single()
        const userPlan = subData?.plan ?? 'free'
        if (userPlan === 'free') {
          const { count } = await supabase
            .from('collections')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .is('deleted_at', null)
          if ((count ?? 0) >= 5) {
            return json({
              error: 'Free plan limit reached',
              limit_type: 'collections',
              limit: 5,
              upgrade_url: 'https://theparchment.app/settings',
            }, corsHeaders, 402)
          }
        }

        const { data: existing } = await supabase.from('collections').select('position').eq('user_id', userId).order('position', { ascending: false }).limit(1)
        const position = (existing?.[0]?.position ?? -1) + 1
        const { data, error } = await supabase.from('collections').insert({ user_id: userId, name: name || 'Untitled', position, workspace_id: targetWorkspaceId ?? null }).select().single()
        if (error) return json({ error: error.message }, corsHeaders, 400)
        return json({ collection: data }, corsHeaders)
      }

      case 'delete_collection': {
        if (!permissions.can_delete_collections) return deny(corsHeaders)
        const { collection_id } = body
        const accessDenied = await assertCollectionAccess(collection_id)
        if (accessDenied) return accessDenied
        const { data: col } = await supabase.from('collections').select('id').eq('id', collection_id).eq('user_id', userId).single()
        if (!col) return json({ error: 'Collection not found' }, corsHeaders, 404)
        const { error } = await supabase.from('collections').delete().eq('id', collection_id)
        if (error) return json({ error: error.message }, corsHeaders, 400)
        return json({ success: true }, corsHeaders)
      }

      case 'list_pages': {
        if (!permissions.can_read_pages) return deny(corsHeaders)
        const { collection_id } = body
        if (collection_id) {
          const accessDenied = await assertCollectionAccess(collection_id)
          if (accessDenied) return accessDenied
        }
        let query = supabase.from('pages').select('id, title, type, collection_id, created_at, updated_at').eq('user_id', userId)
        if (collection_id) {
          query = query.eq('collection_id', collection_id)
        } else if (keyType === 'workspace' && keyWorkspaceIds && keyWorkspaceIds.length > 0) {
          // Scope to pages in collections belonging to allowed workspaces
          const { data: wsCols } = await supabase
            .from('collections')
            .select('id')
            .eq('user_id', userId)
            .in('workspace_id', keyWorkspaceIds)
          const colIds = (wsCols ?? []).map((c: { id: string }) => c.id)
          if (colIds.length === 0) return json({ pages: [] }, corsHeaders)
          query = query.in('collection_id', colIds)
        }
        const { data } = await query.order('created_at')
        return json({ pages: data }, corsHeaders)
      }

      case 'create_page': {
        if (!permissions.can_create_pages) return deny(corsHeaders)
        const { collection_id, title, type } = body
        if (title && title.length > MAX_TITLE_LENGTH) return json({ error: `title exceeds maximum length of ${MAX_TITLE_LENGTH} characters` }, corsHeaders, 400)
        const accessDenied = await assertCollectionAccess(collection_id)
        if (accessDenied) return accessDenied
        const { data: col } = await supabase.from('collections').select('id').eq('id', collection_id).eq('user_id', userId).single()
        if (!col) return json({ error: 'Collection not found' }, corsHeaders, 404)

        // Enforce free plan limits
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('plan')
          .eq('user_id', userId)
          .single()
        const userPlan = subData?.plan ?? 'free'
        if (userPlan === 'free') {
          const { count } = await supabase
            .from('pages')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .is('deleted_at', null)
          if ((count ?? 0) >= 15) {
            return json({
              error: 'Free plan limit reached',
              limit_type: 'pages',
              limit: 15,
              upgrade_url: 'https://theparchment.app/settings',
            }, corsHeaders, 402)
          }
        }

        const { data: page, error } = await supabase.from('pages').insert({
          user_id: userId, collection_id, title: title || 'Untitled', type: type || 'blank',
        }).select().single()
        if (error) return json({ error: error.message }, corsHeaders, 400)
        await supabase.from('blocks').insert({ page_id: page.id, type: 'text', content: '', position: 0 })
        return json({ page }, corsHeaders)
      }

      case 'delete_page': {
        if (!permissions.can_delete_pages) return deny(corsHeaders)
        const { page_id } = body
        const { data: pg } = await supabase.from('pages').select('id').eq('id', page_id).eq('user_id', userId).single()
        if (!pg) return json({ error: 'Page not found' }, corsHeaders, 404)
        const { error } = await supabase.from('pages').delete().eq('id', page_id)
        if (error) return json({ error: error.message }, corsHeaders, 400)
        return json({ success: true }, corsHeaders)
      }

      case 'get_page': {
        if (!permissions.can_read_pages) return deny(corsHeaders)
        const { page_id } = body
        const { data: page } = await supabase.from('pages').select('*').eq('id', page_id).eq('user_id', userId).single()
        if (!page) return json({ error: 'Page not found' }, corsHeaders, 404)
        const { data: pageBlocks } = await supabase.from('blocks').select('*').eq('page_id', page_id).order('position')
        return json({ page, blocks: pageBlocks }, corsHeaders)
      }

      // append_blocks: adds new blocks to the END of the page (does not remove existing blocks)
      // update_blocks: alias for append_blocks (kept for backwards compatibility)
      case 'append_blocks':
      case 'update_blocks': {
        if (!permissions.can_write_blocks) return deny(corsHeaders)
        const { page_id, blocks } = body
        const { data: pg } = await supabase.from('pages').select('id').eq('id', page_id).eq('user_id', userId).single()
        if (!pg) return json({ error: 'Page not found' }, corsHeaders, 404)

        // Validate blocks
        for (const block of blocks) {
          if (block.type && !VALID_BLOCK_TYPES.has(block.type)) {
            return json({
              error: `Invalid block type: "${block.type}". Valid types: ${[...VALID_BLOCK_TYPES].join(', ')}`,
              block_id: block.id || 'new',
            }, corsHeaders, 400)
          }
          if (block.content && new TextEncoder().encode(block.content).length > MAX_BLOCK_CONTENT_BYTES) {
            return json({
              error: `Block content exceeds maximum size of ${MAX_BLOCK_CONTENT_BYTES / 1024}KB`,
              block_id: block.id || 'new',
            }, corsHeaders, 413)
          }
        }

        // Get current max position so appended blocks follow existing ones
        const { data: existingBlocks } = await supabase
          .from('blocks')
          .select('position')
          .eq('page_id', page_id)
          .order('position', { ascending: false })
          .limit(1)
        const startPosition = (existingBlocks?.[0]?.position ?? -1) + 1

        const insertedBlocks: Record<string, unknown>[] = []
        for (let i = 0; i < blocks.length; i++) {
          const block = blocks[i]
          const content = convertStyledJsonToHtml(block.content || '')
          const position = startPosition + i
          const { data: inserted } = await supabase.from('blocks').upsert({
            id: block.id || undefined,
            page_id,
            type: block.type || 'text',
            content,
            checked: block.checked ?? null,
            indent_level: block.indent_level ?? 0,
            position,
            group_id: block.group_id || null,
          }).select().single()
          if (inserted) insertedBlocks.push(inserted)
        }
        return json({ success: true, mode: 'append', blocks_added: insertedBlocks.length, blocks: insertedBlocks }, corsHeaders)
      }

      // update_block: updates a single existing block's content/type/checked/indent in-place by ID.
      // Does not change position. Returns the updated block.
      case 'update_block': {
        if (!permissions.can_write_blocks) return deny(corsHeaders)
        const { page_id, block_id: ub_id, content: ub_content, type: ub_type, checked: ub_checked, indent_level: ub_indent } = body
        if (!page_id || !ub_id) return json({ error: 'page_id and block_id are required' }, corsHeaders, 400)
        const { data: pg } = await supabase.from('pages').select('id').eq('id', page_id).eq('user_id', userId).single()
        if (!pg) return json({ error: 'Page not found' }, corsHeaders, 404)
        const { data: existing } = await supabase.from('blocks').select('id').eq('id', ub_id).eq('page_id', page_id).single()
        if (!existing) return json({ error: 'Block not found' }, corsHeaders, 404)
        if (ub_type && !VALID_BLOCK_TYPES.has(ub_type)) {
          return json({ error: `Invalid block type: "${ub_type}". Valid types: ${[...VALID_BLOCK_TYPES].join(', ')}` }, corsHeaders, 400)
        }
        if (ub_content && new TextEncoder().encode(ub_content).length > MAX_BLOCK_CONTENT_BYTES) {
          return json({ error: `Block content exceeds maximum size of ${MAX_BLOCK_CONTENT_BYTES / 1024}KB` }, corsHeaders, 413)
        }
        const ub_updates: Record<string, unknown> = {}
        if (ub_content !== undefined) ub_updates.content = convertStyledJsonToHtml(ub_content)
        if (ub_type !== undefined) ub_updates.type = ub_type
        if (ub_checked !== undefined) ub_updates.checked = ub_checked
        if (ub_indent !== undefined) ub_updates.indent_level = ub_indent
        if (Object.keys(ub_updates).length === 0) return json({ error: 'Nothing to update — provide at least one of: content, type, checked, indent_level' }, corsHeaders, 400)
        const { data: ub_updated, error: ub_err } = await supabase.from('blocks').update(ub_updates).eq('id', ub_id).select().single()
        if (ub_err) return json({ error: ub_err.message }, corsHeaders, 400)
        return json({ success: true, block: ub_updated }, corsHeaders)
      }

      // insert_blocks: inserts new blocks at a specific position in the page.
      // Pass after_block_id to insert after a specific block, or position (0-based integer) to insert at that index.
      // All existing blocks at or after the insert point are shifted down to make room.
      case 'insert_blocks': {
        if (!permissions.can_write_blocks) return deny(corsHeaders)
        const { page_id, blocks: ib_blocks, after_block_id: ib_after, position: ib_pos } = body
        if (!page_id || !ib_blocks?.length) return json({ error: 'page_id and blocks are required' }, corsHeaders, 400)
        if (ib_after === undefined && ib_pos === undefined) return json({ error: 'after_block_id or position is required' }, corsHeaders, 400)
        const { data: pg } = await supabase.from('pages').select('id').eq('id', page_id).eq('user_id', userId).single()
        if (!pg) return json({ error: 'Page not found' }, corsHeaders, 404)
        for (const block of ib_blocks) {
          if (block.type && !VALID_BLOCK_TYPES.has(block.type)) {
            return json({ error: `Invalid block type: "${block.type}". Valid types: ${[...VALID_BLOCK_TYPES].join(', ')}`, block_id: 'new' }, corsHeaders, 400)
          }
          if (block.content && new TextEncoder().encode(block.content).length > MAX_BLOCK_CONTENT_BYTES) {
            return json({ error: `Block content exceeds maximum size of ${MAX_BLOCK_CONTENT_BYTES / 1024}KB` }, corsHeaders, 413)
          }
        }
        let insertAt: number
        if (ib_after) {
          const { data: refBlock } = await supabase.from('blocks').select('position').eq('id', ib_after).eq('page_id', page_id).single()
          if (!refBlock) return json({ error: 'after_block_id not found on this page' }, corsHeaders, 404)
          insertAt = (refBlock.position as number) + 1
        } else {
          insertAt = ib_pos as number
        }
        // Shift existing blocks at or after insertAt to make room
        const { data: toShift } = await supabase.from('blocks').select('id, position').eq('page_id', page_id).gte('position', insertAt).order('position', { ascending: false })
        if (toShift?.length) {
          for (const b of toShift) {
            await supabase.from('blocks').update({ position: (b.position as number) + ib_blocks.length }).eq('id', b.id)
          }
        }
        const insertedBlocks: Record<string, unknown>[] = []
        let ib_offset = 0
        for (const block of ib_blocks) {
          const i = ib_offset++
          const { data: inserted } = await supabase.from('blocks').insert({
            page_id,
            type: block.type || 'text',
            content: convertStyledJsonToHtml(block.content || ''),
            checked: block.checked ?? null,
            indent_level: block.indent_level ?? 0,
            position: insertAt + i,
            group_id: block.group_id || null,
          }).select().single()
          if (inserted) insertedBlocks.push(inserted)
        }
        return json({ success: true, blocks_added: insertedBlocks.length, inserted_at: insertAt, blocks: insertedBlocks }, corsHeaders)
      }

      // replace_blocks: deletes ALL existing blocks on the page, then inserts the new blocks in order.
      // Use this when you want to fully rewrite a page's content.
      case 'replace_blocks': {
        if (!permissions.can_write_blocks) return deny(corsHeaders)
        const { page_id, blocks } = body
        const { data: pg } = await supabase.from('pages').select('id').eq('id', page_id).eq('user_id', userId).single()
        if (!pg) return json({ error: 'Page not found' }, corsHeaders, 404)

        // Validate blocks first before making any changes
        for (const block of blocks) {
          if (block.type && !VALID_BLOCK_TYPES.has(block.type)) {
            return json({
              error: `Invalid block type: "${block.type}". Valid types: ${[...VALID_BLOCK_TYPES].join(', ')}`,
              block_id: block.id || 'new',
            }, corsHeaders, 400)
          }
          if (block.content && new TextEncoder().encode(block.content).length > MAX_BLOCK_CONTENT_BYTES) {
            return json({
              error: `Block content exceeds maximum size of ${MAX_BLOCK_CONTENT_BYTES / 1024}KB`,
              block_id: block.id || 'new',
            }, corsHeaders, 413)
          }
        }

        // Delete all existing blocks and insert new ones atomically via RPC
        const blocksForRpc = blocks.map((block: Record<string, unknown>, i: number) => ({
          type: block.type || 'text',
          content: convertStyledJsonToHtml(block.content as string || ''),
          checked: block.checked ?? null,
          indent_level: block.indent_level ?? 0,
          position: i,
          group_id: block.group_id || '',
        }))
        const { error: rpcError } = await supabase.rpc('replace_blocks_tx', {
          p_page_id: page_id,
          p_blocks: blocksForRpc,
        })
        if (rpcError) {
          console.error('[replace_blocks] RPC error:', rpcError)
          return json({ error: 'Failed to replace blocks' }, corsHeaders, 500)
        }
        return json({ success: true, mode: 'replace', blocks_written: blocks.length }, corsHeaders)
      }

      case 'delete_block': {
        if (!permissions.can_write_blocks) return deny(corsHeaders)
        const { page_id, block_id } = body
        if (!page_id || !block_id) return json({ error: 'page_id and block_id are required' }, corsHeaders, 400)
        const { data: pg } = await supabase.from('pages').select('id').eq('id', page_id).eq('user_id', userId).single()
        if (!pg) return json({ error: 'Page not found' }, corsHeaders, 404)
        const { data: blk } = await supabase.from('blocks').select('id').eq('id', block_id).eq('page_id', page_id).single()
        if (!blk) return json({ error: 'Block not found' }, corsHeaders, 404)
        const { error } = await supabase.from('blocks').delete().eq('id', block_id)
        if (error) return json({ error: error.message }, corsHeaders, 400)
        return json({ success: true }, corsHeaders)
      }

      case 'delete_group': {
        if (!permissions.can_write_blocks) return deny(corsHeaders)
        const { page_id, group_block_id } = body
        if (!page_id || !group_block_id) return json({ error: 'page_id and group_block_id are required' }, corsHeaders, 400)
        const { data: pg } = await supabase.from('pages').select('id').eq('id', page_id).eq('user_id', userId).single()
        if (!pg) return json({ error: 'Page not found' }, corsHeaders, 404)
        const { data: grp } = await supabase.from('blocks').select('id, type').eq('id', group_block_id).eq('page_id', page_id).single()
        if (!grp) return json({ error: 'Group block not found' }, corsHeaders, 404)
        if (grp.type !== 'group') return json({ error: 'Block is not a group block' }, corsHeaders, 400)
        // Delete children first (CASCADE handles it but be explicit)
        await supabase.from('blocks').delete().eq('group_id', group_block_id)
        const { error } = await supabase.from('blocks').delete().eq('id', group_block_id)
        if (error) return json({ error: error.message }, corsHeaders, 400)
        return json({ success: true }, corsHeaders)
      }

      case 'rename_page': {
        if (!permissions.can_create_pages) return deny(corsHeaders)
        const { page_id, title } = body
        if (!page_id || !title) return json({ error: 'page_id and title are required' }, corsHeaders, 400)
        if (title.length > MAX_TITLE_LENGTH) return json({ error: `title exceeds maximum length of ${MAX_TITLE_LENGTH} characters` }, corsHeaders, 400)
        const { data: pg } = await supabase.from('pages').select('id').eq('id', page_id).eq('user_id', userId).single()
        if (!pg) return json({ error: 'Page not found' }, corsHeaders, 404)
        const { error } = await supabase.from('pages').update({ title }).eq('id', page_id)
        if (error) return json({ error: error.message }, corsHeaders, 400)
        return json({ success: true }, corsHeaders)
      }

      case 'move_page': {
        if (!permissions.can_create_pages) return deny(corsHeaders)
        const { page_id, collection_id: target_collection_id } = body
        if (!page_id || !target_collection_id) return json({ error: 'page_id and collection_id are required' }, corsHeaders, 400)
        // Verify page belongs to user
        const { data: pg } = await supabase.from('pages').select('id').eq('id', page_id).eq('user_id', userId).single()
        if (!pg) return json({ error: 'Page not found' }, corsHeaders, 404)
        // Verify target collection belongs to user
        const { data: col } = await supabase.from('collections').select('id').eq('id', target_collection_id).eq('user_id', userId).single()
        if (!col) return json({ error: 'Collection not found' }, corsHeaders, 404)
        const { error } = await supabase.from('pages').update({ collection_id: target_collection_id }).eq('id', page_id)
        if (error) return json({ error: error.message }, corsHeaders, 400)
        return json({ success: true }, corsHeaders)
      }

      case 'rename_collection': {
        if (!permissions.can_create_collections) return deny(corsHeaders)
        const { collection_id, name } = body
        if (!collection_id || !name) return json({ error: 'collection_id and name are required' }, corsHeaders, 400)
        if (name.length > MAX_TITLE_LENGTH) return json({ error: `name exceeds maximum length of ${MAX_TITLE_LENGTH} characters` }, corsHeaders, 400)
        const accessDenied = await assertCollectionAccess(collection_id)
        if (accessDenied) return accessDenied
        const { data: col } = await supabase.from('collections').select('id').eq('id', collection_id).eq('user_id', userId).single()
        if (!col) return json({ error: 'Collection not found' }, corsHeaders, 404)
        const { error } = await supabase.from('collections').update({ name }).eq('id', collection_id)
        if (error) return json({ error: error.message }, corsHeaders, 400)
        return json({ success: true }, corsHeaders)
      }

      // reorder_collections: set the display order of collections.
      // Pass an ordered array of collection IDs — they will be assigned positions 0, 1, 2...
      // Any collections omitted from the list keep their current position.
      case 'reorder_collections': {
        if (!permissions.can_create_collections) return deny(corsHeaders)
        const { collection_ids } = body
        if (!Array.isArray(collection_ids) || collection_ids.length === 0) {
          return json({ error: 'collection_ids must be a non-empty array' }, corsHeaders, 400)
        }
        // Verify all collections belong to this user
        const { data: userCollections } = await supabase
          .from('collections')
          .select('id')
          .eq('user_id', userId)
          .in('id', collection_ids)
        const validIds = new Set((userCollections ?? []).map((c: { id: string }) => c.id))
        const invalidIds = collection_ids.filter((id: string) => !validIds.has(id))
        if (invalidIds.length > 0) {
          return json({ error: 'Some collection_ids not found or not owned by you', invalid: invalidIds }, corsHeaders, 404)
        }
        // Update positions in order
        const updates = collection_ids.map((id: string, index: number) =>
          supabase.from('collections').update({ position: index }).eq('id', id).eq('user_id', userId)
        )
        await Promise.all(updates)
        return json({ success: true, reordered: collection_ids.length }, corsHeaders)
      }

      // ── Workspace management actions (master keys with can_manage_workspaces only) ──

      case 'list_workspaces': {
        // Any key type can list workspaces (read-only)
        if (!permissions.can_read_pages) return deny(corsHeaders)
        let query = supabase.from('workspaces').select('id, name, created_at').eq('user_id', userId).is('deleted_at', null)
        if (keyType === 'workspace' && keyWorkspaceIds && keyWorkspaceIds.length > 0) {
          query = query.in('id', keyWorkspaceIds)
        }
        const { data } = await query.order('created_at')
        return json({ workspaces: data }, corsHeaders)
      }

      case 'create_workspace': {
        if (!canManageWorkspaces) return json({ error: 'This key does not have permission to manage workspaces. Enable \'can_manage_workspaces\' on a master key.' }, corsHeaders, 403)
        const { name } = body
        if (!name) return json({ error: 'name is required' }, corsHeaders, 400)
        const { data, error } = await supabase.from('workspaces').insert({ user_id: userId, name }).select().single()
        if (error) return json({ error: error.message }, corsHeaders, 400)
        return json({ workspace: data }, corsHeaders)
      }

      case 'rename_workspace': {
        if (!canManageWorkspaces) return json({ error: 'This key does not have permission to manage workspaces. Enable \'can_manage_workspaces\' on a master key.' }, corsHeaders, 403)
        const { workspace_id: rn_ws_id, workspace_name: rn_ws_name, name: new_ws_name } = body
        if (!rn_ws_id && !rn_ws_name) return json({ error: 'workspace_id or workspace_name is required' }, corsHeaders, 400)
        if (!new_ws_name) return json({ error: 'name is required' }, corsHeaders, 400)
        const resolvedRn = await resolveWorkspaceId(rn_ws_id, rn_ws_name)
        if (resolvedRn instanceof Response) return resolvedRn
        const { data, error } = await supabase.from('workspaces').update({ name: new_ws_name }).eq('id', resolvedRn).select().single()
        if (error) return json({ error: error.message }, corsHeaders, 400)
        return json({ workspace: data }, corsHeaders)
      }

      case 'delete_workspace': {
        if (!canManageWorkspaces) return json({ error: 'This key does not have permission to manage workspaces. Enable \'can_manage_workspaces\' on a master key.' }, corsHeaders, 403)
        const { workspace_id: del_ws_id, workspace_name: del_ws_name } = body
        if (!del_ws_id && !del_ws_name) return json({ error: 'workspace_id or workspace_name is required' }, corsHeaders, 400)
        const resolvedDel = await resolveWorkspaceId(del_ws_id, del_ws_name)
        if (resolvedDel instanceof Response) return resolvedDel
        const { error } = await supabase.from('workspaces').delete().eq('id', resolvedDel)
        if (error) return json({ error: error.message }, corsHeaders, 400)
        return json({ success: true }, corsHeaders)
      }

      case 'move_collection': {
        // Move a collection to a different workspace
        if (!canManageWorkspaces) return json({ error: 'This key does not have permission to manage workspaces. Enable \'can_manage_workspaces\' on a master key.' }, corsHeaders, 403)
        const { collection_id, workspace_id: mv_ws_id, workspace_name: mv_ws_name } = body
        if (!collection_id) return json({ error: 'collection_id is required' }, corsHeaders, 400)
        if (!mv_ws_id && !mv_ws_name) return json({ error: 'workspace_id or workspace_name is required' }, corsHeaders, 400)
        const { data: col } = await supabase.from('collections').select('id').eq('id', collection_id).eq('user_id', userId).single()
        if (!col) return json({ error: 'Collection not found' }, corsHeaders, 404)
        const resolvedMove = await resolveWorkspaceId(mv_ws_id, mv_ws_name)
        if (resolvedMove instanceof Response) return resolvedMove
        const { data: ws } = await supabase.from('workspaces').select('id').eq('id', resolvedMove).eq('user_id', userId).is('deleted_at', null).single()
        if (!ws) return json({ error: 'Target workspace not found' }, corsHeaders, 404)
        const { error } = await supabase.from('collections').update({ workspace_id: resolvedMove }).eq('id', collection_id)
        if (error) return json({ error: error.message }, corsHeaders, 400)
        return json({ success: true }, corsHeaders)
      }

      // share_page: control sharing for a page on behalf of the user.
      // Can enable/disable sharing, set mode (public/private), and manage the email invite list.
      // All fields are optional — only the ones you pass are changed.
      case 'share_page': {
        if (!permissions.can_create_pages) return deny(corsHeaders)
        const { page_id, enabled, mode, add_emails, remove_emails } = body
        if (!page_id) return json({ error: 'page_id is required' }, corsHeaders, 400)

        // Verify ownership
        const { data: pg } = await supabase
          .from('pages')
          .select('id, share_enabled, share_mode, share_token, shared_with_emails')
          .eq('id', page_id)
          .eq('user_id', userId)
          .single()
        if (!pg) return json({ error: 'Page not found' }, corsHeaders, 404)

        // Validate mode if provided
        if (mode !== undefined && mode !== 'public' && mode !== 'private') {
          return json({ error: 'mode must be "public" or "private"' }, corsHeaders, 400)
        }

        // Build update payload
        const updates: Record<string, any> = {}

        // Generate a share token if enabling and one doesn't exist yet
        let shareToken = pg.share_token
        if (enabled === true && !shareToken) {
          shareToken = crypto.randomUUID()
          updates.share_token = shareToken
        }
        if (enabled !== undefined) updates.share_enabled = enabled

        if (mode !== undefined) updates.share_mode = mode

        // Handle email list modifications
        let emails: string[] = [...(pg.shared_with_emails ?? [])]
        if (Array.isArray(add_emails)) {
          for (const email of add_emails) {
            const clean = email.trim().toLowerCase()
            if (clean && !emails.includes(clean)) emails.push(clean)
          }
        }
        if (Array.isArray(remove_emails)) {
          const toRemove = remove_emails.map((e: string) => e.trim().toLowerCase())
          emails = emails.filter(e => !toRemove.includes(e))
        }
        if (Array.isArray(add_emails) || Array.isArray(remove_emails)) {
          updates.shared_with_emails = emails
        }

        if (Object.keys(updates).length === 0) {
          // Nothing to update — just return current state
          const shareUrl = pg.share_token ? `${APP_URL}/share/${pg.share_token}` : null
          return json({
            success: true,
            share_enabled: pg.share_enabled,
            share_mode: pg.share_mode,
            share_token: pg.share_token,
            shared_with_emails: pg.shared_with_emails,
            share_url: shareUrl,
          }, corsHeaders)
        }

        const { error } = await supabase.from('pages').update(updates).eq('id', page_id)
        if (error) return json({ error: error.message }, corsHeaders, 400)

        const finalToken = shareToken ?? pg.share_token
        const shareUrl = finalToken ? `${APP_URL}/share/${finalToken}` : null

        return json({
          success: true,
          share_enabled: enabled !== undefined ? enabled : pg.share_enabled,
          share_mode: mode !== undefined ? mode : pg.share_mode,
          share_token: finalToken,
          shared_with_emails: emails,
          share_url: shareUrl,
        }, corsHeaders)
      }

      default:
        return json({ error: `Unknown action: ${action}`, available_actions: [
          'list_collections', 'create_collection', 'delete_collection', 'rename_collection', 'reorder_collections',
          'list_pages', 'create_page', 'delete_page', 'rename_page', 'move_page', 'get_page',
          'append_blocks', 'insert_blocks', 'update_block', 'replace_blocks', 'update_blocks (alias for append_blocks)', 'delete_block', 'delete_group',
          'share_page',
          'list_workspaces', 'create_workspace (master + can_manage_workspaces)', 'rename_workspace (master + can_manage_workspaces)', 'delete_workspace (master + can_manage_workspaces)', 'move_collection (master + can_manage_workspaces)',
        ]}, corsHeaders, 400)
    }
  } catch (err) {
    console.error('[api] unhandled error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function hashKeyServer(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function json(data: unknown, headers: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...headers, 'Content-Type': 'application/json' },
  })
}

function deny(headers: Record<string, string>) {
  return json({ error: 'Permission denied for this API key' }, headers, 403)
}
