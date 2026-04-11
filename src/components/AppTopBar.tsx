import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { usePageStore } from '@/store/usePageStore';
import { useAuth } from '@/hooks/useAuth';
import UserMenu from './UserMenu';
import ShareButton from './ShareButton';
import { useViewStore } from '@/store/useViewStore';
import { PanelLeftOpen, ChevronDown, Plus } from 'lucide-react';

// skipcq: JS-0067
// skipcq: JS-R1005
export default function AppTopBar() {
  const { sidebarOpen, setSidebarOpen, activePageId, switchWorkspace } = useAppStore();
  const { workspaces, activeWorkspaceId, addWorkspace } = useWorkspaceStore();
  const { pages, updatePageSharing } = usePageStore();
  const { user } = useAuth();

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId && !w.deleted_at) ?? null;
  const activeWorkspaces = workspaces.filter((w) => !w.deleted_at).sort((a, b) => a.position - b.position);
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const newNameRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { viewMode } = useViewStore();
  const activePage = pages.find((p) => p.id === activePageId && !p.deleted_at) ?? null;

  useEffect(() => {
    if (creatingWorkspace && newNameRef.current) newNameRef.current.focus();
  }, [creatingWorkspace]);

  const handleCreateWorkspace = async () => {
    const name = newWorkspaceName.trim();
    if (!name || !user) return;
    const id = await addWorkspace(name, user.id);
    if (id) switchWorkspace(id);
    setCreatingWorkspace(false);
    setNewWorkspaceName('');
    setWorkspaceDropdownOpen(false);
  };

  useEffect(() => {
    if (!workspaceDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setWorkspaceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => { document.removeEventListener('mousedown', handler); }; // skipcq: JS-0045
  }, [workspaceDropdownOpen]);

  return (
    <div className="flex items-center gap-2 px-4 h-14 border-b border-border shrink-0 bg-background z-10">
      {/* Sidebar toggle */}
      {!sidebarOpen && (
        <button
          onClick={() => { setSidebarOpen(true); }}
          className="p-1.5 rounded hover:bg-accent text-muted-foreground transition-colors"
        >
          <PanelLeftOpen size={16} />
        </button>
      )}

      {/* Workspace name — desktop only */}
      {activeWorkspace && (
        <div className="relative hidden sm:block" ref={dropdownRef}>
          <button
            onClick={() => { setWorkspaceDropdownOpen((v) => !v); }}
            className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            {activeWorkspace.name}
            <ChevronDown size={12} className="text-muted-foreground" />
          </button>
          {workspaceDropdownOpen && (
            <div className="absolute left-0 top-7 w-52 bg-popover border border-border rounded-lg shadow-lg py-1 z-50 animate-fade-in">
              {activeWorkspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => { switchWorkspace(ws.id); setWorkspaceDropdownOpen(false); }}
                  className={`flex items-center justify-start gap-2 w-full px-3 py-1.5 text-sm text-left transition-colors hover:bg-accent ${
                    ws.id === activeWorkspaceId ? 'text-primary font-medium' : 'text-foreground'
                  }`}
                >
                  {ws.name}
                </button>
              ))}
              <div className="border-t border-border mt-1 pt-1">
                {creatingWorkspace ? (
                  <div className="px-3 py-1.5 flex items-center gap-1">
                    <input
                      ref={newNameRef}
                      value={newWorkspaceName}
                      onChange={(e) => { setNewWorkspaceName(e.target.value); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { void handleCreateWorkspace(); }
                        if (e.key === 'Escape') { setCreatingWorkspace(false); setNewWorkspaceName(''); }
                      }}
                      placeholder="Workspace name"
                      className="flex-1 text-sm bg-background border border-border rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button onClick={() => { void handleCreateWorkspace(); }} className="text-xs text-primary font-medium px-1 shrink-0">Add</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setCreatingWorkspace(true); }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <Plus size={12} />
                    New workspace
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex-1" />

      {/* Page type badge + share button — list view only, when a page is active */}
      {activePage && viewMode === 'list' && (
        <>
          {activePage.type !== 'blank' && (
            <span className="text-xs text-muted-foreground font-mono capitalize">
              {activePage.type}
            </span>
          )}
          <ShareButton
            pageId={activePage.id}
            shareSettings={{
              share_enabled: activePage.share_enabled ?? false,
              share_mode: activePage.share_mode ?? 'public',
              share_token: activePage.share_token ?? null,
              shared_with_emails: activePage.shared_with_emails ?? [],
            }}
            onUpdate={(updates) => { updatePageSharing(activePage.id, updates); }}
          />
        </>
      )}

      <UserMenu />
    </div>
  );
}
