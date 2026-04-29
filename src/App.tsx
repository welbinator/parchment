import { useEffect, useState, useCallback, useRef } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import Privacy from './pages/Privacy';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/store/useAppStore';
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import AuthPage from "./pages/Auth";
import Logout from "./pages/Logout";
import Settings from "./pages/Settings";
import ApiDocs from "./pages/ApiDocs";
import Changelog from "./pages/Changelog";
import Docs from "./pages/Docs";
import Reports from "./pages/Reports";
import Trash from "./pages/Trash";
import NotFound from "./pages/NotFound";
import SharedPageView from "./pages/SharedPageView";
import Features from "./pages/Features";
import { PWAInstallProvider } from "./components/PWAInstallPrompt";
import FeedbackWidget from "./components/FeedbackWidget";
import { useViewStore } from '@/store/useViewStore';
import { Loader2 } from 'lucide-react';
import MigrationModal from '@/components/MigrationModal';
import WhatsNewModal from '@/components/WhatsNewModal';
import { supabase } from '@/integrations/supabase/client';

const queryClient = new QueryClient();

// skipcq: JS-0067, JS-R1005
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { init, loading: storeLoading, reset, refetch, setupRealtime } = useAppStore();
  const [showMigration, setShowMigration] = useState(false);
  const [storeTimeout, setStoreTimeout] = useState(false);
  const navigate = useNavigate();
  const initCalledRef = useRef(false);
  const newUserRedirectCalledRef = useRef(false);

  // After store finishes loading, check if this is a new user and redirect to settings
  useEffect(() => {
    if (!storeLoading && user && !newUserRedirectCalledRef.current) {
      const isNewUser = localStorage.getItem('parchment_new_user');
      if (isNewUser) {
        newUserRedirectCalledRef.current = true;
        localStorage.removeItem('parchment_new_user');
        setTimeout(() => navigate('/settings?new=true'), 100);
      }
    }
  }, [storeLoading, user]);

  // skipcq: JS-R1005
  useEffect(() => {
    if (user) {
      // Don't init for unconfirmed email users — they need to verify first
      if (!user.email_confirmed_at && user.app_metadata?.provider === 'email') {
        return;
      }
      // Only call init once per login session — guards against double-fire from
      // onAuthStateChange + getSession() both updating user state
      if (!initCalledRef.current) {
        initCalledRef.current = true;
        checkMigrationThenInit();
      }
    } else if (!authLoading) {
      // User signed out — reset flag so next login works
      initCalledRef.current = false;
      reset();
    }
  }, [user, authLoading]);

  // Check for migration BEFORE calling init — prevents welcome data being seeded
  // for existing users whose data lives under a different UUID (pre-migration).
  const checkMigrationThenInit = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        init(user!.id);
        return;
      }
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/migrate-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ dry_run: true }),
          signal: AbortSignal.timeout(8000),
        }
      );
      const result = await response.json();
      if (result.needs_migration) {
        // Don't call init yet — user has no data under new UUID.
        // Show migration modal; init will be called after migration completes.
        setShowMigration(true);
      } else {
        init(user!.id);
      }
    } catch (e) {
      // On error, proceed normally
      init(user!.id);
    }
  }, [user, init]);

  // Refetch on tab focus / visibility change
  useEffect(() => {
    if (!user) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', () => refetch());

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', refetch);
    };
  }, [user, refetch]);

  // Setup realtime subscriptions
  useEffect(() => {
    if (!user) return;
    const cleanup = setupRealtime();
    return cleanup;
  }, [user, setupRealtime]);

  // If auth resolved but store is still loading after 15s, show a reload prompt.
  useEffect(() => {
    if (!user || !storeLoading) { setStoreTimeout(false); return; }
    const timer = setTimeout(() => { setStoreTimeout(true); }, 30000);
    return () => { clearTimeout(timer); }; // skipcq: JS-0045
  }, [user, storeLoading]);

  const handleEscapeLoop = useCallback(async () => {
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    localStorage.clear();
    sessionStorage.clear();
    globalThis.location.replace('/');
  }, []);

  const onEscapeLoop = useCallback(() => { handleEscapeLoop().catch(() => { globalThis.location.replace('/'); }); }, [handleEscapeLoop]);

  if (storeTimeout) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="text-center max-w-sm">
          <p className="text-foreground font-medium mb-3">Taking longer than expected&hellip;</p>
          <p className="text-muted-foreground text-sm mb-6">There may be a connection issue.</p>
          <div className="flex flex-col gap-3 items-center">
            <button
              onClick={() => { globalThis.location.reload(); }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Reload
            </button>
            <button
              onClick={onEscapeLoop}
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
            >
              Sign out and start over
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (authLoading || (user && storeLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <Loader2 size={24} className="animate-spin text-primary" />
          <button
            onClick={onEscapeLoop}
            className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors underline underline-offset-4"
          >
            Stuck? Sign out and start over
          </button>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  // Unconfirmed email user — send back to auth page to show verification screen
  if (user.app_metadata?.provider === 'email' && !user.email_confirmed_at) {
    return <Navigate to="/auth" replace />;
  }
  return (
    <PWAInstallProvider>
      {showMigration && (
        <MigrationModal onComplete={() => { setShowMigration(false); init(user.id); }} />
      )}
      <WhatsNewModal />
      {children}
    </PWAInstallProvider>
  );
}

function AuthRoute() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/app';
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }
  if (user) return <Navigate to={redirect} replace />;
  return <AuthPage />;
}

function LandingOrApp() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }
  if (user) return <Navigate to={`/app${window.location.search}`} replace />;
  return <Landing />;
}

function FeedbackWidgetPositioned() {
  const { viewMode } = useViewStore();
  // In board view, shift left of the FAB (right-6 = 24px, w-14 = 56px, gap ~12px → right-24)
  return <FeedbackWidget className={viewMode === 'kanban' ? 'fixed bottom-6 right-24 z-50' : 'fixed bottom-6 right-6 z-50'} />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <FeedbackWidgetPositioned />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/" element={<LandingOrApp />} />
            <Route path="/app" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/app/trash" element={<ProtectedRoute><Trash /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/docs/api" element={<ApiDocs />} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/changelog" element={<Changelog />} />
            <Route path="/features" element={<Features />} />
            <Route path="/share/:token" element={<SharedPageView />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
