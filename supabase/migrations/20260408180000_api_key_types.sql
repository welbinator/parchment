-- Migration: API key types (master / workspace) + can_manage_workspaces
-- Existing keys are promoted to 'master' with workspace management disabled.

-- 1. Add new columns (safe to re-run — IF NOT EXISTS)
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS key_type text NOT NULL DEFAULT 'master'
    CHECK (key_type IN ('master', 'workspace')),
  ADD COLUMN IF NOT EXISTS workspace_ids uuid[] NULL,
  ADD COLUMN IF NOT EXISTS can_manage_workspaces boolean NOT NULL DEFAULT false;

-- 2. Migrate any rows that still have the old 'standard' default (shouldn't exist yet, but be safe)
UPDATE public.api_keys SET key_type = 'master' WHERE key_type NOT IN ('master', 'workspace');

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
    -- For master keys all permissions are implicitly true;
    -- for workspace keys respect the stored booleans.
    'can_create_collections', CASE WHEN v_record.key_type = 'master' THEN true ELSE v_record.can_create_collections END,
    'can_delete_collections', CASE WHEN v_record.key_type = 'master' THEN true ELSE v_record.can_delete_collections END,
    'can_create_pages',       CASE WHEN v_record.key_type = 'master' THEN true ELSE v_record.can_create_pages END,
    'can_delete_pages',       CASE WHEN v_record.key_type = 'master' THEN true ELSE v_record.can_delete_pages END,
    'can_read_pages',         CASE WHEN v_record.key_type = 'master' THEN true ELSE v_record.can_read_pages END,
    'can_write_blocks',       CASE WHEN v_record.key_type = 'master' THEN true ELSE v_record.can_write_blocks END
  );
END;
$$;

-- Notify PostgREST to pick up schema changes
NOTIFY pgrst, 'reload schema';
