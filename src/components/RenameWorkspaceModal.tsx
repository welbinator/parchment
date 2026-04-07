import { useState } from 'react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

interface Props {
  workspace: { id: string; name: string };
  onClose: () => void;
}

// skipcq: JS-0067
export default function RenameWorkspaceModal({ workspace, onClose }: Props) {
  const [name, setName] = useState(workspace.name);
  const { renameWorkspace } = useWorkspaceStore();

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === workspace.name) { onClose(); return; }
    await renameWorkspace(workspace.id, trimmed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
      <div className="bg-popover border border-border rounded-xl shadow-2xl w-full max-w-sm mx-4 p-5">
        <h2 className="text-base font-semibold text-foreground mb-4">Rename Workspace</h2>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
          className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary mb-4"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm rounded-lg border border-border text-muted-foreground hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
