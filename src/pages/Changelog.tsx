import { Link } from 'react-router-dom';
import { ArrowLeft, Tag, Bug, Sparkles, Trash2 } from 'lucide-react';

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: {
    type: 'feature' | 'fix' | 'improvement';
    description: string;
  }[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.3.1',
    date: '2026-03-09',
    title: 'Agent-First Onboarding & Bug Fixes',
    changes: [
      {
        type: 'feature',
        description: 'New users are now redirected to Settings after signup with the API key form pre-opened and agent-friendly permissions pre-selected — making it easy to connect an AI agent right away.',
      },
      {
        type: 'feature',
        description: 'Each API key card now shows a "Download SKILL.md" button — downloads a ready-to-use skill file for your AI agent with full API reference, curl examples, and block type docs.',
      },
      {
        type: 'fix',
        description: 'Fixed a bug where new accounts would sometimes get multiple duplicate "Getting Started" collections created on first login.',
      },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-03-05',
    title: 'Trash Auto-Delete, API Improvements & Security',
    changes: [
      {
        type: 'feature',
        description: 'Trash items are now automatically and permanently deleted 30 days after being moved to trash.',
      },
      {
        type: 'feature',
        description: 'Trash page now shows a warning banner and a "X days left" countdown on each item instead of the raw deletion date.',
      },
      {
        type: 'feature',
        description: 'New favicon — the Parchment logo is now shown in browser tabs.',
      },
      {
        type: 'improvement',
        description: 'API docs now fully document all block types, HTML content format, inline formatting (bold, italic, strikethrough, color, links), and data export.',
      },
      {
        type: 'improvement',
        description: 'API docs crawler-friendly noscript block updated to match the full public docs — AI bots can now read complete API documentation.',
      },
      {
        type: 'fix',
        description: 'Security: block HTML content is now sanitized with DOMPurify before rendering, preventing potential XSS injection via the API.',
      },
    ],
  },
  {
    version: '1.2.1',
    date: '2026-03-02',
    title: 'Bug Fixes',
    changes: [
      {
        type: 'fix',
        description: 'Fixed Admin Reports page failing to load with Access denied error.',
      },
      {
        type: 'fix',
        description: 'Fixed Settings → Export Data button pointing to the wrong server.',
      },
      {
        type: 'fix',
        description: 'Fixed API Docs page showing an incorrect base URL.',
      },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-02-27',
    title: 'Inline Rename',
    changes: [
      {
        type: 'feature',
        description: 'Double-click (or long-press on mobile) any page or collection name in the sidebar to rename it inline.',
      },
      {
        type: 'fix',
        description: 'Fixed an issue on mobile where tapping outside the rename input wouldn\'t exit edit mode.',
      },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-02-27',
    title: 'Rich Text & Links',
    changes: [
      {
        type: 'feature',
        description: 'Inline formatting toolbar — select text to bold, italicize, strikethrough, change color, or turn it into a link.',
      },
      {
        type: 'feature',
        description: 'Auto-linkify — URLs typed into blocks automatically become clickable links when you leave the block.',
      },
      {
        type: 'feature',
        description: 'Ctrl+click (Cmd+click on Mac) to open links — regular clicks place the cursor for editing.',
      },
      {
        type: 'improvement',
        description: 'Mobile-friendly toolbar positioning — on touch devices the toolbar appears below the selection to avoid clashing with native OS menus.',
      },
    ],
  },
  {
    version: '1.0.2',
    date: '2026-02-27',
    title: 'Keyboard Undo for Blocks',
    changes: [
      {
        type: 'feature',
        description: 'Ctrl+Z / Cmd+Z now undoes the last block deletion — no need to click the toast, just press undo like you normally would.',
      },
    ],
  },
  {
    version: '1.0.1',
    date: '2026-02-27',
    title: 'Trash & Recovery',
    changes: [
      {
        type: 'feature',
        description: 'Added Trash for pages and collections — deleted items are now soft-deleted and can be restored or permanently removed from the Trash view.',
      },
      {
        type: 'feature',
        description: 'Block-level undo — deleting a block now shows a toast with an Undo action to instantly recover it.',
      },
      {
        type: 'fix',
        description: 'Fixed an issue where typing in blocks was being overwritten in real-time by the auto-save sync, causing characters to disappear while editing.',
      },
      {
        type: 'fix',
        description: 'Fixed navigation bug where clicking a page in the sidebar while viewing Trash would not navigate back to the editor.',
      },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-02-27',
    title: 'Initial Release',
    changes: [
      {
        type: 'feature',
        description: 'Pages & Collections — organise your thoughts into pages grouped by collections.',
      },
      {
        type: 'feature',
        description: 'Block-based editor with support for headings, lists, to-dos, quotes, code blocks, and dividers.',
      },
      {
        type: 'feature',
        description: 'Slash commands — type "/" to quickly change block types.',
      },
      {
        type: 'feature',
        description: 'REST API with granular API key permissions and rate limiting.',
      },
      {
        type: 'feature',
        description: 'Real-time sync across devices with optimistic local updates.',
      },
    ],
  },
];

const typeConfig = {
  feature: { label: 'New', icon: Sparkles, className: 'bg-primary/15 text-primary' },
  fix: { label: 'Fix', icon: Bug, className: 'bg-destructive/15 text-destructive' },
  improvement: { label: 'Improved', icon: Tag, className: 'bg-accent text-accent-foreground' },
};

export default function Changelog() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-xl font-bold font-display text-gradient-primary">
            Parchment
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Home</Link>
            <Link to="/docs/api" className="text-sm text-muted-foreground hover:text-foreground transition-colors">API</Link>
            <Link
              to="/auth"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="pt-32 pb-12 md:pt-40 md:pb-16">
        <div className="mx-auto max-w-2xl px-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft size={14} />
            Back
          </Link>
          <h1 className="text-4xl font-bold font-display text-foreground tracking-tight">Changelog</h1>
          <p className="mt-3 text-muted-foreground">New features, improvements, and fixes for Parchment.</p>
        </div>
      </header>

      {/* Entries */}
      <main className="pb-20">
        <div className="mx-auto max-w-2xl px-6">
          <div className="relative border-l border-border pl-8 space-y-16">
            {CHANGELOG.map((entry) => (
              <article key={entry.version} className="relative">
                {/* Timeline dot */}
                <div className="absolute -left-[calc(2rem+5px)] top-1 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-background" />

                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-mono font-medium text-primary">
                    <Tag size={12} />
                    v{entry.version}
                  </span>
                  <time className="text-sm text-muted-foreground font-mono">{entry.date}</time>
                </div>
                <hr className="border-border/50 mb-4" />

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
                        <span className="text-sm text-foreground/85 leading-relaxed">{change.description}</span>
                      </li>
                    );
                  })}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">© {new Date().getFullYear()} Parchment</span>
          <div className="flex gap-6">
            <Link to="/docs/api" className="text-sm text-muted-foreground hover:text-foreground transition-colors">API Docs</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
