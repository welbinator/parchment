import { Link } from 'react-router-dom';
import { ArrowLeft, Tag } from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import { CHANGELOG, typeConfig } from '@/data/changelog';

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
                      <li key={`${entry.version}-${i}-${change.type}`} className="flex gap-3 items-start">
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
