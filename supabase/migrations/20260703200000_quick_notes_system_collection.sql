-- ── Quick Notes: system collections ──────────────────────────────────────────
-- Adds is_system flag to collections. System collections cannot be deleted by
-- users. Seeds every existing workspace with a "Quick Notes" system collection.

-- 1. Add the column
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;

-- 2. Seed existing workspaces: create a Quick Notes collection in each workspace
--    that doesn't already have one (idempotent).
DO $$
DECLARE
  rec RECORD;
  next_pos integer;
BEGIN
  FOR rec IN
    SELECT w.id AS workspace_id, w.user_id
    FROM public.workspaces w
    WHERE w.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.collections c
        WHERE c.workspace_id = w.id
          AND c.name = 'Quick Notes'
          AND c.is_system = true
          AND c.deleted_at IS NULL
      )
  LOOP
    SELECT COALESCE(MAX(position), -1) + 1
      INTO next_pos
      FROM public.collections
     WHERE workspace_id = rec.workspace_id AND deleted_at IS NULL;

    INSERT INTO public.collections (id, user_id, name, position, workspace_id, is_system)
    VALUES (
      gen_random_uuid(),
      rec.user_id,
      'Quick Notes',
      next_pos,
      rec.workspace_id,
      true
    );
  END LOOP;
END;
$$;

-- 3. RLS: prevent users from hard-deleting system collections
--    (soft-delete via deleted_at is also blocked in the app layer, but belt-and-suspenders)
CREATE POLICY "No delete on system collections"
  ON public.collections
  FOR DELETE
  USING (is_system = false);

-- 4. Expose to PostgREST
NOTIFY pgrst, 'reload schema';
