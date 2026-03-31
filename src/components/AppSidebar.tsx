import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { usePageStore } from '@/store/usePageStore';
import { useCollectionStore } from '@/store/useCollectionStore';
import { useTrashStore } from '@/store/useTrashStore';
import EditableName from './EditableName';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus,
  ChevronRight,
  Trash2,
  FolderOpen,
  PanelLeftClose,
  CheckSquare,
  Map,
  File,
  FileText,
  Archive,
  Users,
} from 'lucide-react';
import type { PageType } from '@/types';

const pageTypeIcons: Record<string, React.ReactNode> = {
  blank: <File size={14} />,
  notes: <FileText size={14} />,
  roadmap: <Map size={14} />,
  checklist: <CheckSquare size={14} />,
};

interface AppSidebarProps {
  resizableSidebar?: boolean;
}

export default function AppSidebar({ resizableSidebar = false }: AppSidebarProps) {
  const {
    activePageId,
    activeCollectionId,
    sidebarOpen,
    setSidebarOpen,
    setActivePage,
    setActiveCollection,
    addCollection,
    addPage,
    deleteCollection,
    deletePage,
  } = useAppStore();
  const { pages, updatePageTitle } = usePageStore();
  const { collections, renameCollection } = useCollectionStore();
  const { trashedPages, trashedCollections } = useTrashStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Shared with me
  interface SharedWithMePage { id: string; title: string; share_token: string; }
  const [sharedWithMe, setSharedWithMe] = useState<SharedWithMePage[]>([]);
  const [sharedExpanded, setSharedExpanded] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    supabase
      .from('pages')
      .select('id, title, share_token')
      .eq('share_enabled', true)
      .eq('share_mode', 'private')
      .contains('shared_with_emails', [user.email])
      .then(({ data }) => setSharedWithMe((data ?? []) as SharedWithMePage[]));
  }, [user?.email]);

  const activeCollections = collections.filter((c) => !c.deleted_at);
  const activePages = pages.filter((p) => !p.deleted_at);
  const trashCount = trashedPages().length + trashedCollections().length;

  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(
    new Set()
  );
  const [showNewPageMenu, setShowNewPageMenu] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    setExpandedCollections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddCollection = async () => {
    const id = await addCollection('New Collection');
    if (id) setExpandedCollections((prev) => new Set(prev).add(id));
  };

  const handleAddPage = (collectionId: string, type: PageType = 'blank') => {
    addPage(collectionId, type);
    setShowNewPageMenu(null);
  };

  if (!sidebarOpen) return null;

  return (
    <aside className={`${resizableSidebar ? 'w-full' : 'w-64'} h-screen flex flex-col bg-sidebar border-r border-sidebar-border shrink-0`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-sidebar-border">
        <span className="font-display font-semibold text-sm tracking-wide text-gradient-primary">
          Parchment
        </span>
        <span className="text-[10px] text-muted-foreground/50 font-mono ml-1.5 mb-px">
          v{__APP_VERSION__}·{__APP_COMMIT__}
        </span>
        <button
          onClick={() => setSidebarOpen(false)}
          className="p-1 rounded hover:bg-sidebar-accent text-sidebar-foreground transition-colors"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      {/* Collections */}
      <div className="flex-1 overflow-y-auto py-2">
        {activeCollections.map((collection) => {
          const isExpanded = expandedCollections.has(collection.id);
          const collectionPages = activePages.filter((p) => p.collection_id === collection.id);

          return (
            <div key={collection.id} className="animate-fade-in">
              <div
                className={`group flex items-center gap-1 px-3 py-1.5 mx-1 rounded-md cursor-pointer transition-colors ${
                  activeCollectionId === collection.id
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`}
                onClick={() => {
                  setActiveCollection(collection.id);
                  toggleExpanded(collection.id);
                }}
              >
                <ChevronRight
                  size={14}
                  className={`transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                />
                <FolderOpen size={14} className="shrink-0 text-primary/70" />
                <EditableName
                  value={collection.name}
                  onSave={(name) => renameCollection(collection.id, name)}
                  className="text-sm"
                />
                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowNewPageMenu(showNewPageMenu === collection.id ? null : collection.id);
                    }}
                    className="p-0.5 rounded hover:bg-sidebar-accent"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCollection(collection.id);
                    }}
                    className="p-0.5 rounded hover:bg-destructive/20 hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {showNewPageMenu === collection.id && (
                <div className="mx-3 ml-8 mb-1 bg-popover border border-border rounded-md p-1 animate-fade-in">
                  {(['blank', 'notes', 'checklist', 'roadmap'] as PageType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => handleAddPage(collection.id, type)}
                      className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-accent text-popover-foreground capitalize transition-colors"
                    >
                      {pageTypeIcons[type]}
                      {type === 'blank' ? 'Blank Page' : type}
                    </button>
                  ))}
                </div>
              )}

              {isExpanded && (
                <div className={resizableSidebar ? 'ml-8 border-l border-sidebar-border/50 pl-1' : 'ml-4'}>
                  {collectionPages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => {
                        setActivePage(page.id);
                        if (location.pathname !== '/app') navigate('/app');
                      }}
                      className={`group flex items-center gap-2 w-full px-3 py-1.5 mx-1 rounded-md text-sm transition-colors ${
                        activePageId === page.id
                          ? 'bg-primary/10 text-primary'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                      }`}
                    >
                      {pageTypeIcons[page.type] || pageTypeIcons.blank}
                      <EditableName
                        value={page.title}
                        onSave={(title) => updatePageTitle(page.id, title)}
                        className="text-left"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePage(page.id);
                        }}
                        className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </button>
                  ))}
                  {collectionPages.length === 0 && (
                    <p className="px-4 py-2 text-xs text-muted-foreground italic">No pages yet</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Shared with me */}
      {sharedWithMe.length > 0 && (
        <div className="border-t border-sidebar-border pt-2 pb-1">
          <button
            onClick={() => setSharedExpanded(!sharedExpanded)}
            className="flex items-center gap-1.5 w-full px-3 py-1.5 text-xs text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-md mx-1 transition-colors"
          >
            <ChevronRight size={13} className={`transition-transform ${sharedExpanded ? 'rotate-90' : ''}`} />
            <Users size={13} className="text-primary/70" />
            <span className="font-medium">Shared with me</span>
            <span className="ml-auto text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{sharedWithMe.length}</span>
          </button>
          {sharedExpanded && (
            <div className="ml-4 mt-1">
              {sharedWithMe.map(p => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/share/${p.share_token}`)}
                  className="flex items-center gap-2 w-full px-3 py-1.5 mx-1 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
                >
                  <File size={13} />
                  <span className="truncate">{p.title || 'Untitled'}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="p-2 border-t border-sidebar-border space-y-1">
        <button
          onClick={() => navigate('/app/trash')}
          className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition-colors ${
            location.pathname === '/app/trash'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground hover:bg-sidebar-accent'
          }`}
        >
          <Archive size={14} />
          Trash
          {trashCount > 0 && (
            <span className="ml-auto text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
              {trashCount}
            </span>
          )}
        </button>
        <button
          onClick={handleAddCollection}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <Plus size={14} />
          New Collection
        </button>
      </div>
    </aside>
  );
}
