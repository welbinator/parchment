import { useSelectionStore } from '@/store/useSelectionStore';
import { useBlockStore } from '@/store/useBlockStore';
import { Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SelectionActionBarProps {
  pageId: string;
  allBlockIds: string[];
}

export default function SelectionActionBar({ pageId, allBlockIds }: SelectionActionBarProps) {
  const { selectionMode, selectedIds, exitSelectionMode, selectAll, clearSelection } = useSelectionStore();
  const { deleteBlock } = useBlockStore();

  if (!selectionMode) return null;

  const count = selectedIds.size;
  const allSelected = count === allBlockIds.length && allBlockIds.length > 0;
  const needsConfirm = count > 5;

  const handleDelete = async () => {
    const ids = Array.from(selectedIds);
    exitSelectionMode();
    // Delete sequentially to avoid hammering the DB
    for (const id of ids) {
      await deleteBlock(pageId, id);
    }
    toast(`Deleted ${ids.length} block${ids.length === 1 ? '' : 's'}`);
  };

  const DeleteButton = (
    <button
      className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
      disabled={count === 0}
      onClick={needsConfirm ? undefined : handleDelete}
    >
      <Trash2 size={14} />
      Delete{count > 0 ? ` ${count}` : ''}
    </button>
  );

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-popover border border-border rounded-xl shadow-2xl animate-fade-in"
      role="toolbar"
      aria-label="Selection actions"
    >
      {/* Cancel */}
      <button
        onClick={exitSelectionMode}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Exit selection mode"
      >
        <X size={16} />
      </button>

      {/* Count */}
      <span className="text-sm text-muted-foreground min-w-[4rem] text-center">
        {count === 0 ? 'None selected' : `${count} selected`}
      </span>

      {/* Select all / deselect all */}
      <button
        onClick={() => allSelected ? clearSelection() : selectAll(allBlockIds)}
        className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-accent transition-colors"
      >
        {allSelected ? 'Deselect all' : 'Select all'}
      </button>

      {/* Delete — confirm only if >5 blocks */}
      {needsConfirm ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>{DeleteButton}</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {count} blocks?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete {count} blocks. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete {count} blocks
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : DeleteButton}
    </div>
  );
}
