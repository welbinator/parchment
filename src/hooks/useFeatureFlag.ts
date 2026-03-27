import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useFeatureFlag(flag: string): boolean {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState<boolean>(false);

  useEffect(() => {
    if (!user) {
      setEnabled(false);
      return;
    }

    let cancelled = false;

    supabase
      .from('feature_flags')
      .select('globally_enabled, enabled_for')
      .eq('flag', flag)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (!data) { setEnabled(false); return; }
        const hasAccess =
          data.globally_enabled ||
          (Array.isArray(data.enabled_for) && data.enabled_for.includes(user.id));
        setEnabled(hasAccess);
      });

    return () => { cancelled = true; };
  }, [flag, user?.id]);

  return enabled;
}
