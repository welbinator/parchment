import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { usePageStore } from '@/store/usePageStore';
import { useCollectionStore } from '@/store/useCollectionStore';
import { useTrashStore } from '@/store/useTrashStore';
import PageEditor from '@/components/PageEditor';
import TrashContent from '@/components/TrashContent';
import { Plus, X, File, FileText, Map, CheckSquare, Trash2 } from 'lucide-react';
import type { PageType } from '@/types';

const pageTypeIcons: Record<string, React.ReactNode> = {
  blank: <File size={13} />,
  notes: <FileText size={13} />,
  roadmap: <Map size={13} />,
  checklist: <CheckSquare size={13} />,
};

export default function KanbanView() {
  const { activePageId, setActivePage, addPage, addCollection } = useAppStore();
  const { pages } = usePageStore();
  const { collections, renameCollection } = useCollectionStore();
  const { trashedPages, trashedCollections } = useTrashStore();

  const [pageModalOpen, setPageModalOpen] = useState(false);
  const [trashModalOpen, setTrashModalOpen] = useState(false);
  const [showNewPageMenu, setShowNewPageMenu] = useState<string | null>(null);
  // collection rename: id of collection being renamed
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const activeCollections = collections.filter((c) => !c.deleted_at);
  const activePages = pages.filter((p) => !p.deleted_at);
  const trashCount = trashedPages().length + trashedCollections().length;

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

  const handleAddCollection = async () => {
    await addCollection('New Collection');
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
      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden bg-background">
        <div className="flex gap-4 p-6 h-full items-start min-w-max pb-24">

          {/* Collection cards */}
          {activeCollections.map((collection) => {
            const collectionPages = activePages.filter((p) => p.collection_id === collection.id);
            const isRenaming = renamingId === collection.id;

            return (
              <div
                key={collection.id}
                className="flex flex-col w-64 shrink-0 bg-sidebar rounded-xl border border-sidebar-border shadow-sm"
              >
                {/* Column header */}
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-sidebar-border">
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
                </div>

                {/* Pages */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[calc(100vh-220px)]">
                  {collectionPages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => openPage(page.id)}
                      className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm transition-colors border ${
                        activePageId === page.id
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : 'bg-background border-border hover:border-primary/30 hover:bg-primary/5 text-foreground'
                      }`}
                    >
                      <span className="text-muted-foreground shrink-0">
                        {pageTypeIcons[page.type] || pageTypeIcons.blank}
                      </span>
                      <span className="truncate">{page.title || 'Untitled'}</span>
                    </button>
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
            );
          })}

          {/* Trash card */}
          <div className="flex flex-col w-64 shrink-0 bg-sidebar rounded-xl border border-sidebar-border shadow-sm opacity-70 hover:opacity-100 transition-opacity">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-sidebar-border">
              <span className="flex items-center gap-1.5 font-semibold text-sm text-muted-foreground">
                <Trash2 size={13} />
                Trash
              </span>
              {trashCount > 0 && (
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">
                  {trashCount}
                </span>
              )}
            </div>
            <div className="p-2">
              <button
                onClick={() => setTrashModalOpen(true)}
                className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
              >
                View trash
              </button>
            </div>
          </div>

          {/* Add collection card */}
          <button
            onClick={handleAddCollection}
            className="flex items-center gap-2 w-64 shrink-0 px-4 py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors text-sm font-medium"
          >
            <Plus size={15} />
            Add collection
          </button>

        </div>
      </div>

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
