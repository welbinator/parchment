-- Add is_admin flag to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Only service role can set is_admin (users can't promote themselves)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Grant read access to authenticated users (they can read their own profile)
-- is_admin will be visible to the user but not settable by them via normal RLS
CREATE POLICY IF NOT EXISTS "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Set James as admin
UPDATE public.profiles SET is_admin = true WHERE email = 'james.welbes@gmail.com';
