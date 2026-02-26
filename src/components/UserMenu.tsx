import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, User, BookOpen } from 'lucide-react';

export default function UserMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) return null;

  const initial = (user.user_metadata?.full_name?.[0] || user.email?.[0] || 'U').toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-semibold hover:bg-primary/30 transition-colors"
      >
        {initial}
      </button>
      {open && (
        <div className="absolute right-0 top-10 w-48 bg-popover border border-border rounded-lg shadow-lg py-1 z-50 animate-fade-in">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-sm font-medium text-foreground truncate">{user.user_metadata?.full_name || user.email}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <button
            onClick={() => { setOpen(false); navigate('/settings'); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <Settings size={14} />
            Settings
          </button>
          <button
            onClick={() => { setOpen(false); navigate('/docs/api'); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <BookOpen size={14} />
            API Docs
          </button>
          <button
            onClick={() => { setOpen(false); signOut(); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-destructive transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
