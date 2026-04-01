import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
const VALID_BLOCK_TYPES = new Set(['text', 'heading1', 'heading2', 'heading3', 'bullet_list', 'numbered_list', 'todo', 'quote', 'divider', 'code', 'group'])

// Convert styled text JSON arrays to HTML
// Bots sometimes send [{"text":"hello","bold":true}] instead of "<b>hello</b>"
function convertStyledJsonToHtml(content: string): string {
  if (!content || !content.trim().startsWith('[')) return content
  try {
    const parsed = JSON.parse(content)
    if (!Array.isArray(parsed)) return content
    return parsed.map((item: any) => {
      if (typeof item === 'string') return item
      if (typeof item !== 'object' || !item.text) return ''
      let html = item.text as string
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

    // Validate key
    const { data: validation, error: valError } = await supabase.rpc('validate_api_key', { p_key: apiKey })
    if (valError || !validation?.valid) {
      return new Response(JSON.stringify({ error: 'Invalid or expired API key' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Rate limiting — look up key ID from hash
    const keyHash = await hashKeyServer(apiKey)
    const { data: keyRecord } = await supabase
      .from('api_keys')
      .select('id')
      .eq('key_hash', keyHash)
      .eq('revoked', false)
      .single()

    if (keyRecord) {
      const { data: rateLimitResult } = await supabase.rpc('check_and_increment_rate_limit', {
        p_api_key_id: keyRecord.id,
      })

      if (rateLimitResult && !rateLimitResult.allowed) {
        return new Response(JSON.stringify({
          error: rateLimitResult.reason,
          retry_after: rateLimitResult.retry_after,
          daily_count: rateLimitResult.daily_count,
          minute_count: rateLimitResult.minute_count,
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': rateLimitResult.retry_after === 'tomorrow' ? '86400' : '60' },
        })
      }
    }

    const userId = validation.user_id
    const permissions = {
      can_create_collections: validation.can_create_collections,
      can_delete_collections: validation.can_delete_collections,
      can_create_pages: validation.can_create_pages,
      can_delete_pages: validation.can_delete_pages,
      can_read_pages: validation.can_read_pages,
      can_write_blocks: validation.can_write_blocks,
    }

    const body = await req.json()
    const { action } = body

    // Route actions
    switch (action) {
      case 'list_collections': {
        if (!permissions.can_read_pages) return deny(corsHeaders)
        const { data } = await supabase.from('collections').select('id, name, icon, position, created_at').eq('user_id', userId).order('position')
        return json({ collections: data }, corsHeaders)
      }

      case 'create_collection': {
        if (!permissions.can_create_collections) return deny(corsHeaders)
        const { name } = body
        const { data: existing } = await supabase.from('collections').select('position').eq('user_id', userId).order('position', { ascending: false }).limit(1)
        const position = (existing?.[0]?.position ?? -1) + 1
        const { data, error } = await supabase.from('collections').insert({ user_id: userId, name: name || 'Untitled', position }).select().single()
        if (error) return json({ error: error.message }, corsHeaders, 400)
        return json({ collection: data }, corsHeaders)
      }

      case 'delete_collection': {
        if (!permissions.can_delete_collections) return deny(corsHeaders)
        const { collection_id } = body
        const { data: col } = await supabase.from('collections').select('id').eq('id', collection_id).eq('user_id', userId).single()
        if (!col) return json({ error: 'Collection not found' }, corsHeaders, 404)
        const { error } = await supabase.from('collections').delete().eq('id', collection_id)
        if (error) return json({ error: error.message }, corsHeaders, 400)
        return json({ success: true }, corsHeaders)
      }

      case 'list_pages': {
        if (!permissions.can_read_pages) return deny(corsHeaders)
        const { collection_id } = body
        let query = supabase.from('pages').select('id, title, type, collection_id, created_at, updated_at').eq('user_id', userId)
        if (collection_id) query = query.eq('collection_id', collection_id)
        const { data } = await query.order('created_at')
        return json({ pages: data }, corsHeaders)
      }

      case 'create_page': {
        if (!permissions.can_create_pages) return deny(corsHeaders)
        const { collection_id, title, type } = body
        const { data: col } = await supabase.from('collections').select('id').eq('id', collection_id).eq('user_id', userId).single()
        if (!col) return json({ error: 'Collection not found' }, corsHeaders, 404)
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

        const insertedBlocks: any[] = []
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

        // Delete all existing blocks on the page
        await supabase.from('blocks').delete().eq('page_id', page_id)

        // Insert new blocks with sequential positions based on array order
        const insertedBlocks: any[] = []
        for (let i = 0; i < blocks.length; i++) {
          const block = blocks[i]
          const content = convertStyledJsonToHtml(block.content || '')
          const { data: inserted } = await supabase.from('blocks').insert({
            page_id,
            type: block.type || 'text',
            content,
            checked: block.checked ?? null,
            indent_level: block.indent_level ?? 0,
            position: i,
            group_id: block.group_id || null,
          }).select().single()
          if (inserted) insertedBlocks.push(inserted)
        }
        return json({ success: true, mode: 'replace', blocks_written: insertedBlocks.length, blocks: insertedBlocks }, corsHeaders)
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
        const { data: pg } = await supabase.from('pages').select('id').eq('id', page_id).eq('user_id', userId).single()
        if (!pg) return json({ error: 'Page not found' }, corsHeaders, 404)
        const { error } = await supabase.from('pages').update({ title }).eq('id', page_id)
        if (error) return json({ error: error.message }, corsHeaders, 400)
        return json({ success: true }, corsHeaders)
      }

      case 'rename_collection': {
        if (!permissions.can_create_collections) return deny(corsHeaders)
        const { collection_id, name } = body
        if (!collection_id || !name) return json({ error: 'collection_id and name are required' }, corsHeaders, 400)
        const { data: col } = await supabase.from('collections').select('id').eq('id', collection_id).eq('user_id', userId).single()
        if (!col) return json({ error: 'Collection not found' }, corsHeaders, 404)
        const { error } = await supabase.from('collections').update({ name }).eq('id', collection_id)
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
          const shareUrl = pg.share_token ? `https://theparchment.app/share/${pg.share_token}` : null
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
        const shareUrl = finalToken ? `https://theparchment.app/share/${finalToken}` : null

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
          'list_collections', 'create_collection', 'delete_collection', 'rename_collection',
          'list_pages', 'create_page', 'delete_page', 'rename_page', 'get_page',
          'append_blocks', 'replace_blocks', 'update_blocks (alias for append_blocks)', 'delete_block', 'delete_group',
          'share_page',
        ]}, corsHeaders, 400)
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function hashKeyServer(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function json(data: any, headers: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...headers, 'Content-Type': 'application/json' },
  })
}

function deny(headers: Record<string, string>) {
  return json({ error: 'Permission denied for this API key' }, headers, 403)
}
