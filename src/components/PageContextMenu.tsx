import { useState, useEffect, useRef } from 'react';
import { MoreHorizontal, MoveRight, ChevronRight, FolderOpen, Trash2 } from 'lucide-react';

interface Collection {
  id: string;
  name: string;
}

interface PageContextMenuProps {
  collections: Collection[];
  currentCollectionId?: string;
  onMove: (targetCollectionId: string) => void;
  onDelete: () => void;
  /** Position the dropdown: 'right' (default, opens left-aligned from button) or 'left' */
  align?: 'right' | 'left';
}

export default function PageContextMenu({
  collections,
  currentCollectionId,
  onMove,
  onDelete,
  align = 'right',
}: PageContextMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moveMenuOpen, setMoveMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setMoveMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const otherCollections = collections.filter((c) => c.id !== currentCollectionId);

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((o) => !o);
          setMoveMenuOpen(false);
        }}
        className="p-0.5 rounded hover:bg-sidebar-accent transition-all text-muted-foreground hover:text-foreground"
        title="Page options"
      >
        <MoreHorizontal size={13} />
      </button>

      {menuOpen && (
        <div
          className={`absolute top-6 z-50 w-40 bg-popover border border-border rounded-md shadow-lg py-1 text-sm animate-fade-in ${
            align === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          {/* Move to → */}
          <button
            className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-accent text-popover-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setMoveMenuOpen((o) => !o);
            }}
          >
            <MoveRight size={13} />
            Move to…
            <ChevronRight size={12} className="ml-auto" />
          </button>

          {moveMenuOpen && (
            <div className="border-t border-border mt-1 pt-1 max-h-48 overflow-y-auto">
              {otherCollections.length === 0 ? (
                <p className="px-3 py-1.5 text-xs text-muted-foreground">No other collections</p>
              ) : (
                otherCollections.map((col) => (
                  <button
                    key={col.id}
                    className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-accent text-popover-foreground truncate"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMove(col.id);
                      setMenuOpen(false);
                      setMoveMenuOpen(false);
                    }}
                  >
                    <FolderOpen size={12} className="shrink-0 text-primary/70" />
                    <span className="truncate">{col.name}</span>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Delete */}
          <button
            className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-destructive/10 text-destructive border-t border-border mt-1"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
              setMenuOpen(false);
            }}
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
