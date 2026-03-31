-- Add select-all feature flag (off by default)
INSERT INTO public.feature_flags (flag, description, globally_enabled, enabled_for)
VALUES (
  'select-all',
  'Ctrl+A (or Cmd+A) selects all blocks on the current page, entering selection mode automatically.',
  false,
  '{}'
)
ON CONFLICT (flag) DO NOTHING;
