import { useState, useRef, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppStore } from '@/store/useAppStore';
import { usePageStore } from '@/store/usePageStore';
import { useCollectionStore } from '@/store/useCollectionStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useTrashStore } from '@/store/useTrashStore';
import PageEditor from '@/components/PageEditor';
import TrashContent from '@/components/TrashContent';
import PageContextMenu from '@/components/PageContextMenu';
import ShareButton from '@/components/ShareButton';
import UserMenu from '@/components/UserMenu';
import { Plus, X, File, FileText, Map, CheckSquare, Trash2, GripVertical, Clock, ChevronDown } from 'lucide-react';
import type { DbCollection } from '@/store/useCollectionStore';
import type { PageType } from '@/types';

const pageTypeIcons: Record<string, React.ReactNode> = {
  blank: <File size={13} />,
  notes: <FileText size={13} />,
  roadmap: <Map size={13} />,
  checklist: <CheckSquare size={13} />,
};

// ── Sortable collection column ────────────────────────────────────────────────
type ColumnProps = Readonly<{
  collection: DbCollection;
  pages: ReturnType<typeof usePageStore.getState>['pages'];
  activePageId: string | null;
  activeCollections: DbCollection[];
  onOpenPage: (id: string) => void;
  onAddPage: (collectionId: string, type: PageType) => void;
  onMovePage: (pageId: string, targetCollectionId: string) => void;
  onDeletePage: (pageId: string) => void;
  onDeleteCollection: (id: string) => void;
  showNewPageMenu: string | null;
  setShowNewPageMenu: (id: string | null) => void;
  renamingId: string | null;
  renameValue: string;
  renameInputRef: React.RefObject<HTMLInputElement | null>;
  onStartRename: (id: string, name: string) => void;
  onCommitRename: () => void;
  onRenameKey: (e: React.KeyboardEvent) => void;
  setRenameValue: (v: string) => void;
  isDragOverlay?: boolean;
}>;

