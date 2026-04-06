import { Link } from 'react-router-dom';
import { ArrowLeft, Tag, Bug, Sparkles, Trash2 } from 'lucide-react';
import PublicNav from '@/components/PublicNav';

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
    version: '1.7.3',
    date: '2026-04-06',
    title: 'Bug Fixes & Polish',
    changes: [
      { type: 'fix', description: 'Fixed trash modal in board view not being scrollable when many items were present.' },
      { type: 'fix', description: 'Fixed trash page in list view stretching full width — now constrained to the standard page container.' },
      { type: 'improvement', description: 'Added List/Board view toggle to the trash page in list view.' },
    ],
  },
  {
    version: '1.7.2',
    date: '2026-04-05',
    title: 'Security Improvements',
    changes: [
      { type: 'improvement', description: 'Added Socket.dev supply chain security monitoring — every dependency change is scanned for malicious packages, typosquatting, and compromised maintainers.' },
      { type: 'improvement', description: 'Upgraded react-router-dom to 6.30.3, resolving 3 high severity vulnerabilities (XSS and Open Redirect).' },
    ],
  },
  {
    version: '1.7.1',
    date: '2026-04-05',
    title: 'Security Improvements',
    changes: [
      { type: 'improvement', description: 'Added Snyk security scanning to our CI pipeline for continuous dependency and code vulnerability monitoring.' },
    ],
  },
  {
    version: '1.7.0',
    date: '2026-04-05',
    title: 'Board View',
    changes: [
      { type: 'feature', description: 'New Board view — a Trello-style horizontal layout showing all your collections as columns. Toggle between List and Board views with the pill at the bottom of the screen.' },
      { type: 'feature', description: 'Add new collections from anywhere with the floating + button in the bottom-right corner.' },
      { type: 'feature', description: 'Manage your trash directly from the Board view with the Trash button in the bottom-left.' },
      { type: 'feature', description: 'Delete collections directly from their card header in Board view.' },
      { type: 'improvement', description: 'Adding a new collection auto-scrolls the board so the new column is always in view.' },
      { type: 'improvement', description: 'Footer controls (Feedback, toggle, Trash) adapt to icon-only or shorter labels on mobile to prevent overlap.' },
    ],
  },
  {
    version: '1.6.0',
    date: '2026-04-04',
    title: 'Parchment Chrome Extension',
    changes: [
      { type: 'feature', description: 'Parchment Chrome Extension is here! Save recipes, YouTube videos (with transcripts), and articles to Parchment in one click from any page.' },
      { type: 'feature', description: 'YouTube videos: fetch the full transcript via TranscriptAPI and optionally generate an AI summary before saving to your YouTube Videos collection.' },
      { type: 'feature', description: 'AI-powered page detection — the extension automatically recognizes recipes, YouTube videos, and general articles, routing each to the right collection.' },
      { type: 'feature', description: 'AI summaries supported via OpenAI, Anthropic Claude, or Google Gemini (free tier available). Add your API key in extension Settings.' },
      { type: 'feature', description: 'After saving, "Open Parchment" deep-links directly to the newly created page — no hunting through the sidebar.' },
      { type: 'improvement', description: 'Extension is available now on GitHub while awaiting official Chrome Web Store approval. Install instructions at theparchment.app.' },
    ],
  },
  {
    version: '1.5.2',
    date: '2026-04-02',
    title: 'Move Pages & Smarter Links',
    changes: [
      { type: 'feature', description: 'Move pages between collections — drag and drop on desktop, or use the ⋮ menu on any page and choose "Move to…" on mobile.' },
      { type: 'feature', description: 'URLs in API-inserted blocks are now automatically clickable on page load — no need to click in and out of the block first.' },
      { type: 'feature', description: 'Hold Ctrl and hover a link to see the pointer cursor, indicating it\'s clickable. Ctrl+click opens the link.' },
      { type: 'feature', description: 'New API action: move_page — moves a page to a different collection by page_id and target collection_id.' },
    ],
  },
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
        description: 'Ctrl+A (or Cmd+A) selects all blocks on the page at once. Press Ctrl+A again to deselect all, or hit Escape to exit selection mode.',
      },
      {
        type: 'feature',
        description: 'Shift+click to select a range of blocks between two checkboxes. Select All / Deselect All buttons in the action bar for quick control.',
      },
    ],
  },
  {
    version: '1.5.0',
    date: '2026-03-29',
    title: 'Nested Lists, Keyboard Navigation & Long Title Support',
    changes: [
      {
        type: 'feature',
        description: 'Nested list indentation — press TAB on any numbered or bullet list item to indent it into a sub-list. SHIFT+TAB outdents. Numbered sub-lists automatically use letter labels (a., b., c.) at level 2 and roman numerals (i., ii., iii.) at level 3+.',
      },
      {
        type: 'feature',
        description: 'Slash command keyboard navigation — use the arrow keys to move through the slash command menu and press Enter to select. No more reaching for the mouse.',
      },
      {
        type: 'fix',
        description: 'Page titles no longer truncate when they\'re too long — the title field now grows to wrap across multiple lines, just like a regular heading.',
      },
    ],
  },
  {
    version: '1.4.1',
    date: '2026-03-28',
    title: 'Resizable Sidebar, Group Blocks & Bug Fixes',
    changes: [
      {
        type: 'feature',
        description: 'Group blocks — use /group to create a container block that groups related content together. Delete the whole group at once, or style it with a custom background and border color.',
      },
      {
        type: 'feature',
        description: 'Group block styling — click the pencil icon on any group to pick a background and border color from a curated palette.',
      },
      {
        type: 'feature',
        description: 'Resizable sidebar — drag the border between the sidebar and main content to make the sidebar wider or narrower. Your preferred width is saved automatically.',
      },
      {
        type: 'improvement',
        description: 'Pages are now visually indented under their collection with a subtle tree-style border, making the hierarchy between collections and pages much clearer.',
      },
      {
        type: 'fix',
        description: 'Fixed a bug where closing the sidebar on mobile would briefly show a fullscreen black panel before the layout settled.',
      },
    ],
  },
  {
    version: '1.4.0',
    date: '2026-03-27',
    title: 'Page Sharing, Beta Tester Program & PWA',
    changes: [
      {
        type: 'feature',
        description: 'Page Sharing — share any page via a public link anyone can view, or restrict it to specific Parchment users by email. Shared pages are fully read-only for viewers.',
      },
      {
        type: 'feature',
        description: 'Shared with me — pages privately shared with your email address now appear in a dedicated sidebar section.',
      },
      {
        type: 'feature',
        description: 'Beta Tester program — opt in from Settings to get early access to features still being tested. Check the boxes for the features you want to try.',
      },
      {
        type: 'feature',
        description: 'Progressive Web App (PWA) — Parchment can now be installed to your home screen on mobile and desktop for a native app-like experience.',
      },
      {
        type: 'improvement',
        description: 'Collections are now collapsed by default when you open the app.',
      },
    ],
  },
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
      <PublicNav />

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
