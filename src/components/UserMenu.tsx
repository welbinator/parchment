import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, BookOpen, BarChart3, ScrollText, Layers, Check, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useAppStore } from '@/store/useAppStore';
import RenameWorkspaceModal from './RenameWorkspaceModal';
import DeleteWorkspaceModal from './DeleteWorkspaceModal';

export default function UserMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [renameWorkspace, setRenameWorkspace] = useState<{ id: string; name: string } | null>(null);
  const [deleteWorkspace, setDeleteWorkspace] = useState<{ id: string; name: string } | null>(null);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const newNameRef = useRef<HTMLInputElement>(null);

  const { workspaces, activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const { addWorkspace, switchWorkspace } = useAppStore();

  const activeWorkspaces = workspaces.filter((w) => !w.deleted_at).sort((a, b) => a.position - b.position);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setWorkspaceOpen(false);
        setCreatingWorkspace(false);
        setNewWorkspaceName('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (creatingWorkspace && newNameRef.current) {
      newNameRef.current.focus();
    }
  }, [creatingWorkspace]);

  const handleCreateWorkspace = async () => {
    const name = newWorkspaceName.trim();
    if (!name) return;
    const id = await addWorkspace(name);
    if (id) switchWorkspace(id);
    setCreatingWorkspace(false);
    setNewWorkspaceName('');
    setWorkspaceOpen(false);
    setOpen(false);
  };

  if (!user) return null;

  const initial = (user.user_metadata?.full_name?.[0] || user.email?.[0] || 'U').toUpperCase();

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-semibold hover:bg-primary/30 transition-colors"
        >
          {initial}
        </button>
        {open && (
          <div className="absolute right-0 top-10 w-52 bg-popover border border-border rounded-lg shadow-lg py-1 z-50 animate-fade-in">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-sm font-medium text-foreground truncate">{user.user_metadata?.full_name || user.email}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>

            {/* Workspace submenu item */}
            <div className="relative">
              <button
                onClick={() => { setWorkspaceOpen(!workspaceOpen); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
              >
                <Layers size={14} />
                <span className="flex-1 text-left">Workspace</span>
                <ChevronRight size={12} className={`text-muted-foreground transition-transform ${workspaceOpen ? 'rotate-90' : ''}`} />
              </button>

              {workspaceOpen && (
                <div className="border-t border-border bg-accent/30">
                  {activeWorkspaces.map((ws) => (
                    <div key={ws.id} className="flex items-center group">
                      <button
                        onClick={() => {
                          switchWorkspace(ws.id);
                          setWorkspaceOpen(false);
                          setOpen(false);
                        }}
                        className="flex items-center gap-2 flex-1 px-4 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
                      >
                        {activeWorkspaceId === ws.id
                          ? <Check size={12} className="text-primary shrink-0" />
                          : <span className="w-3 shrink-0" />
                        }
                        <span className="truncate">{ws.name}</span>
                      </button>
                      <div className="flex items-center gap-0.5 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setRenameWorkspace({ id: ws.id, name: ws.name }); setOpen(false); setWorkspaceOpen(false); }}
                          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                          title="Rename"
                        >
                          <Pencil size={11} />
                        </button>
                        {activeWorkspaces.length > 1 && (
                          <button
                            onClick={() => { setDeleteWorkspace({ id: ws.id, name: ws.name }); setOpen(false); setWorkspaceOpen(false); }}
                            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* New workspace inline input or trigger */}
                  {creatingWorkspace ? (
                    <div className="px-4 py-1.5 flex items-center gap-1">
                      <input
                        ref={newNameRef}
                        value={newWorkspaceName}
                        onChange={(e) => { setNewWorkspaceName(e.target.value); }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateWorkspace();
                          if (e.key === 'Escape') { setCreatingWorkspace(false); setNewWorkspaceName(''); }
                        }}
                        placeholder="Workspace name"
                        className="flex-1 text-sm bg-background border border-border rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button onClick={handleCreateWorkspace} className="text-xs text-primary font-medium px-1">Add</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setCreatingWorkspace(true); }}
                      className="flex items-center gap-2 w-full px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <Plus size={12} />
                      New workspace
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => { setOpen(false); navigate('/settings'); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
            >
              <Settings size={14} />
              Settings
            </button>
            <button
              onClick={() => { setOpen(false); navigate('/docs'); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
            >
              <BookOpen size={14} />
              Docs
            </button>
            <button
              onClick={() => { setOpen(false); navigate('/changelog'); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
            >
              <ScrollText size={14} />
              Changelog
            </button>
            {user.email === 'james.welbes@gmail.com' && (
              <button
                onClick={() => { setOpen(false); navigate('/reports'); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
              >
                <BarChart3 size={14} />
                Reports
              </button>
            )}
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

      {renameWorkspace && (
        <RenameWorkspaceModal
          workspace={renameWorkspace}
          onClose={() => { setRenameWorkspace(null); }}
        />
      )}
      {deleteWorkspace && (
        <DeleteWorkspaceModal
          workspace={deleteWorkspace}
          onClose={() => setDeleteWorkspace(null)}
        />
      )}
    </>
  );
}
