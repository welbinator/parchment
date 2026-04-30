-- Add validate_api_key_hash function that accepts a pre-computed hash.
-- The edge function now computes the HMAC in Deno (where the secret is available
-- as an env var) and passes the hash to the DB. This avoids needing vault entirely.

CREATE OR REPLACE FUNCTION public.validate_api_key_hash(p_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_record api_keys%ROWTYPE;
  v_rate jsonb;
BEGIN
  SELECT * INTO v_record
  FROM api_keys
  WHERE key_hash = p_hash
    AND revoked = false
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

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
    'can_create_pages', v_record.can_create_pages,
    'can_delete_pages', v_record.can_delete_pages,
    'can_read_pages', v_record.can_read_pages,
    'can_write_blocks', v_record.can_write_blocks
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_api_key_hash TO authenticated, anon;
NOTIFY pgrst, 'reload schema';
