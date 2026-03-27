import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const flagCache: Record<string, boolean> = {};

export function useFeatureFlag(flag: string): boolean {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState<boolean>(flagCache[flag] ?? false);

  useEffect(() => {
    if (!user) return;

    supabase
      .from('feature_flags')
      .select('globally_enabled, enabled_for')
      .eq('flag', flag)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          flagCache[flag] = false;
          setEnabled(false);
          return;
        }
        const hasAccess =
          data.globally_enabled ||
          (Array.isArray(data.enabled_for) && data.enabled_for.includes(user.id));
        flagCache[flag] = hasAccess;
        setEnabled(hasAccess);
      });
  }, [flag, user]);

  return enabled;
}
