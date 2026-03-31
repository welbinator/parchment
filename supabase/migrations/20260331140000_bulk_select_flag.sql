-- Add bulk-select feature flag (off by default, admin-gated)
INSERT INTO public.feature_flags (flag, description, globally_enabled, enabled_for)
VALUES (
  'bulk-select',
  'Multi-select blocks for bulk deletion. Checkbox appears on hover; clicking enters selection mode. Floating action bar shows count + Delete.',
  false,
  '{}'
)
ON CONFLICT (flag) DO NOTHING;
