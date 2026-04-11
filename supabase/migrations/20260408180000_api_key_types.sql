-- Migration: API key types (master / workspace) + can_manage_workspaces
-- Existing keys are promoted to 'master' with workspace management disabled.

-- 1. Add new columns (safe to re-run — IF NOT EXISTS)
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS key_type text NOT NULL DEFAULT 'master' -- NOSONAR
    CHECK (key_type IN ('master', 'workspace')), -- NOSONAR
  ADD COLUMN IF NOT EXISTS workspace_ids uuid[] NULL,
  ADD COLUMN IF NOT EXISTS can_manage_workspaces boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_create_workspaces boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_delete_workspaces boolean NOT NULL DEFAULT false;

-- 2. Migrate any rows that still have the old 'standard' default (shouldn't exist yet, but be safe)
UPDATE public.api_keys SET key_type = 'master' WHERE key_type NOT IN ('master', 'workspace'); -- NOSONAR

-- 3. Update the validate_api_key function to return new fields
CREATE OR REPLACE FUNCTION public.validate_api_key(p_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_record api_keys%ROWTYPE;
  v_hash text;
BEGIN
  v_hash := encode(extensions.digest(p_key::bytea, 'sha256'), 'hex');

  SELECT * INTO v_record
  FROM api_keys
  WHERE key_hash = v_hash
    AND revoked = false
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  UPDATE api_keys SET last_used_at = now() WHERE id = v_record.id;

  RETURN jsonb_build_object(
    'valid', true,
    'user_id', v_record.user_id,
    'key_type', v_record.key_type,
    'workspace_ids', COALESCE(to_jsonb(v_record.workspace_ids), 'null'::jsonb),
    'can_manage_workspaces', v_record.can_manage_workspaces,
    -- Both master and workspace keys respect their stored permission booleans.
    -- Master keys have access to all workspaces; workspace keys are scoped by workspace_ids.
    'can_create_collections', v_record.can_create_collections,
    'can_delete_collections', v_record.can_delete_collections,
    'can_create_pages',       v_record.can_create_pages,
    'can_delete_pages',       v_record.can_delete_pages,
    'can_read_pages',         v_record.can_read_pages,
    'can_write_blocks',       v_record.can_write_blocks
  );
END;
$$;

-- Notify PostgREST to pick up schema changes
NOTIFY pgrst, 'reload schema';
