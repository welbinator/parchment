import { useCollectionStore } from '@/store/useCollectionStore';
import { useTrashStore } from '@/store/useTrashStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { RotateCcw, Trash2, Archive, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

// skipcq: JS-0067
export default function TrashContent() {
  const { collections } = useCollectionStore();
  const { activeWorkspaceId } = useWorkspaceStore();
  const {
    trashedPages,
    trashedCollections,
    restorePage,
    restoreCollection,
    permanentlyDeletePage,
    permanentlyDeleteCollection,
    emptyWorkspaceTrash,
  } = useTrashStore();

  // Scope trash to active workspace:
  // - Collections: filter by workspace_id directly
  // - Pages: filter by their parent collection's workspace_id
  //   (includes pages whose collection is also trashed — workspace_id is still set)
  const allTrashedCollections = trashedCollections();
  const allTrashedPages = trashedPages();

  // All collection ids in this workspace (active + trashed)
  const wsCollectionIds = new Set(
    collections.filter((c) => c.workspace_id === activeWorkspaceId).map((c) => c.id)
  );

  const deletedCollections = allTrashedCollections.filter((c) => c.workspace_id === activeWorkspaceId);
  const deletedPages = allTrashedPages.filter((p) => wsCollectionIds.has(p.collection_id));

  const isEmpty = deletedPages.length === 0 && deletedCollections.length === 0;

  const getDaysRemaining = (deletedAt: string) => {
    const daysElapsed = Math.floor((Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - daysElapsed);
  };

  const handleRestore = async (type: 'page' | 'collection', id: string, name: string) => {
    if (type === 'page') await restorePage(id);
    else await restoreCollection(id);
    toast.success(`"${name}" restored`);
  };

  const handlePermanentDelete = async (type: 'page' | 'collection', id: string, name: string) => {
    if (type === 'page') await permanentlyDeletePage(id);
    else await permanentlyDeleteCollection(id);
    toast.success(`"${name}" permanently deleted`);
  };

  const handleEmptyTrash = async () => {
    if (!activeWorkspaceId) return;
    await emptyWorkspaceTrash(activeWorkspaceId);
    toast.success('Trash emptied');
  };

  const getCollectionName = (collectionId: string) =>
    collections.find((c) => c.id === collectionId)?.name ?? 'Unknown';

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Warning banner */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs shrink-0">
        <AlertTriangle size={13} className="shrink-0" />
        <span>Items in trash are permanently deleted 30 days after being moved here.</span>
        {!isEmpty && (
          <button
            onClick={handleEmptyTrash}
            className="ml-auto text-xs text-destructive hover:text-destructive/80 transition-colors px-2 py-1 rounded hover:bg-destructive/10 whitespace-nowrap"
          >
            Empty Trash
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6">
          {isEmpty ? (
            <div className="text-center py-16 animate-fade-in">
              <Archive size={40} className="mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-base text-muted-foreground">Trash is empty</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Deleted pages and collections will appear here</p>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {deletedCollections.length > 0 && (
                <div>
                  <h2 className="text-sm font-medium text-muted-foreground mb-3">Collections</h2>
                  <div className="space-y-2">
                    {deletedCollections.map((col) => (
                      <div
                        key={col.id}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <span className="text-sm flex-1 truncate">{col.name}</span>
                        {col.deleted_at && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {getDaysRemaining(col.deleted_at) === 0
                              ? 'Deletes today'
                              : `${getDaysRemaining(col.deleted_at)}d left`}
                          </span>
                        )}
                        <button
                          onClick={() => handleRestore('collection', col.id, col.name)}
                          className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                          title="Restore"
                        >
                          <RotateCcw size={14} />
                        </button>
                        <button
                          onClick={() => handlePermanentDelete('collection', col.id, col.name)}
                          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete permanently"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {deletedPages.length > 0 && (
                <div>
                  <h2 className="text-sm font-medium text-muted-foreground mb-3">Pages</h2>
                  <div className="space-y-2">
                    {deletedPages.map((page) => (
                      <div
                        key={page.id}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-sm truncate block">{page.title}</span>
                          <span className="text-xs text-muted-foreground">
                            in {getCollectionName(page.collection_id)}
                          </span>
                        </div>
                        {page.deleted_at && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {getDaysRemaining(page.deleted_at) === 0
                              ? 'Deletes today'
                              : `${getDaysRemaining(page.deleted_at)}d left`}
                          </span>
                        )}
                        <button
                          onClick={() => handleRestore('page', page.id, page.title)}
                          className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                          title="Restore"
                        >
                          <RotateCcw size={14} />
                        </button>
                        <button
                          onClick={() => handlePermanentDelete('page', page.id, page.title)}
                          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete permanently"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
