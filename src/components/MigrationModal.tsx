import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, PackageOpen, Key, Copy, Check } from 'lucide-react';

interface MigrationModalProps {
  onComplete: () => void;
}

export default function MigrationModal({ onComplete }: MigrationModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [newApiKeys, setNewApiKeys] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

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

      if (result.new_api_keys?.length > 0) {
        setNewApiKeys(result.new_api_keys);
      } else {
        onComplete();
      }
    } catch (err: any) {
      setError(err.message);
      setFailed(true);
      setLoading(false);
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  // Show new API keys screen after successful migration
  if (newApiKeys.length > 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-md mx-4 rounded-xl border border-border bg-card p-8 shadow-2xl">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0">
                <Key className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Your API keys are back!</h2>
                <p className="text-xs text-muted-foreground">Save these — they won't be shown again.</p>
              </div>
            </div>
            <div className="space-y-2">
              {newApiKeys.map((key, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                  <code className="flex-1 text-xs font-mono text-foreground truncate">{key}</code>
                  <button
                    onClick={() => copyKey(key)}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copied === key ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              These are new keys with the same permissions as your originals. Your old keys no longer work.
            </p>
            <button
              onClick={onComplete}
              className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
            >
              Done, take me to my data →
            </button>
          </div>
        </div>
      </div>
    );
  }

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
