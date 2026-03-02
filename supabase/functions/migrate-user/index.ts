import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json().catch(() => ({}))
    const dryRun = body.dry_run === true

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const newUuid = user.id
    const email = user.email

    // Find orphaned profile matching this email
    const { data: orphanedProfile } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email, display_name')
      .eq('email', email)
      .neq('user_id', newUuid)
      .maybeSingle()

    if (!orphanedProfile) {
      return new Response(JSON.stringify({ migrated: false, needs_migration: false }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // If dry run, just report that migration is needed
    if (dryRun) {
      return new Response(JSON.stringify({ migrated: false, needs_migration: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const oldUuid = orphanedProfile.user_id

    // Reassign all data from old UUID to new UUID
    const { error: collectionsError } = await supabaseAdmin
      .from('collections')
      .update({ user_id: newUuid })
      .eq('user_id', oldUuid)

    if (collectionsError) throw collectionsError

    const { error: pagesError } = await supabaseAdmin
      .from('pages')
      .update({ user_id: newUuid })
      .eq('user_id', oldUuid)

    if (pagesError) throw pagesError

    // Delete the orphaned profile
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', oldUuid)

    return new Response(JSON.stringify({ migrated: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
