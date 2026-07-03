import { useState } from 'react';
import { Zap } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useCollectionStore } from '@/store/useCollectionStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

interface QuickNoteButtonProps {
  /** Called with the new page ID after creation — lets the parent open an editor modal */
  onCreated?: (pageId: string) => void;
}

/**
 * QuickNoteButton — floating lightning bolt in the bottom-right corner.
 * Creates a new blank page inside the active workspace's "Quick Notes"
 * system collection and navigates to it immediately.
 */

// skipcq: JS-0067
export default function QuickNoteButton({ onCreated }: Readonly<QuickNoteButtonProps> = {}) {
  const { addPage } = useAppStore();
  const { collections } = useCollectionStore();
  const { activeWorkspaceId } = useWorkspaceStore();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading || !activeWorkspaceId) return;

    // Find the Quick Notes system collection for the active workspace
    const quickNotesCollection = collections.find(
      (c) => c.is_system && c.workspace_id === activeWorkspaceId && !c.deleted_at
    );

    if (!quickNotesCollection) return;

    setLoading(true);
    try {
      const pageId = await addPage(quickNotesCollection.id, 'blank');
      if (pageId && onCreated) onCreated(pageId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={() => { void handleClick(); }}
      disabled={loading}
      title="Quick Note"
      aria-label="Create a quick note"
      className={`
        fixed bottom-24 right-6 z-40
        w-14 h-14 rounded-full
        bg-primary text-white shadow-lg
        flex items-center justify-center
        hover:bg-primary/90 hover:scale-105 active:scale-95
        transition-all duration-150
        disabled:opacity-60 disabled:cursor-not-allowed
      `}
    >
      <Zap size={22} fill="currentColor" strokeWidth={0} />
    </button>
  );
}
