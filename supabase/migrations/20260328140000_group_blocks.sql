-- Add group_id column to blocks table for group block support
-- group_id points to the parent group block's id (null for top-level blocks)
ALTER TABLE public.blocks ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.blocks(id) ON DELETE CASCADE;

-- Index for efficient child block lookups
CREATE INDEX IF NOT EXISTS idx_blocks_group_id ON public.blocks(group_id);