function CollectionColumn({
  collection,
  pages,
  activePageId,
  activeCollections,
  onOpenPage,
  onAddPage,
  onMovePage,
  onDeletePage,
  onDeleteCollection,
  showNewPageMenu,
  setShowNewPageMenu,
  renamingId,
  renameValue,
  renameInputRef,
  onStartRename,
  onCommitRename,
  onRenameKey,
  setRenameValue,
  isDragOverlay = false,
}: ColumnProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: collection.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const collectionPages = pages.filter((p) => p.collection_id === collection.id && !p.deleted_at);
  const isRenaming = renamingId === collection.id;

  return (
    <div
      ref={setNodeRef}
      style={isDragOverlay ? {} : style}
      className={`flex flex-col w-72 shrink-0 bg-sidebar rounded-xl border border-sidebar-border shadow-sm ${isDragOverlay ? 'shadow-xl rotate-1 opacity-95' : ''}`}
    >
      {/* Column header */}
      <div className="flex items-center gap-1.5 px-2 py-2.5 border-b border-sidebar-border">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing p-0.5 shrink-0 touch-none"
          tabIndex={-1}
        >
          <GripVertical size={14} />
        </button>

        {isRenaming ? (
          <input
            ref={renameInputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={onCommitRename}
            onKeyDown={onRenameKey}
            className="flex-1 text-sm font-semibold bg-background border border-primary/50 rounded px-1.5 py-0.5 outline-none text-sidebar-foreground"
          />
        ) : (
          <button
            className="flex-1 text-left font-semibold text-sm text-sidebar-foreground truncate hover:text-primary transition-colors"
            onDoubleClick={() => { onStartRename(collection.id, collection.name); }}
            title="Double-click to rename"
          >
            {collection.name}
          </button>
        )}

        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">
          {collectionPages.length}
        </span>
        <button
          onClick={() => onDeleteCollection(collection.id)}
          className="transition-opacity p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground shrink-0"
          title="Delete collection"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Pages */}
      <div className="p-2 space-y-1.5">
        {collectionPages.map((page) => (
          <div
            key={page.id}
            className={`group flex items-center gap-1 w-full text-left px-3 py-2 rounded-lg text-sm transition-colors border ${
              activePageId === page.id
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-background border-border hover:border-primary/30 hover:bg-primary/5 text-foreground'
            }`}
          >
            <button
              className="flex items-center gap-2 flex-1 min-w-0 text-left"
              onClick={() => { onOpenPage(page.id); }}
            >
              <span className="text-muted-foreground shrink-0">
                {pageTypeIcons[page.type] || pageTypeIcons.blank}
              </span>
              <span className="truncate">{page.title || 'Untitled'}</span>
            </button>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <PageContextMenu
                collections={activeCollections}
                currentCollectionId={collection.id}
                onMove={(targetId) => { onMovePage(page.id, targetId); }}
                onDelete={() => { onDeletePage(page.id); }}
              />
            </span>
          </div>
        ))}
        {collectionPages.length === 0 && (
          <p className="text-xs text-muted-foreground italic px-2 py-1">No pages yet</p>
        )}
      </div>

      {/* Add page */}
      <div className="p-2 border-t border-sidebar-border relative">
        <button
          onClick={() => setShowNewPageMenu(showNewPageMenu === collection.id ? null : collection.id)}
          className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
        >
          <Plus size={13} />
          Add page
        </button>
        {showNewPageMenu === collection.id && (
          <div className="absolute bottom-full left-2 mb-1 z-50 w-40 bg-popover border border-border rounded-md shadow-lg py-1">
            {(['blank', 'notes', 'checklist', 'roadmap'] as PageType[]).map((type) => (
              <button
                key={type}
                onClick={() => { onAddPage(collection.id, type); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm rounded hover:bg-accent text-popover-foreground capitalize transition-colors"
              >
                {pageTypeIcons[type]}
                {type === 'blank' ? 'Blank Page' : type}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main KanbanView ────────────────────────────────────────────────────────────
export default function KanbanView() {
  const { activePageId, setActivePage, addPage, addCollection, deletePage } = useAppStore();
  const { pages, movePage, updatePageSharing } = usePageStore();
  const { collections, renameCollection, deleteCollection, reorderCollections } = useCollectionStore();
  const { trashedPages, trashedCollections } = useTrashStore();
  const { workspaces, activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId && !w.deleted_at) ?? null;
  const activeWorkspaces = workspaces.filter((w) => !w.deleted_at).sort((a, b) => a.position - b.position);
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const workspaceDropdownRef = useRef<HTMLDivElement>(null);
  const { switchWorkspace } = useAppStore();

  // Close workspace dropdown on outside click
  useEffect(() => {
    if (!workspaceDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (workspaceDropdownRef.current && !workspaceDropdownRef.current.contains(e.target as Node)) {
        setWorkspaceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [workspaceDropdownOpen]);

  const [pageModalOpen, setPageModalOpen] = useState(false);
  const [trashModalOpen, setTrashModalOpen] = useState(false);
  const [showNewPageMenu, setShowNewPageMenu] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const activeCollections = collections
    .filter((c) => !c.deleted_at)
    .sort((a, b) => a.position - b.position);

  const activePages = pages.filter((p) => !p.deleted_at);
  const activePage = pages.find(p => p.id === activePageId) ?? null;
  const deletedPages = trashedPages();
  const trashCount = deletedPages.length + trashedCollections().length;

  const handleAddCollection = async () => {
    await addCollection('New Collection');
    setTimeout(() => {
      boardRef.current?.scrollTo({ left: boardRef.current.scrollWidth, behavior: 'smooth' });
    }, 50);
  };

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const openPage = (pageId: string) => {
    setActivePage(pageId);
    setPageModalOpen(true);
  };

  const handleAddPage = async (collectionId: string, type: PageType = 'blank') => {
    await addPage(collectionId, type);
    setShowNewPageMenu(null);
    setPageModalOpen(true);
  };

  const startRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const commitRename = async () => {
    if (renamingId && renameValue.trim()) {
      await renameCollection(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  const handleRenameKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitRename();
    if (e.key === 'Escape') setRenamingId(null);
  };

  const handleDragStart = (e: DragStartEvent) => {
    setDraggingId(e.active.id as string);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setDraggingId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = activeCollections.findIndex((c) => c.id === active.id);
    const newIndex = activeCollections.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(activeCollections, oldIndex, newIndex);
    reorderCollections(reordered.map((c) => c.id));
  };

  const draggingCollection = draggingId ? activeCollections.find((c) => c.id === draggingId) : null;

  const activePageCollection = collections.find(
    (c) => c.id === pages.find((p) => p.id === activePageId)?.collection_id
  );

  const columnProps = {
    pages: activePages,
    activePageId,
    activeCollections,
    onOpenPage: openPage,
    onAddPage: handleAddPage,
    onMovePage: movePage,
    onDeletePage: deletePage,
    onDeleteCollection: deleteCollection,
    showNewPageMenu,
    setShowNewPageMenu,
    renamingId,
    renameValue,
    renameInputRef,
    onStartRename: startRename,
    onCommitRename: commitRename,
    onRenameKey: handleRenameKey,
    setRenameValue,
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Board top bar */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-border shrink-0">
        {/* Workspace name — desktop only */}
        {activeWorkspace && (
          <div className="relative hidden sm:block" ref={workspaceDropdownRef}>
            <button
              onClick={() => setWorkspaceDropdownOpen((v) => !v)}
              className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              {activeWorkspace.name}
              {activeWorkspaces.length > 1 && <ChevronDown size={12} className="text-muted-foreground" />}
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
        <UserMenu />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Trello-style horizontal scroll board */}
        <div ref={boardRef} className="flex-1 overflow-x-auto overflow-y-hidden bg-background">
          <div className="flex flex-row gap-4 p-6 pb-20 h-full items-start" style={{ minWidth: 'max-content' }}>
            <SortableContext
              items={activeCollections.map((c) => c.id)}
              strategy={horizontalListSortingStrategy}
            >
              {activeCollections.map((collection) => (
                <CollectionColumn
                  key={collection.id}
                  collection={collection}
                  {...columnProps}
                />
              ))}
            </SortableContext>
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {draggingCollection && (
            <CollectionColumn
              collection={draggingCollection}
              {...columnProps}
              isDragOverlay
            />
          )}
        </DragOverlay>
      </DndContext>

      {/* FAB — Add collection (bottom-right) */}
      <button
        onClick={handleAddCollection}
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
        title="Add collection"
      >
        <Plus size={24} />
      </button>

      {/* Manage Trash button (bottom-left) */}
      <button
        onClick={() => setTrashModalOpen(true)}
        className="fixed bottom-6 left-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-sidebar border border-sidebar-border text-sm text-muted-foreground shadow-md hover:text-foreground hover:bg-sidebar-accent transition-colors"
      >
        <Trash2 size={14} />
        <span className="hidden sm:inline">Manage </span>Trash
        {trashCount > 0 && (
          <span className="ml-0.5 bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded-full">
            {trashCount}
          </span>
        )}
      </button>

      {/* Page modal */}
      {pageModalOpen && activePageId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setPageModalOpen(false); }}
        >
          <div className="relative bg-background rounded-2xl shadow-2xl border border-border w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden mx-4">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
              <span className="text-sm font-medium text-muted-foreground">
                {activePageCollection?.name}
              </span>
              <div className="flex items-center gap-2">
                {activePage && activePage.type !== 'blank' && (
                  <span className="text-xs text-muted-foreground font-mono capitalize">{activePage.type}</span>
                )}
                {activePage && (() => {
                  const updated = new Date(activePage.updated_at);
                  const dateTimeStr = updated.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                  return (
                    <div title="Last Updated" className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-default">
                      <Clock size={12} />
                      <span>{dateTimeStr}</span>
                    </div>
                  );
                })()}
                {activePage && (
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
                )}
                <button
                  onClick={() => setPageModalOpen(false)}
                  className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <PageEditor hideChrome />
            </div>
          </div>
        </div>
      )}

      {/* Trash modal */}
      {trashModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setTrashModalOpen(false); }}
        >
          <div className="relative bg-background rounded-2xl shadow-2xl border border-border w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden mx-4">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Trash2 size={15} className="text-muted-foreground" />
                Trash
              </div>
              <button
                onClick={() => setTrashModalOpen(false)}
                className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <TrashContent />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
