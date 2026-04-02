import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { usePageStore } from '@/store/usePageStore';
import { useCollectionStore } from '@/store/useCollectionStore';
import { useTrashStore } from '@/store/useTrashStore';
import EditableName from './EditableName';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
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
  MoreHorizontal,
  MoveRight,
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

// ── Droppable collection drop zone ──────────────────────────────────────────
function DroppableCollection({ id, isOver, children }: { id: string; isOver: boolean; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-md transition-colors ${isOver ? 'ring-2 ring-primary/60 bg-primary/5' : ''}`}
    >
      {children}
    </div>
  );
}

// ── Draggable page row ───────────────────────────────────────────────────────
function DraggablePage({
  page,
  isActive,
  collections,
  onSelect,
  onDelete,
  onMove,
  onRename,
}: {
  page: { id: string; title: string; type: string };
  isActive: boolean;
  collections: { id: string; name: string }[];
  onSelect: () => void;
  onDelete: () => void;
  onMove: (targetCollectionId: string) => void;
  onRename: (title: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: page.id });
  const [menuOpen, setMenuOpen] = useState(false);
  const [moveMenuOpen, setMoveMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setMoveMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <div
      ref={setNodeRef}
      className={`group relative flex items-center gap-2 w-full px-3 py-1.5 mx-1 rounded-md text-sm transition-colors ${
        isDragging ? 'opacity-40' : ''
      } ${
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
      }`}
    >
      {/* Drag handle — desktop only via pointer sensor */}
      <span
        {...listeners}
        {...attributes}
        className="hidden md:flex cursor-grab active:cursor-grabbing shrink-0 text-muted-foreground/40 hover:text-muted-foreground"
        title="Drag to move"
        onClick={(e) => e.stopPropagation()}
      >
        ⠿
      </span>

      <button
        className="flex items-center gap-2 flex-1 min-w-0 text-left"
        onClick={onSelect}
      >
        {pageTypeIcons[page.type] || pageTypeIcons.blank}
        <EditableName
          value={page.title}
          onSave={onRename}
          className="text-left truncate"
        />
      </button>

      {/* ⋮ context menu button */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((o) => !o);
            setMoveMenuOpen(false);
          }}
          className="p-0.5 rounded hover:bg-sidebar-accent transition-all"
          title="Page options"
        >
          <MoreHorizontal size={13} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-6 z-50 w-40 bg-popover border border-border rounded-md shadow-lg py-1 text-sm animate-fade-in">
            {/* Move to → */}
            <button
              className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-accent text-popover-foreground"
              onClick={(e) => {
                e.stopPropagation();
                setMoveMenuOpen((o) => !o);
              }}
            >
              <MoveRight size={13} />
              Move to…
              <ChevronRight size={12} className="ml-auto" />
            </button>

            {moveMenuOpen && (
              <div className="border-t border-border mt-1 pt-1 max-h-48 overflow-y-auto">
                {collections.map((col) => (
                  <button
                    key={col.id}
                    className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-accent text-popover-foreground truncate"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMove(col.id);
                      setMenuOpen(false);
                      setMoveMenuOpen(false);
                    }}
                  >
                    <FolderOpen size={12} className="shrink-0 text-primary/70" />
                    <span className="truncate">{col.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Delete */}
            <button
              className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-destructive/10 text-destructive border-t border-border mt-1"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setMenuOpen(false);
              }}
            >
              <Trash2 size={13} />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main sidebar ─────────────────────────────────────────────────────────────
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
  const { pages, updatePageTitle, movePage } = usePageStore();
  const { collections, renameCollection } = useCollectionStore();
  const { trashedPages, trashedCollections } = useTrashStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

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

  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [showNewPageMenu, setShowNewPageMenu] = useState<string | null>(null);
  const [draggingPageId, setDraggingPageId] = useState<string | null>(null);
  const [overCollectionId, setOverCollectionId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

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

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingPageId(event.active.id as string);
  };

  const handleDragOver = (event: { over: { id: string } | null }) => {
    setOverCollectionId(event.over?.id ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggingPageId(null);
    setOverCollectionId(null);
    if (!over) return;
    const pageId = active.id as string;
    const targetCollectionId = over.id as string;
    // Only move if dropping onto a collection (not the same one)
    const page = activePages.find((p) => p.id === pageId);
    if (!page || page.collection_id === targetCollectionId) return;
    if (!activeCollections.find((c) => c.id === targetCollectionId)) return;
    movePage(pageId, targetCollectionId);
    // Expand destination collection
    setExpandedCollections((prev) => new Set(prev).add(targetCollectionId));
  };

  const draggingPage = draggingPageId ? activePages.find((p) => p.id === draggingPageId) : null;

  if (!sidebarOpen) return null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
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
            const isOver = overCollectionId === collection.id;

            return (
              <DroppableCollection key={collection.id} id={collection.id} isOver={isOver}>
                <div className="animate-fade-in">
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
                        <DraggablePage
                          key={page.id}
                          page={page}
                          isActive={activePageId === page.id}
                          collections={activeCollections.filter((c) => c.id !== collection.id)}
                          onSelect={() => {
                            setActivePage(page.id);
                            if (location.pathname !== '/app') navigate('/app');
                          }}
                          onDelete={() => deletePage(page.id)}
                          onMove={(targetCollectionId) => {
                            movePage(page.id, targetCollectionId);
                            setExpandedCollections((prev) => new Set(prev).add(targetCollectionId));
                          }}
                          onRename={(title) => updatePageTitle(page.id, title)}
                        />
                      ))}
                      {collectionPages.length === 0 && (
                        <p className="px-4 py-2 text-xs text-muted-foreground italic">No pages yet</p>
                      )}
                    </div>
                  )}
                </div>
              </DroppableCollection>
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

      {/* Drag overlay — ghost of the page being dragged */}
      <DragOverlay>
        {draggingPage && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-popover border border-border shadow-lg text-sm text-foreground opacity-90 w-52">
            {pageTypeIcons[draggingPage.type] || pageTypeIcons.blank}
            <span className="truncate">{draggingPage.title || 'Untitled'}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
