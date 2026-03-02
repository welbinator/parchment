import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, PackageOpen } from 'lucide-react';

interface MigrationModalProps {
  onComplete: () => void;
}

export default function MigrationModal({ onComplete }: MigrationModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const handleMigrate = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/migrate-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ dry_run: false }),
        }
      );

      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error || 'Migration failed');
      onComplete();
    } catch (err: any) {
      setError(err.message);
      setFailed(true);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-xl border border-border bg-card p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
            <PackageOpen className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">We've moved!</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Parchment has a new home. We found your existing data from the old app —
              click below to migrate it to your account.
            </p>
          </div>

          {error && (
            <div className="w-full rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-left">
              <p className="text-sm text-destructive font-medium mb-1">Migration failed</p>
              <p className="text-xs text-muted-foreground mb-2">{error}</p>
              <p className="text-xs text-muted-foreground">
                Please reach out to James on Twitter:{' '}
                <a
                  href="https://twitter.com/jameswelbes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:opacity-80"
                >
                  @jameswelbes
                </a>
                {' '}and he'll get your data sorted out manually.
              </p>
            </div>
          )}

          {!failed ? (
            <button
              onClick={handleMigrate}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Migrating your data...</>
              ) : (
                'Migrate My Data →'
              )}
            </button>
          ) : (
            <a
              href="https://twitter.com/jameswelbes"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
            >
              Contact @jameswelbes on Twitter →
            </a>
          )}

          <button
            onClick={onComplete}
            disabled={loading}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
