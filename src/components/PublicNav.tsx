import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'API', href: '/docs/api' },
  { label: 'Changelog', href: '/changelog' },
];

export default function PublicNav() {
  const [open, setOpen] = useState(false);
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();

  // After navigating to / with a hash, scroll to the target once the page renders
  useEffect(() => {
    if (pathname === '/' && hash) {
      const id = hash.replace('#', '');
      // Small delay to let Landing render before we try to find the element
      const timer = setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
      return () => clearTimeout(timer); // skipcq: JS-0045
    }
  }, [pathname, hash]);

  const handlePricingClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    if (pathname === '/') {
      document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/#pricing');
    }
  };

  const linkClass = (href: string) => {
    const active = href === '/' ? pathname === '/' : pathname.startsWith(href.split('#')[0]);
    return `text-sm transition-colors ${
      active && !href.includes('#features')
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
            l.href === '/#pricing' ? (
              <a key={l.label} href={l.href} onClick={handlePricingClick} className={linkClass(l.href)}>
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
            l.href === '/#pricing' ? (
              <a key={l.label} href={l.href} onClick={handlePricingClick} className={`block ${linkClass(l.href)}`}>
                {l.label}
              </a>
            ) : (
              <Link
                key={l.label}
                to={l.href}
                onClick={() => { setOpen(false); }}
                className={`block ${linkClass(l.href)}`}
              >
                {l.label}
              </Link>
            )
          )}
          <Link
            to="/auth"
            onClick={() => { setOpen(false); }}
            className="block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground text-center"
          >
            Sign In
          </Link>
        </div>
      )}
    </nav>
  );
}
