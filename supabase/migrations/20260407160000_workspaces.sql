-- ── Workspaces ────────────────────────────────────────────────────────────────
-- Creates the workspaces table, adds workspace_id to collections,
-- seeds existing users with a "Personal" workspace and assigns all
-- their existing collections to it, then creates an empty "Work" workspace.

-- 1. Create workspaces table
CREATE TABLE IF NOT EXISTS public.workspaces (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  position    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own workspaces"
  ON public.workspaces
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Add workspace_id to collections (nullable first, we'll backfill then constrain)
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- 3. Seed existing users: create "Personal" workspace, assign all their collections,
--    then create empty "Work" workspace.
DO $$
DECLARE
  rec RECORD;
  personal_id uuid;
BEGIN
  FOR rec IN
    SELECT DISTINCT user_id FROM public.collections WHERE deleted_at IS NULL
    UNION
    SELECT id FROM auth.users WHERE id NOT IN (SELECT DISTINCT user_id FROM public.collections WHERE deleted_at IS NULL)
  LOOP
    -- Create Personal workspace
    INSERT INTO public.workspaces (id, user_id, name, position)
    VALUES (gen_random_uuid(), rec.user_id, 'Personal', 0)
    RETURNING id INTO personal_id;

    -- Assign all existing collections to Personal
    UPDATE public.collections
    SET workspace_id = personal_id
    WHERE user_id = rec.user_id;

    -- Create Work workspace (empty)
    INSERT INTO public.workspaces (id, user_id, name, position)
    VALUES (gen_random_uuid(), rec.user_id, 'Work', 1);
  END LOOP;
END;
$$;

-- 4. Now enforce NOT NULL on workspace_id
ALTER TABLE public.collections
  ALTER COLUMN workspace_id SET NOT NULL;

-- 5. Index for fast workspace-scoped queries
CREATE INDEX IF NOT EXISTS idx_collections_workspace_id ON public.collections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON public.workspaces(user_id);
