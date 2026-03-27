-- Feature flags table
-- Each row is one flag. enabled_for is an array of auth.users UUIDs that can see it.
-- If enabled_for is NULL, the flag is OFF for everyone.
-- If enabled_for is an empty array '{}', the flag is still off (no one in the list).
-- To enable for everyone: set enabled_for = NULL and globally_enabled = true.

CREATE TABLE public.feature_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flag TEXT NOT NULL UNIQUE,
  description TEXT,
  globally_enabled BOOLEAN NOT NULL DEFAULT false,
  enabled_for UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Admin user ID (james.welbes@gmail.com)
-- Only the admin can read/write flags
CREATE POLICY "Admin can manage feature flags"
  ON public.feature_flags
  FOR ALL
  USING (auth.uid() = '650a700b-80be-4271-96b3-c07fcf405543'::uuid)
  WITH CHECK (auth.uid() = '650a700b-80be-4271-96b3-c07fcf405543'::uuid);

-- All authenticated users can read flags that apply to them
CREATE POLICY "Users can read their own flags"
  ON public.feature_flags
  FOR SELECT
  USING (
    globally_enabled = true
    OR auth.uid() = ANY(enabled_for)
    OR auth.uid() = '650a700b-80be-4271-96b3-c07fcf405543'::uuid
  );

CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
