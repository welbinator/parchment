import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { usePageStore } from '@/store/usePageStore';
import { useCollectionStore } from '@/store/useCollectionStore';
import { useTrashStore } from '@/store/useTrashStore';
import PageEditor from '@/components/PageEditor';
import TrashContent from '@/components/TrashContent';
import PageContextMenu from '@/components/PageContextMenu';
import { Plus, X, File, FileText, Map, CheckSquare, Trash2 } from 'lucide-react';
import type { PageType } from '@/types';

const pageTypeIcons: Record<string, React.ReactNode> = {
  blank: <File size={13} />,
  notes: <FileText size={13} />,
  roadmap: <Map size={13} />,
  checklist: <CheckSquare size={13} />,
};

export default function KanbanView() {
  const { activePageId, setActivePage, addPage, addCollection, deletePage } = useAppStore();
  const { pages, movePage } = usePageStore();
  const { collections, renameCollection, deleteCollection } = useCollectionStore();
  const { trashedPages, trashedCollections } = useTrashStore();

  const [pageModalOpen, setPageModalOpen] = useState(false);
  const [trashModalOpen, setTrashModalOpen] = useState(false);
  const [showNewPageMenu, setShowNewPageMenu] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const activeCollections = collections
    .filter((c) => !c.deleted_at)
    .sort((a, b) => a.position - b.position);

  const activePages = pages.filter((p) => !p.deleted_at);
  const deletedPages = trashedPages();
  const trashCount = deletedPages.length + trashedCollections().length;

  const handleAddCollection = async () => {
    await addCollection('New Collection');
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

  const activePageCollection = collections.find(
    (c) => c.id === pages.find((p) => p.id === activePageId)?.collection_id
  );

  return (
    <>
      {/* Trello-style horizontal scroll board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden bg-background">
        <div className="flex flex-row gap-4 p-6 pb-20 h-full items-start" style={{ minWidth: 'max-content' }}>
          {activeCollections.map((collection) => {
            const collectionPages = activePages.filter((p) => p.collection_id === collection.id);
            const isRenaming = renamingId === collection.id;

            return (
              <div key={collection.id} className="w-72 shrink-0">
                <div className="bg-sidebar rounded-xl border border-sidebar-border shadow-sm flex flex-col">
                  {/* Header */}
                  <div className="group/header flex items-center gap-1.5 px-3 py-2.5 border-b border-sidebar-border">
                    {isRenaming ? (
                      <input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={handleRenameKey}
                        className="flex-1 text-sm font-semibold bg-background border border-primary/50 rounded px-1.5 py-0.5 outline-none text-sidebar-foreground"
                      />
                    ) : (
                      <button
                        className="flex-1 text-left font-semibold text-sm text-sidebar-foreground truncate hover:text-primary transition-colors"
                        onDoubleClick={() => startRename(collection.id, collection.name)}
                        title="Double-click to rename"
                      >
                        {collection.name}
                      </button>
                    )}
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">
                      {collectionPages.length}
                    </span>
                    <button
                      onClick={() => deleteCollection(collection.id)}
                      className="opacity-0 group-hover/header:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground shrink-0"
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
                          onClick={() => openPage(page.id)}
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
                            onMove={(targetId) => movePage(page.id, targetId)}
                            onDelete={() => deletePage(page.id)}
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
                            onClick={() => handleAddPage(collection.id, type)}
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
              </div>
            );
          })}
        </div>
      </div>

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
        Manage Trash
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
              <button
                onClick={() => setPageModalOpen(false)}
                className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
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
            <div className="flex-1 overflow-hidden">
              <TrashContent />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
