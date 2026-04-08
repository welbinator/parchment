import { useCollectionStore } from '@/store/useCollectionStore';
import { usePageStore } from '@/store/usePageStore';
import { useAppStore } from '@/store/useAppStore';
import { AlertTriangle } from 'lucide-react';

interface Props {
  workspace: { id: string; name: string };
  onClose: () => void;
}

// skipcq: JS-0067
export default function DeleteWorkspaceModal({ workspace, onClose }: Props) {
  const { deleteWorkspace: deleteWorkspaceApp } = useAppStore();
  const { collections } = useCollectionStore();
  const { pages } = usePageStore();

  const wsCollections = collections.filter((c) => c.workspace_id === workspace.id && !c.deleted_at);
  const wsPages = pages.filter((p) => !p.deleted_at && wsCollections.some((c) => c.id === p.collection_id));

  const handleDelete = async () => {
    await deleteWorkspaceApp(workspace.id);
    onClose();
  };

  // skipcq: JS-0415
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
      <div className="bg-popover border border-border rounded-xl shadow-2xl w-full max-w-sm mx-4 p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-full bg-destructive/10 shrink-0">
            <AlertTriangle size={18} className="text-destructive" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Delete &quot;{workspace.name}&quot;?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              This will move{' '}
              <span className="text-foreground font-medium">{wsCollections.length} collection{wsCollections.length !== 1 ? 's' : ''}</span>
              {' '}and{' '}
              <span className="text-foreground font-medium">{wsPages.length} page{wsPages.length !== 1 ? 's' : ''}</span>
              {' '}to Trash. They can be recovered.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm rounded-lg border border-border text-muted-foreground hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-1.5 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
          >
            Delete workspace
          </button>
        </div>
      </div>
    </div>
  );
}
