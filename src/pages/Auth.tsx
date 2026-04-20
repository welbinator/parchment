import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, Loader2, Zap, ArrowLeft } from 'lucide-react';

// skipcq: JS-0067
export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const isProIntent = searchParams.get('checkout') === 'true' || searchParams.get('redirect')?.includes('checkout');
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;

        // Supabase returns a fake-success when the email already exists.
        // Detect this: session is null AND identities is empty.
        if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
          toast.error('An account with that email already exists.', {
            description: 'Switch to Sign In below to access your account.',
            duration: 6000,
          });
          setIsSignUp(false);
          return;
        }

        toast.success('Check your email to confirm your account');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: globalThis.location.origin },
      });
      if (error) throw error;
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-fade-in">

        {/* Back to home */}
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={14} />
            Back to home
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold font-display text-foreground">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {isSignUp ? 'Start writing in 30 seconds. Free forever.' : 'Sign in to your Parchment account.'}
          </p>
          {isProIntent && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
              <Zap size={12} />
              After signup we&apos;ll take you straight to Pro checkout.
            </div>
          )}
        </div>

        {/* Mode toggle — prominent tabs */}
        <div className="flex rounded-lg border border-border bg-muted p-1 mb-6">
          <button
            onClick={() => { setIsSignUp(true); }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isSignUp ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Create account
          </button>
          <button
            onClick={() => { setIsSignUp(false); }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isSignUp ? 'text-muted-foreground hover:text-foreground' : 'bg-background text-foreground shadow-sm'
            }`}
          >
            Sign in
          </button>
        </div>

        {/* Google button */}
        <button
          onClick={handleGoogleAuth}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 border-t border-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 border-t border-border" />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailAuth} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); }}
            required
            className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary transition-colors"
          />
          <input
            type="password"
            placeholder={isSignUp ? 'Choose a password (min 6 characters)' : 'Password'}
            value={password}
            onChange={(e) => { setPassword(e.target.value); }}
            required
            minLength={6}
            className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
            {isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

      </div>
    </div>
  );
}
