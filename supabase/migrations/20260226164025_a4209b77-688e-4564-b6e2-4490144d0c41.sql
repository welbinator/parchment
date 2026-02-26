CREATE OR REPLACE FUNCTION public.validate_api_key(p_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
    'can_create_collections', v_record.can_create_collections,
    'can_delete_collections', v_record.can_delete_collections,
    'can_create_pages', v_record.can_create_pages,
    'can_delete_pages', v_record.can_delete_pages,
    'can_read_pages', v_record.can_read_pages,
    'can_write_blocks', v_record.can_write_blocks
  );
END;
$function$;