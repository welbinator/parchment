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
import Settings from "./pages/Settings";
import ApiDocs from "./pages/ApiDocs";
import Changelog from "./pages/Changelog";
import Docs from "./pages/Docs";
import Reports from "./pages/Reports";
import Trash from "./pages/Trash";
import NotFound from "./pages/NotFound";
import SharedPageView from "./pages/SharedPageView";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import FeedbackWidget from "./components/FeedbackWidget";
import { useViewStore } from '@/store/useViewStore';
import { Loader2 } from 'lucide-react';
import MigrationModal from '@/components/MigrationModal';
import WhatsNewModal from '@/components/WhatsNewModal';
import { supabase } from '@/integrations/supabase/client';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { init, loading: storeLoading, reset, refetch, setupRealtime } = useAppStore();
  const [showMigration, setShowMigration] = useState(false);
  const navigate = useNavigate();
  const initCalledRef = useRef(false);

  // After store finishes loading, check if this is a new user and redirect to settings
  useEffect(() => {
    if (!storeLoading && user) {
      const isNewUser = localStorage.getItem('parchment_new_user');
      if (isNewUser) {
        localStorage.removeItem('parchment_new_user');
        setTimeout(() => navigate('/settings?new=true'), 100);
      }
    }
  }, [storeLoading, user]);

  useEffect(() => {
    if (user) {
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

  if (authLoading || (user && storeLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  return (
    <>
      {showMigration && (
        <MigrationModal onComplete={() => { setShowMigration(false); init(user.id); }} />
      )}
      <WhatsNewModal />
      {children}
    </>
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
        <PWAInstallPrompt />
        <FeedbackWidgetPositioned />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/" element={<LandingOrApp />} />
            <Route path="/app" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/app/trash" element={<ProtectedRoute><Trash /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/docs/api" element={<ApiDocs />} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/changelog" element={<Changelog />} />
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
