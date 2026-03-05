-- Auto-delete trashed items after 30 days
-- Uses pg_cron to run a daily cleanup job

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;

-- Create the cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_old_trash()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Permanently delete pages trashed more than 30 days ago
  DELETE FROM public.pages
  WHERE deleted_at IS NOT NULL
    AND deleted_at < now() - interval '30 days';

  -- Permanently delete collections trashed more than 30 days ago
  DELETE FROM public.collections
  WHERE deleted_at IS NOT NULL
    AND deleted_at < now() - interval '30 days';
END;
$$;

-- Schedule the cleanup to run daily at 3:00 AM UTC
SELECT cron.schedule(
  'cleanup-old-trash',
  '0 3 * * *',
  'SELECT public.cleanup_old_trash()'
);
