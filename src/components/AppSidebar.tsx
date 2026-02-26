import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  Plus,
  ChevronRight,
  FileText,
  Trash2,
  FolderOpen,
  PanelLeftClose,
  MoreHorizontal,
  CheckSquare,
  Map,
  File,
} from 'lucide-react';
import type { PageType } from '@/types';

const pageTypeIcons: Record<PageType, React.ReactNode> = {
  blank: <File size={14} />,
  notes: <FileText size={14} />,
  roadmap: <Map size={14} />,
  checklist: <CheckSquare size={14} />,
};

export default function AppSidebar() {
  const {
    collections,
    pages,
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

  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(
    new Set(collections.map((c) => c.id))
  );
  const [showNewPageMenu, setShowNewPageMenu] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    setExpandedCollections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddCollection = () => {
    const name = 'New Collection';
    const id = addCollection(name);
    setExpandedCollections((prev) => new Set(prev).add(id));
  };

  const handleAddPage = (collectionId: string, type: PageType = 'blank') => {
    addPage(collectionId, type);
    setShowNewPageMenu(null);
  };

  if (!sidebarOpen) return null;

  return (
    <aside className="w-64 h-screen flex flex-col bg-sidebar border-r border-sidebar-border shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-sidebar-border">
        <span className="font-display font-semibold text-sm tracking-wide text-gradient-primary">
          Parchment
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
        {collections.map((collection) => {
          const isExpanded = expandedCollections.has(collection.id);
          const collectionPages = pages.filter((p) => p.collectionId === collection.id);

          return (
            <div key={collection.id} className="animate-fade-in">
              {/* Collection header */}
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
                <span className="text-sm truncate flex-1">{collection.name}</span>
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

              {/* New page type menu */}
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

              {/* Pages */}
              {isExpanded && (
                <div className="ml-4">
                  {collectionPages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => setActivePage(page.id)}
                      className={`group flex items-center gap-2 w-full px-3 py-1.5 mx-1 rounded-md text-sm transition-colors ${
                        activePageId === page.id
                          ? 'bg-primary/10 text-primary'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                      }`}
                    >
                      {pageTypeIcons[page.type]}
                      <span className="truncate flex-1 text-left">{page.title}</span>
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

      {/* Footer */}
      <div className="p-2 border-t border-sidebar-border">
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
