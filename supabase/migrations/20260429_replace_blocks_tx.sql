-- Transactional replace_blocks RPC
-- Deletes all blocks for a page and inserts new ones in a single transaction,
-- preventing data loss if the edge function crashes between delete and insert.
CREATE OR REPLACE FUNCTION public.replace_blocks_tx(
  p_page_id uuid,
  p_blocks jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete all existing blocks for this page
  DELETE FROM public.blocks WHERE page_id = p_page_id;

  -- Insert new blocks
  INSERT INTO public.blocks (page_id, type, content, checked, indent_level, position, group_id)
  SELECT
    p_page_id,
    (b->>'type')::text,
    (b->>'content')::text,
    CASE WHEN b->>'checked' IS NULL THEN NULL ELSE (b->>'checked')::boolean END,
    COALESCE((b->>'indent_level')::int, 0),
    (ROW_NUMBER() OVER () - 1)::int,
    CASE WHEN b->>'group_id' = '' OR b->>'group_id' IS NULL THEN NULL ELSE (b->>'group_id')::uuid END
  FROM jsonb_array_elements(p_blocks) AS b;
END;
$$;

GRANT EXECUTE ON FUNCTION public.replace_blocks_tx TO authenticated;
