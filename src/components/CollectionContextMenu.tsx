import { useState, useEffect, useRef } from 'react';
import { MoreHorizontal, MoveRight, ChevronRight, Archive, Trash2 } from 'lucide-react';
import type { DbWorkspace } from '@/store/useWorkspaceStore';

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
        <div className="absolute right-0 top-6 z-50 w-44 bg-popover border border-border rounded-md shadow-lg py-1 text-sm animate-fade-in">
          {otherWorkspaces.length > 0 && (
            <>
              <button
                className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-accent text-popover-foreground"
                onClick={(e) => { e.stopPropagation(); setMoveMenuOpen((o) => !o); }}
              >
                <MoveRight size={13} />
                Move to…
                <ChevronRight size={12} className="ml-auto" />
              </button>
              {moveMenuOpen && (
                <div className="border-t border-border mt-1 pt-1">
                  {otherWorkspaces.map((ws) => (
                    <button
                      key={ws.id}
                      className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-accent text-popover-foreground truncate"
                      onClick={(e) => { e.stopPropagation(); onMoveToWorkspace(ws.id); setMenuOpen(false); setMoveMenuOpen(false); }}
                    >
                      <Archive size={12} className="shrink-0 text-primary/70" />
                      <span className="truncate">{ws.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          <button
            className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-destructive/10 text-destructive border-t border-border mt-1"
            onClick={(e) => { e.stopPropagation(); onDelete(); setMenuOpen(false); }}
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
