import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Features', href: '/#features' },
  { label: 'API', href: '/docs/api' },
  { label: 'Changelog', href: '/changelog' },
];

export default function PublicNav() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  const linkClass = (href: string) => {
    const active = href === '/' ? pathname === '/' : pathname.startsWith(href.replace('/#features', ''));
    return `text-sm transition-colors ${
      active
        ? 'text-foreground font-medium'
        : 'text-muted-foreground hover:text-foreground'
    }`;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-xl font-bold font-display text-gradient-primary">
          Parchment
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((l) =>
            l.href.startsWith('/#') ? (
              <a key={l.label} href={l.href} className={linkClass(l.href)}>
                {l.label}
              </a>
            ) : (
              <Link key={l.label} to={l.href} className={linkClass(l.href)}>
                {l.label}
              </Link>
            )
          )}
          <Link
            to="/auth"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Sign In
          </Link>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setOpen(!open)} className="md:hidden text-foreground">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-background px-6 py-4 space-y-3">
          {NAV_LINKS.map((l) =>
            l.href.startsWith('/#') ? (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`block ${linkClass(l.href)}`}
              >
                {l.label}
              </a>
            ) : (
              <Link
                key={l.label}
                to={l.href}
                onClick={() => setOpen(false)}
                className={`block ${linkClass(l.href)}`}
              >
                {l.label}
              </Link>
            )
          )}
          <Link
            to="/auth"
            onClick={() => setOpen(false)}
            className="block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground text-center"
          >
            Sign In
          </Link>
        </div>
      )}
    </nav>
  );
}
