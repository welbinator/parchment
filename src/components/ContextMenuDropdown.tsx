/**
 * ContextMenuDropdown — shared dropdown panel used by PageContextMenu,
 * CollectionContextMenu, and the inline page menu in AppSidebar.
 *
 * Renders a "Move to…" item with a flyout sub-list, plus a "Delete" item.
 */

import { MoveRight, ChevronRight, Trash2 } from 'lucide-react';

export interface MoveTarget {
  id: string;
  name: string;
  /** Optional icon rendered before the name */
  icon?: React.ReactNode;
}

interface Props {
  moveTargets: MoveTarget[];
  moveMenuOpen: boolean;
  onToggleMoveMenu: (e: React.MouseEvent) => void;
  onMove: (targetId: string, e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  /** Extra message shown when there are no move targets */
  emptyMoveLabel?: string;
  className?: string;
}

export default function ContextMenuDropdown({
  moveTargets,
  moveMenuOpen,
  onToggleMoveMenu,
  onMove,
  onDelete,
  emptyMoveLabel = 'No other destinations',
  className = '',
}: Readonly<Props>) {
  return (
    <div className={`bg-popover border border-border rounded-md shadow-lg py-1 text-sm animate-fade-in ${className}`}>
      {/* Move to → */}
      <button
        className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-accent text-popover-foreground"
        onClick={onToggleMoveMenu}
      >
        <MoveRight size={13} />
        Move to…
        <ChevronRight size={12} className="ml-auto" />
      </button>

      {moveMenuOpen && (
        <div className="border-t border-border mt-1 pt-1 max-h-48 overflow-y-auto">
          {moveTargets.length === 0 ? (
            <p className="px-3 py-1.5 text-xs text-muted-foreground">{emptyMoveLabel}</p>
          ) : (
            moveTargets.map((target) => (
              <button
                key={target.id}
                className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-accent text-popover-foreground truncate"
                onClick={(e) => { e.stopPropagation(); onMove(target.id, e); }}
              >
                {target.icon}
                <span className="truncate">{target.name}</span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Delete */}
      <button
        className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-destructive/10 text-destructive border-t border-border mt-1"
        onClick={onDelete}
      >
        <Trash2 size={13} />
        Delete
      </button>
    </div>
  );
}
