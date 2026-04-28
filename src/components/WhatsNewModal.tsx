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
 * What&apos;s New content - update this array when shipping a new version.
 * Only the entries here will show in the modal. Keep it to the latest
 * 1-2 versions so the modal stays concise.
 */
const WHATS_NEW: WhatsNewVersion[] = [
  {
    version: '2.2.0',
    title: 'Auth Reliability & Chrome Extension Improvements',
    changes: [
      { type: 'fix', description: 'Google OAuth login no longer hangs on a loading spinner.' },
      { type: 'feature', description: 'Email verification now supports entering a 6-digit code directly in the app.' },
      { type: 'fix', description: 'Loading spinner now shows a &apos;Sign out and start over&apos; escape hatch so users are never permanently stuck.' },
      { type: 'improvement', description: 'Chrome extension lets you choose which workspace to save articles and videos to.' },
      { type: 'improvement', description: 'Chrome extension AI summaries now save as properly formatted bold/italic blocks.' },
    ],
  },
  {
    version: '2.0.0',
    title: 'Parchment 2.0 — Paid Plans & Chrome Web Store',
    changes: [
      { type: 'feature', description: 'Paid plans are live — upgrade to Pro for unlimited collections and pages.' },
      { type: 'feature', description: 'Free plan enforces limits — 5 collections and 15 pages. Upgrade prompt appears when you hit the cap.' },
      { type: 'feature', description: 'Parchment for Chrome is now on the Chrome Web Store — clip content to Parchment with one click.' },
      { type: 'fix', description: 'Board view columns with many pages now scroll instead of overflowing off the screen.' },
      { type: 'fix', description: 'Mobile: returning to Parchment after switching apps no longer resets your workspace.' },
    ],
  },
  {
    version: '1.9.2',
    title: 'API: Block Editing & Workspace Improvements',
    changes: [
      { type: 'feature', description: 'New insert_blocks API action — insert blocks at any position in a page. Existing blocks shift down automatically.' },
      { type: 'feature', description: 'New update_block API action — patch a single block&apos;s content or type in-place without rewriting the whole page.' },
      { type: 'feature', description: 'New move_collection API action — move a collection to a different workspace programmatically.' },
      { type: 'improvement', description: 'workspace_name now works on all workspace-targeting API actions (move_collection, rename_workspace, delete_workspace).' },
    ],
  },
];

/** Max number of change items to show across all versions */
const MAX_ITEMS = 6;

/** The latest version string - must match package.json version */
const LATEST_VERSION = __APP_VERSION__;

const typeIcon = (type: WhatsNewEntry['type']) => {
  switch (type) {
    case 'feature': return <Sparkles size={14} className="text-blue-400 mt-0.5 shrink-0" />;
    case 'fix': return <Bug size={14} className="text-amber-400 mt-0.5 shrink-0" />;
    case 'improvement': return <Tag size={14} className="text-emerald-400 mt-0.5 shrink-0" />;
    default: return null;
  }
};

const typeLabel = (type: WhatsNewEntry['type']) => {
  switch (type) {
    case 'feature': return 'New';
    case 'fix': return 'Fix';
    case 'improvement': return 'Improved';
    default: return '';
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
        // Only show if:
        // 1. The user hasn't seen this version yet, AND
        // 2. There's actually a WHATS_NEW entry for the current version
        //    (prevents popping up on version bumps where changelog hasn't been updated yet)
        const hasEntryForCurrentVersion = WHATS_NEW.some(entry => entry.version === LATEST_VERSION);
        if (hasEntryForCurrentVersion && (!lastSeen || lastSeen !== LATEST_VERSION)) {
          setVisible(true);
        }
      } catch {
        // Don't show modal on error - fail silently
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
      // Non-critical - worst case they see it again next time
    }
  };

  if (loading || !visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" onClick={dismiss}>
      <div
        className="bg-background border border-border rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">What&apos;s New</h2>
            <p className="text-sm text-muted-foreground">v{LATEST_VERSION}</p>
          </div>
          <button
            onClick={dismiss}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-5 space-y-5">
          {(() => {
            let itemCount = 0;
            return WHATS_NEW.map(release => {
              if (itemCount >= MAX_ITEMS) return null;
              const remaining = MAX_ITEMS - itemCount;
              const visibleChanges = release.changes.slice(0, remaining);
              itemCount += visibleChanges.length;
              return (
                <div key={release.version}>
                  <h3 className="text-base font-medium text-foreground mb-3">{release.title}</h3>
                  <ul className="space-y-3">
                    {visibleChanges.map((change, i) => (
                      <li key={`${release.version}-${i}`} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        {typeIcon(change.type)}
                        <span>
                          <span className="text-xs font-medium text-foreground/70 uppercase tracking-wide mr-1.5">
                            {typeLabel(change.type)}
                          </span>
                          {change.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            });
          })()}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex justify-between items-center">
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
