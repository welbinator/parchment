-- Add beta_tester column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS beta_tester BOOLEAN NOT NULL DEFAULT false;
