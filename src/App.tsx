import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/store/useAppStore';
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import AuthPage from "./pages/Auth";
import Settings from "./pages/Settings";
import ApiDocs from "./pages/ApiDocs";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";
import { Loader2 } from 'lucide-react';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { init, loading: storeLoading, reset } = useAppStore();

  useEffect(() => {
    if (user) {
      init(user.id);
    } else if (!authLoading) {
      reset();
    }
  }, [user, authLoading]);

  if (authLoading || (user && storeLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AuthRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }
  if (user) return <Navigate to="/app" replace />;
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
  if (user) return <Navigate to="/app" replace />;
  return <Landing />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/" element={<LandingOrApp />} />
            <Route path="/app" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/docs/api" element={<ApiDocs />} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
