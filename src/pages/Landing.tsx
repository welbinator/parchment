import { Link } from 'react-router-dom';
import { FileText, Zap, Shield, Terminal, ArrowRight, Check } from 'lucide-react';
import PublicNav from '@/components/PublicNav';




const FEATURES = [
  {
    icon: FileText,
    title: 'Pages & Collections',
    description: 'Organise your thoughts into pages grouped by collections. Notes, checklists, roadmaps — all in one place.',
  },
  {
    icon: Terminal,
    title: 'API-First',
    description: 'Full REST API with granular permissions. Build bots, CLI tools, or connect your own workflows.',
  },
  {
    icon: Shield,
    title: 'Granular API Keys',
    description: 'Create keys with fine-grained permissions and optional expiration. Read-only, write-only, or full access.',
  },
  {
    icon: Zap,
    title: 'Fast & Minimal',
    description: 'No bloat. Just the tools you need to capture and organise information — nothing more.',
  },
];

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
            A simple place for
            <br />
            <span className="text-gradient-primary">your thoughts.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Parchment is a minimal, API-first notebook for developers and creators who want to organise ideas without the overhead.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Get Started <ArrowRight size={16} />
            </Link>
            <Link
              to="/docs/api"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Read the Docs
            </Link>
          </div>
        </div>
      </header>

      {/* Features */}
      <section id="features" className="py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold font-display text-foreground mb-4">
            Everything you need, nothing you don't.
          </h2>
          <p className="text-center text-muted-foreground mb-14 max-w-lg mx-auto">
            Built for people who think in text. Designed for machines that speak JSON.
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            {FEATURES.map(f => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-card p-6 hover:border-primary/30 transition-colors"
              >
                <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-primary/10 p-2.5">
                  <f.icon size={20} className="text-primary" />
                </div>
                <h3 className="text-lg font-semibold font-display text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
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
                to="/auth"
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
            Ready to start writing?
          </h2>
          <p className="text-muted-foreground mb-8">
            Create your free account and start organising your ideas in seconds.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Create Account <ArrowRight size={16} />
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
