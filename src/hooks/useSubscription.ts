import { useEffect, useState, useCallback } from 'react';
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
  refetch: () => Promise<void>;
}

// skipcq: JS-0067
export function useSubscription(): Subscription {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan>('free');
  const [status, setStatus] = useState<SubscriptionStatus>('active');
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSub = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    const { data } = await supabase
      .from('subscriptions')
      .select('plan, status, current_period_end')
      .eq('user_id', user.id)
      .single();
    if (data) {
      setPlan(data.plan as Plan);
      setStatus(data.status as SubscriptionStatus);
      setCurrentPeriodEnd(data.current_period_end ?? null);
    }
    setIsLoading(false);
  }, [user?.id]); // skipcq: JS-0045

  useEffect(() => {
    fetchSub(); // skipcq: JS-0045
  }, [fetchSub]);

  return { plan, status, isPro: plan === 'pro' && status === 'active', isLoading, currentPeriodEnd, refetch: fetchSub };
}
