// skipcq: JS-0067
import { X, Zap } from 'lucide-react';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  limitType: 'collections' | 'pages' | null;
}

// skipcq: JS-0067
export default function UpgradeModal({ open, onClose, limitType }: UpgradeModalProps) {
  if (!open) return null;

  const isCollections = limitType === 'collections';
  const title = isCollections ? 'Collection limit reached' : 'Page limit reached';
  const description = isCollections
    ? 'Free accounts can have up to 5 collections. Upgrade to Pro for unlimited collections, pages, and more.'
    : 'Free accounts can have up to 15 pages. Upgrade to Pro for unlimited pages, collections, and more.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
          <X size={16} />
        </button>
        <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-primary/10 p-2.5">
          <Zap size={20} className="text-primary" />
        </div>
        <h2 className="text-lg font-semibold font-display text-foreground mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground mb-6">{description}</p>
        <div className="flex gap-3">
          <a
            href="/settings"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Zap size={14} />
            Upgrade to Pro &mdash; $4.99/mo
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
