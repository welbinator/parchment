import { useEffect, useState } from 'react';
import { X, Sparkles, Bug, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface WhatsNewEntry {
  type: 'feature' | 'fix' | 'improvement';
  description: string;
}

interface WhatsNewVersion {
  version: string;
  title: string;
  changes: WhatsNewEntry[];
}

/**
 * What's New content — update this array when shipping a new version.
 * Only the entries here will show in the modal. Keep it to the latest
 * 1-2 versions so the modal stays concise.
 */
const WHATS_NEW: WhatsNewVersion[] = [
  {
    version: '1.5.1',
    title: 'Bulk Block Selection',
    changes: [
      {
        type: 'feature',
        description: 'Multi-select blocks with checkboxes, Shift+click for range selection, and Ctrl+A to select all.',
      },
      {
        type: 'feature',
        description: 'Bulk delete — select multiple blocks and delete them all at once with a floating action bar.',
      },
    ],
  },
];

/** The latest version string — must match package.json version */
const LATEST_VERSION = __APP_VERSION__;

const typeIcon = (type: WhatsNewEntry['type']) => {
  switch (type) {
    case 'feature': return <Sparkles size={14} className="text-blue-400 mt-0.5 shrink-0" />;
    case 'fix': return <Bug size={14} className="text-amber-400 mt-0.5 shrink-0" />;
    case 'improvement': return <Tag size={14} className="text-emerald-400 mt-0.5 shrink-0" />;
  }
};

const typeLabel = (type: WhatsNewEntry['type']) => {
  switch (type) {
    case 'feature': return 'New';
    case 'fix': return 'Fix';
    case 'improvement': return 'Improved';
  }
};

export default function WhatsNewModal() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function check() {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('last_seen_version')
          .eq('user_id', user!.id)
          .maybeSingle();

        if (cancelled) return;

        const lastSeen = data?.last_seen_version;
        // Show if they've never seen any version, or if their last seen is older
        if (!lastSeen || lastSeen !== LATEST_VERSION) {
          setVisible(true);
        }
      } catch {
        // Don't show modal on error — fail silently
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    check();
    return () => { cancelled = true; };
  }, [user]);

  const dismiss = async () => {
    setVisible(false);
    if (!user) return;

    try {
      await supabase
        .from('profiles')
        .update({ last_seen_version: LATEST_VERSION })
        .eq('user_id', user.id);
    } catch {
      // Non-critical — worst case they see it again next time
    }
  };

  if (loading || !visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={dismiss}>
      <div
        className="bg-background border border-border rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-2">
          <div>
            <h2 className="text-lg font-semibold text-foreground">What's New</h2>
            <p className="text-xs text-muted-foreground">v{LATEST_VERSION}</p>
          </div>
          <button
            onClick={dismiss}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 pb-4 space-y-4">
          {WHATS_NEW.map(release => (
            <div key={release.version}>
              <h3 className="text-sm font-medium text-foreground mb-2">{release.title}</h3>
              <ul className="space-y-2">
                {release.changes.map((change, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    {typeIcon(change.type)}
                    <span>
                      <span className="text-xs font-medium text-foreground/70 uppercase tracking-wide mr-1">
                        {typeLabel(change.type)}
                      </span>
                      {change.description}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex justify-between items-center">
          <a
            href="/changelog"
            onClick={dismiss}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Full changelog
          </a>
          <button
            onClick={dismiss}
            className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
