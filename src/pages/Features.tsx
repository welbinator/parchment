import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PublicNav from '@/components/PublicNav';

// skipcq: JS-0067
export default function Features() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      {/* Hero */}
      <header className="relative overflow-hidden pt-32 pb-12 md:pt-44 md:pb-16">
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-display leading-tight tracking-tight">
            Everything Parchment can do.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A full-featured notes app with a REST API, Chrome extension, and agent-ready architecture. Here&apos;s the complete picture.
          </p>
        </div>
      </header>

      {/* Section 1: The Editor */}
      <section className="py-16 md:py-20 border-t border-border">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-12">
            <h2 className="text-3xl font-bold font-display text-foreground mb-3">
              A great editor, first.
            </h2>
            <p className="text-lg text-muted-foreground">
              The fundamentals have to work. Fast load, clean UI, keyboard-friendly.
            </p>
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold font-display text-foreground mb-2">
                Pages &amp; Collections
              </h3>
              <p className="text-sm text-muted-foreground">
                Organise notes into pages, group them in collections, sort into workspaces
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold font-display text-foreground mb-2">
                10 block types
              </h3>
              <p className="text-sm text-muted-foreground">
                Text, headings, todos, bullets, numbered lists, quotes, code, dividers, and groups
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold font-display text-foreground mb-2">
                Slash commands
              </h3>
              <p className="text-sm text-muted-foreground">
                Type / to insert any block type without touching the mouse
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold font-display text-foreground mb-2">
                Drag &amp; drop
              </h3>
              <p className="text-sm text-muted-foreground">
                Reorder blocks and collections with drag handles
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold font-display text-foreground mb-2">
                Board view
              </h3>
              <p className="text-sm text-muted-foreground">
                Kanban-style view of all your collections and pages
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold font-display text-foreground mb-2">
                Shared pages
              </h3>
              <p className="text-sm text-muted-foreground">
                Share any page publicly or with specific Parchment users
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold font-display text-foreground mb-2">
                Trash
              </h3>
              <p className="text-sm text-muted-foreground">
                Soft-delete with recovery
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold font-display text-foreground mb-2">
                Dark mode
              </h3>
              <p className="text-sm text-muted-foreground">
                Because of course
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: The API */}
      <section className="py-16 md:py-20 border-t border-border bg-muted/30">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-12">
            <h2 className="text-3xl font-bold font-display text-foreground mb-3">
              A REST API that doesn&apos;t fight you.
            </h2>
            <p className="text-lg text-muted-foreground">
              One endpoint. An API key. A JSON body. That&apos;s it.
            </p>
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold font-display text-foreground mb-2">
                Single endpoint
              </h3>
              <p className="text-sm text-muted-foreground">
                POST https://theparchment.app/functions/v1/api with action in the body
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold font-display text-foreground mb-2">
                Full CRUD
              </h3>
              <p className="text-sm text-muted-foreground">
                Create, read, update, and delete workspaces, collections, pages, and blocks
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold font-display text-foreground mb-2">
                Granular permissions
              </h3>
              <p className="text-sm text-muted-foreground">
                Master keys, read-only keys, write-only keys, expiring keys
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold font-display text-foreground mb-2">
                Workspace management
              </h3>
              <p className="text-sm text-muted-foreground">
                Create and organize workspaces programmatically
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold font-display text-foreground mb-2">
                Block-level control
              </h3>
              <p className="text-sm text-muted-foreground">
                append_blocks, insert_blocks, update_block, replace_blocks, delete_block
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold font-display text-foreground mb-2">
                Page sharing
              </h3>
              <p className="text-sm text-muted-foreground">
                Enable and manage public or private page sharing via API
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold font-display text-foreground mb-2">
                Rate limits
              </h3>
              <p className="text-sm text-muted-foreground">
                60 req/min, 1000/day per key — enough for any automation workflow
              </p>
            </div>
          </div>

          {/* API Code Example */}
          <div className="mt-10 rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold font-display text-foreground mb-4">
              Example: Create a page and add blocks
            </h3>
            <pre className="bg-muted rounded-lg p-4 text-sm font-mono overflow-x-auto text-foreground">
{`# Create a page
curl -X POST https://theparchment.app/functions/v1/api \\
  -H "x-api-key: YOUR_KEY" \\
  -d '{
    "action": "create_page",
    "collection_id": "abc123",
    "title": "Meeting Notes"
  }'

# Add blocks to the page
curl -X POST https://theparchment.app/functions/v1/api \\
  -H "x-api-key: YOUR_KEY" \\
  -d '{
    "action": "append_blocks",
    "page_id": "xyz789",
    "blocks": [
      {"type": "heading2", "content": "Action Items"},
      {"type": "todo", "content": "Follow up with team", "checked": false},
      {"type": "todo", "content": "Review the proposal", "checked": false}
    ]
  }'`}
            </pre>
          </div>
        </div>
      </section>

      {/* Section 3: Agent-Ready */}
      <section className="py-16 md:py-20 border-t border-border">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-12">
            <h2 className="text-3xl font-bold font-display text-foreground mb-3">
              Built for the AI era.
            </h2>
            <p className="text-lg text-muted-foreground">
              Your agents don&apos;t have to scrape HTML or fight OAuth flows. Parchment speaks their language.
            </p>
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold font-display text-foreground mb-2">
                llms.txt
              </h3>
              <p className="text-sm text-muted-foreground">
                Machine-readable site description at /llms.txt for AI crawlers
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold font-display text-foreground mb-2">
                Markdown negotiation
              </h3>
              <p className="text-sm text-muted-foreground">
                Send Accept: text/markdown and get clean markdown instead of HTML
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold font-display text-foreground mb-2">
                Agent Skills Discovery
              </h3>
              <p className="text-sm text-muted-foreground">
                /.well-known/agent-skills/index.json for automated skill discovery
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold font-display text-foreground mb-2">
                Simple auth
              </h3>
              <p className="text-sm text-muted-foreground">
                API keys work the same for humans and agents. No OAuth required.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold font-display text-foreground mb-2">
                Structured responses
              </h3>
              <p className="text-sm text-muted-foreground">
                All API responses are clean JSON. No HTML to parse.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-28 border-t border-border">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-bold font-display text-foreground mb-4">
            Start writing in 30 seconds.
          </h2>
          <p className="text-muted-foreground mb-8">
            Free forever. No credit card. Upgrade when you need more room.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Create Free Account <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">© {new Date().getFullYear()} Parchment</span>
          <div className="flex gap-6">
            <Link to="/changelog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Changelog
            </Link>
            <Link to="/docs/api" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              API Docs
            </Link>
            <a href="https://theparchment.app" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              theparchment.app
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
