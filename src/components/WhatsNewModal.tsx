import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Bug, Sparkles, Tag, X, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';

// ─── Shared changelog data ────────────────────────────────────────────────────
// Keep this in sync with src/pages/Changelog.tsx
// When you add a new entry there, add it here too. The modal will auto-show
// for any user whose last_seen_version is older than CHANGELOG[0].version.

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: {
    type: 'feature' | 'fix' | 'improvement';
    description: string;
  }[];
}

export const LATEST_VERSION = '1.5.1';

// Only needs the entries you want to surface in the "What's New" modal.
// Typically just the latest one or two — users can click through to the full changelog.
export const WHATS_NEW: ChangelogEntry[] = [
  {
    version: '1.5.1',
    date: '2026-03-31',
    title: 'Bulk Block Selection',
    changes: [
      {
        type: 'feature',
        description: 'Multi-select blocks — hover any block to reveal a checkbox, click to enter selection mode. Select multiple blocks and delete them all at once.',
      },
      {
        type: 'feature',
        description: 'Ctrl+A (or Cmd+A) selects all blocks on the page at once, dropping you straight into selection mode.',
      },
      {
        type: 'feature',
        description: 'Shift+click to select a range of blocks between two checkboxes. Select All / Deselect All buttons in the action bar for quick control.',
      },
    ],
  },
];

const typeConfig = {
  feature: { label: 'New', icon: Sparkles, className: 'bg-primary/15 text-primary' },
  fix: { label: 'Fix', icon: Bug, className: 'bg-destructive/15 text-destructive' },
  improvement: { label: 'Improved', icon: Tag, className: 'bg-accent text-accent-foreground' },
};

export default function WhatsNewModal() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    supabase
      .from('profiles')
      .select('last_seen_version')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const seen = data?.last_seen_version ?? null;
        if (seen !== LATEST_VERSION) {
          setOpen(true);
        }
      });
  }, [user?.id]);

  const handleDismiss = async () => {
    setOpen(false);
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ last_seen_version: LATEST_VERSION })
      .eq('user_id', user.id);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-0 gap-0">
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur border-b border-border px-6 py-4 flex items-start justify-between gap-4 z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-mono font-medium text-primary">
                <Tag size={10} />
                v{LATEST_VERSION}
              </span>
              <time className="text-xs text-muted-foreground font-mono">
                {WHATS_NEW[0]?.date}
              </time>
            </div>
            <DialogTitle className="text-lg font-bold font-display leading-tight">
              What's new in Parchment
            </DialogTitle>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors mt-0.5"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>

        {/* Entries */}
        <div className="px-6 py-6 space-y-8">
          {WHATS_NEW.map((entry) => (
            <div key={entry.version}>
              <h3 className="text-sm font-semibold text-foreground mb-4">{entry.title}</h3>
              <ul className="space-y-3">
                {entry.changes.map((change, i) => {
                  const config = typeConfig[change.type];
                  return (
                    <li key={i} className="flex gap-3 items-start">
                      <div className="shrink-0 min-w-[5.5rem]">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium mt-0.5 ${config.className}`}>
                          <config.icon size={10} />
                          {config.label}
                        </span>
                      </div>
                      <span className="text-sm text-foreground/85 leading-relaxed">
                        {change.description}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex items-center justify-between gap-4 border-t border-border pt-4">
          <Link
            to="/changelog"
            onClick={handleDismiss}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Full changelog
            <ArrowRight size={13} />
          </Link>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Got it
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
