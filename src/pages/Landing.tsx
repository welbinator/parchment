import { Link } from 'react-router-dom';
import { FileText, Zap, Shield, Terminal, Globe, Puzzle, Lock, RefreshCw, ArrowRight, Check } from 'lucide-react';
import PublicNav from '@/components/PublicNav';

// skipcq: JS-0067
export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      {/* Hero */}
      <header className="relative overflow-hidden pt-32 pb-20 md:pt-44 md:pb-32">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-display leading-tight tracking-tight">
            Your thoughts.
            <br />
            <span className="text-gradient-primary">Programmable.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Parchment is a fast, minimal notebook with a full REST API. Write notes. Build scripts. Let your agents read and write alongside you.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Get Started Free <ArrowRight size={16} />
            </Link>
            <Link
              to="/docs/api"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              See the API
            </Link>
          </div>
          <p className="mt-6 text-xs text-muted-foreground/70">
            ★ Free forever • No credit card required • API-ready on day one
          </p>
        </div>
      </header>

      {/* Audience-Specific Features */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="mx-auto max-w-5xl px-6">
          <div className="space-y-8">
            {/* Card 1 — For Developers */}
            <div className="rounded-xl border border-border bg-card p-8 hover:border-primary/30 transition-colors">
              <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-primary/10 p-3">
                <Terminal size={24} className="text-primary" />
              </div>
              <h3 className="text-2xl font-bold font-display text-foreground mb-3">
                For developers who are tired of Notion&apos;s API.
              </h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Parchment&apos;s API is a single POST endpoint. No OAuth dance. No pagination nightmares. Create a collection, add pages, write blocks — all with a simple API key and a curl command.
              </p>
              <pre className="bg-muted rounded-lg p-4 text-sm font-mono overflow-x-auto text-foreground">
{`curl -X POST https://theparchment.app/functions/v1/api \\
  -H "x-api-key: YOUR_KEY" \\
  -d '{"action":"create_page","collection_id":"...","title":"My Note"}'`}
              </pre>
            </div>

            {/* Card 2 — For AI & Automation Builders */}
            <div className="rounded-xl border border-border bg-card p-8 hover:border-primary/30 transition-colors">
              <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-primary/10 p-3">
                <Zap size={24} className="text-primary" />
              </div>
              <h3 className="text-2xl font-bold font-display text-foreground mb-3">
                The memory layer for your agents.
              </h3>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Your agents can read and write Parchment just like you can. Send <code className="text-xs bg-muted px-1.5 py-0.5 rounded">Accept: text/markdown</code> and get clean markdown back. Use the API to store context, logs, or research. Parchment is agent-ready out of the box.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground font-mono">
                  llms.txt
                </span>
                <span className="inline-flex items-center gap-1 text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground font-mono">
                  Accept: text/markdown
                </span>
                <span className="inline-flex items-center gap-1 text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground font-mono">
                  Agent Skills Discovery
                </span>
              </div>
            </div>

            {/* Card 3 — For People Done With Notion */}
            <div className="rounded-xl border border-border bg-card p-8 hover:border-primary/30 transition-colors">
              <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-primary/10 p-3">
                <FileText size={24} className="text-primary" />
              </div>
              <h3 className="text-2xl font-bold font-display text-foreground mb-3">
                Notion is a part-time job. Parchment isn&apos;t.
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                No databases. No linked views. No setup tutorials. Open Parchment, create a page, start writing. It takes 30 seconds. You can organise into collections and workspaces, but you never have to learn a new system to take a note.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Parchment — Feature Pills */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold font-display text-foreground mb-4">
            Everything you need. Nothing you don&apos;t.
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 mt-12">
            <div className="flex gap-4 items-start p-6 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
              <div className="inline-flex items-center justify-center rounded-lg bg-primary/10 p-2.5 shrink-0">
                <Globe size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold font-display text-foreground mb-1">
                  Full REST API
                </h3>
                <p className="text-sm text-muted-foreground">
                  Every note, page, and collection is accessible via API.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start p-6 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
              <div className="inline-flex items-center justify-center rounded-lg bg-primary/10 p-2.5 shrink-0">
                <Puzzle size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold font-display text-foreground mb-1">
                  Chrome Extension
                </h3>
                <p className="text-sm text-muted-foreground">
                  Save pages, clips, and notes from anywhere in your browser.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start p-6 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
              <div className="inline-flex items-center justify-center rounded-lg bg-primary/10 p-2.5 shrink-0">
                <Shield size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold font-display text-foreground mb-1">
                  Granular API Keys
                </h3>
                <p className="text-sm text-muted-foreground">
                  Read-only, write-only, or full access. Set expiration dates.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start p-6 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
              <div className="inline-flex items-center justify-center rounded-lg bg-primary/10 p-2.5 shrink-0">
                <Zap size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold font-display text-foreground mb-1">
                  Agent-Ready
                </h3>
                <p className="text-sm text-muted-foreground">
                  Supports llms.txt and markdown content negotiation for AI agents.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start p-6 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
              <div className="inline-flex items-center justify-center rounded-lg bg-primary/10 p-2.5 shrink-0">
                <Lock size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold font-display text-foreground mb-1">
                  Privacy First
                </h3>
                <p className="text-sm text-muted-foreground">
                  IPs stored as SHA-256 hashes. API keys encrypted with AES-256.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start p-6 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
              <div className="inline-flex items-center justify-center rounded-lg bg-primary/10 p-2.5 shrink-0">
                <RefreshCw size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold font-display text-foreground mb-1">
                  Always in sync
                </h3>
                <p className="text-sm text-muted-foreground">
                  Realtime updates across all your devices and tabs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 md:py-28 border-t border-border">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold font-display text-foreground mb-4">
            Simple, honest pricing.
          </h2>
          <p className="text-center text-muted-foreground mb-14 max-w-lg mx-auto">
            Start free. Upgrade when you need more room.
          </p>
          <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
            {/* Free Plan */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-xl font-bold font-display text-foreground mb-2">Free</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">$0</span>
                <span className="text-muted-foreground ml-2">/forever</span>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2 text-sm">
                  <Check size={16} className="text-primary mt-0.5 shrink-0" />
                  <span className="text-foreground">2 workspaces (Personal &amp; Work)</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check size={16} className="text-primary mt-0.5 shrink-0" />
                  <span className="text-foreground">5 collections</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check size={16} className="text-primary mt-0.5 shrink-0" />
                  <span className="text-foreground">15 pages</span>
                </li>
              </ul>
              <Link
                to="/auth"
                className="block w-full text-center rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                Get Started
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="rounded-xl border border-primary bg-primary/5 p-6 relative shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-block bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
              <h3 className="text-xl font-bold font-display text-foreground mb-2">Pro</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">$4.99</span>
                <span className="text-muted-foreground ml-2">/month</span>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2 text-sm">
                  <Check size={16} className="text-primary mt-0.5 shrink-0" />
                  <span className="text-foreground">Unlimited workspaces</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check size={16} className="text-primary mt-0.5 shrink-0" />
                  <span className="text-foreground">Unlimited collections</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check size={16} className="text-primary mt-0.5 shrink-0" />
                  <span className="text-foreground">Unlimited pages</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check size={16} className="text-primary mt-0.5 shrink-0" />
                  <span className="text-foreground">Chrome extension access</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check size={16} className="text-primary mt-0.5 shrink-0" />
                  <span className="text-foreground">API access</span>
                </li>
              </ul>
              <Link
                to="/auth?redirect=%2Fsettings%3Fcheckout%3Dtrue"
                className="block w-full text-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Get Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
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
