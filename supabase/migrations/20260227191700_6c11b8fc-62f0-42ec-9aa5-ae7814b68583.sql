
-- Add soft-delete columns to pages and collections
ALTER TABLE public.pages ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;
ALTER TABLE public.collections ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Create index for efficient filtering
CREATE INDEX idx_pages_deleted_at ON public.pages (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_collections_deleted_at ON public.collections (deleted_at) WHERE deleted_at IS NOT NULL;
