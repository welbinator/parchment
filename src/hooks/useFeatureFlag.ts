import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useFeatureFlag(flag: string): boolean;
export function useFeatureFlag(flag: string, withLoading: true): { enabled: boolean; loading: boolean };
export function useFeatureFlag(flag: string, withLoading?: true): boolean | { enabled: boolean; loading: boolean } {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user) {
      setEnabled(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    supabase
      .from('feature_flags')
      .select('globally_enabled, enabled_for')
      .eq('flag', flag)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (!data) { setEnabled(false); setLoading(false); return; }
        const hasAccess =
          data.globally_enabled ||
          (Array.isArray(data.enabled_for) && data.enabled_for.includes(user.id));
        setEnabled(hasAccess);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [flag, user?.id]);

  if (withLoading) return { enabled, loading };
  return enabled;
}
