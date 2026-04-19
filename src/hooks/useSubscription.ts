import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type Plan = 'free' | 'pro';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

export interface Subscription {
  plan: Plan;
  status: SubscriptionStatus;
  isPro: boolean;
  isLoading: boolean;
  currentPeriodEnd: string | null;
}

// skipcq: JS-0067
export function useSubscription(): Subscription {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan>('free');
  const [status, setStatus] = useState<SubscriptionStatus>('active');
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    // skipcq: JS-0045
    let cancelled = false;
    supabase
      .from('subscriptions')
      .select('plan, status, current_period_end')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          setPlan(data.plan as Plan);
          setStatus(data.status as SubscriptionStatus);
          setCurrentPeriodEnd(data.current_period_end ?? null);
        }
        setIsLoading(false);
      });
    return () => { cancelled = true; }; // skipcq: JS-0045
  }, [user?.id]);

  return { plan, status, isPro: plan === 'pro' && status === 'active', isLoading, currentPeriodEnd };
}
