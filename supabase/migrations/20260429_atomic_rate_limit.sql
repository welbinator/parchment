-- Merge rate limiting into validate_api_key for atomicity.
-- Previously: validate ran first, then a separate key lookup + rate limit check.
-- Problems: (1) key lookup could fail silently, bypassing rate limit;
--           (2) two DB round-trips instead of one.
-- Fix: single function does validate + rate limit atomically.

CREATE OR REPLACE FUNCTION public.validate_api_key(p_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_record api_keys%ROWTYPE;
  v_hash text;
  v_rate jsonb;
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

  -- Rate limit check (inline — no second round-trip)
  v_rate := public.check_and_increment_rate_limit(v_record.id);

  IF NOT (v_rate->>'allowed')::boolean THEN
    RETURN jsonb_build_object(
      'valid', false,
      'rate_limited', true,
      'reason', v_rate->>'reason',
      'retry_after', v_rate->>'retry_after'
    );
  END IF;

  UPDATE api_keys SET last_used_at = now() WHERE id = v_record.id;

  RETURN jsonb_build_object(
    'valid', true,
    'user_id', v_record.user_id,
    'key_type', v_record.key_type,
    'workspace_ids', COALESCE(to_jsonb(v_record.workspace_ids), 'null'::jsonb),
    'can_manage_workspaces', v_record.can_manage_workspaces,
    'can_create_collections', v_record.can_create_collections,
    'can_delete_collections', v_record.can_delete_collections,
    'can_create_pages',       v_record.can_create_pages,
    'can_delete_pages',       v_record.can_delete_pages,
    'can_read_pages',         v_record.can_read_pages,
    'can_write_blocks',       v_record.can_write_blocks
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
