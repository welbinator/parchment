import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// skipcq: JS-0067
export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    const doLogout = async () => {
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      // Unregister service worker so stale cache can't trap the user again
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) { await reg.unregister(); }
      }
      navigate('/auth', { replace: true });
    };
    doLogout().catch(() => { navigate('/auth', { replace: true }); });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-muted-foreground text-sm">Signing out…</p>
    </div>
  );
}
