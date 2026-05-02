import { useState, useEffect, useRef } from 'react';
import { MoreHorizontal, Archive } from 'lucide-react';
import type { DbWorkspace } from '@/store/useWorkspaceStore';
import ContextMenuDropdown from './ContextMenuDropdown';

interface Props {
  collectionId: string;
  workspaces: DbWorkspace[];
  activeWorkspaceId: string | null;
  onDelete: () => void;
  onMoveToWorkspace: (workspaceId: string) => void;
  /** Icon size for the trigger button — defaults to 14 */
  iconSize?: number;
  /** Extra classes for the trigger button */
  triggerClassName?: string;
}

// skipcq: JS-0067
export default function CollectionContextMenu({
  workspaces,
  activeWorkspaceId,
  onDelete,
  onMoveToWorkspace,
  iconSize = 14,
  triggerClassName = 'p-0.5 rounded hover:bg-sidebar-accent',
}: Readonly<Props>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moveMenuOpen, setMoveMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const otherWorkspaces = workspaces
    .filter((w) => !w.deleted_at && w.id !== activeWorkspaceId)
    .sort((a, b) => a.position - b.position);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setMoveMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => { document.removeEventListener('mousedown', handler); }; // skipcq: JS-0045
  }, [menuOpen]);

  const moveTargets = otherWorkspaces.map((ws) => ({
    id: ws.id,
    name: ws.name,
    icon: <Archive size={12} className="shrink-0 text-primary/70" />,
  }));

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); setMoveMenuOpen(false); }}
        className={triggerClassName}
        title="More options"
      >
        <MoreHorizontal size={iconSize} />
      </button>
      {menuOpen && (
        <ContextMenuDropdown
          moveTargets={moveTargets}
          moveMenuOpen={moveMenuOpen}
          onToggleMoveMenu={(e) => { e.stopPropagation(); setMoveMenuOpen((o) => !o); }}
          onMove={(wsId) => { onMoveToWorkspace(wsId); setMenuOpen(false); setMoveMenuOpen(false); }}
          onDelete={(e) => { e.stopPropagation(); onDelete(); setMenuOpen(false); }}
          emptyMoveLabel="No other workspaces"
          className="absolute right-0 top-6 z-50 w-44"
        />
      )}
    </div>
  );
}
