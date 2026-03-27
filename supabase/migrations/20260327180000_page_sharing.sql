-- Add sharing fields to pages table
ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS share_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_mode TEXT NOT NULL DEFAULT 'public' CHECK (share_mode IN ('public', 'private')),
  ADD COLUMN IF NOT EXISTS share_token UUID UNIQUE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS shared_with_emails TEXT[] NOT NULL DEFAULT '{}';

-- Public read policy: anyone can read a page that has sharing enabled and is public
CREATE POLICY "Public can read shared pages"
  ON public.pages
  FOR SELECT
  USING (share_enabled = true AND share_mode = 'public');

-- Private read policy: logged-in users whose email is in the shared_with_emails list
CREATE POLICY "Invited users can read private shared pages"
  ON public.pages
  FOR SELECT
  USING (
    share_enabled = true
    AND share_mode = 'private'
    AND (auth.jwt() ->> 'email') = ANY(shared_with_emails)
  );

-- Allow public/invited read of blocks for shared pages
CREATE POLICY "Public can read blocks of shared pages"
  ON public.blocks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pages
      WHERE pages.id = blocks.page_id
        AND pages.share_enabled = true
        AND pages.share_mode = 'public'
    )
  );

CREATE POLICY "Invited users can read blocks of private shared pages"
  ON public.blocks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pages
      WHERE pages.id = blocks.page_id
        AND pages.share_enabled = true
        AND pages.share_mode = 'private'
        AND (auth.jwt() ->> 'email') = ANY(pages.shared_with_emails)
    )
  );
