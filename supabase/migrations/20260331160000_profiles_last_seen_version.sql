-- Add last_seen_version to profiles so we know which changelog version a user has seen
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_version text DEFAULT NULL;
