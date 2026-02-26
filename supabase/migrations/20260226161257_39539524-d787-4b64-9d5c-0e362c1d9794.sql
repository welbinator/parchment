
-- API keys table with granular permissions
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Untitled Key',
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  
  -- Granular permissions
  can_create_collections boolean NOT NULL DEFAULT false,
  can_delete_collections boolean NOT NULL DEFAULT false,
  can_create_pages boolean NOT NULL DEFAULT false,
  can_delete_pages boolean NOT NULL DEFAULT false,
  can_read_pages boolean NOT NULL DEFAULT true,
  can_write_blocks boolean NOT NULL DEFAULT false,
  
  -- Optional expiration
  expires_at timestamp with time zone,
  
  -- Metadata
  last_used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  revoked boolean NOT NULL DEFAULT false
);

-- RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own api keys"
  ON public.api_keys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own api keys"
  ON public.api_keys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own api keys"
  ON public.api_keys FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own api keys"
  ON public.api_keys FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Extension for hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to validate API key (used by edge function via service role)
CREATE OR REPLACE FUNCTION public.validate_api_key(p_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record api_keys%ROWTYPE;
  v_hash text;
BEGIN
  v_hash := encode(digest(p_key, 'sha256'), 'hex');
  
  SELECT * INTO v_record
  FROM api_keys
  WHERE key_hash = v_hash
    AND revoked = false
    AND (expires_at IS NULL OR expires_at > now());
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false);
  END IF;
  
  -- Update last_used_at
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
$$;
