import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { usePageStore } from '@/store/usePageStore';
import UserMenu from './UserMenu';
import ShareButton from './ShareButton';
import { useViewStore } from '@/store/useViewStore';
import { PanelLeftOpen, ChevronDown } from 'lucide-react';

// skipcq: JS-0067
export default function AppTopBar() {
  const { sidebarOpen, setSidebarOpen, activePageId, switchWorkspace } = useAppStore();
  const { workspaces, activeWorkspaceId } = useWorkspaceStore();
  const { pages, updatePageSharing } = usePageStore();

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId && !w.deleted_at) ?? null;
  const activeWorkspaces = workspaces.filter((w) => !w.deleted_at).sort((a, b) => a.position - b.position);
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { viewMode } = useViewStore();
  const activePage = pages.find((p) => p.id === activePageId && !p.deleted_at) ?? null;

  useEffect(() => {
    if (!workspaceDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setWorkspaceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return (): void => document.removeEventListener('mousedown', handler);

  return (
    <div className="flex items-center gap-2 px-4 h-14 border-b border-border shrink-0 bg-background z-10">
      {/* Sidebar toggle */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 rounded hover:bg-accent text-muted-foreground transition-colors"
        >
          <PanelLeftOpen size={16} />
        </button>
      )}

      {/* Workspace name — desktop only */}
      {activeWorkspace && (
        <div className="relative hidden sm:block" ref={dropdownRef}>
          <button
            onClick={() => setWorkspaceDropdownOpen((v) => !v)}
            className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            {activeWorkspace.name}
            {activeWorkspaces.length > 1 && (
              <ChevronDown size={12} className="text-muted-foreground" />
            )}
          </button>
          {workspaceDropdownOpen && activeWorkspaces.length > 1 && (
            <div className="absolute left-0 top-7 w-44 bg-popover border border-border rounded-lg shadow-lg py-1 z-50 animate-fade-in">
              {activeWorkspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => { switchWorkspace(ws.id); setWorkspaceDropdownOpen(false); }}
                  className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm transition-colors hover:bg-accent ${
                    ws.id === activeWorkspaceId ? 'text-primary font-medium' : 'text-foreground'
                  }`}
                >
                  {ws.name}
                </button>
              ))}
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
            onUpdate={(updates) => updatePageSharing(activePage.id, updates)}
          />
        </>
      )}

      <UserMenu />
    </div>
  );
}
