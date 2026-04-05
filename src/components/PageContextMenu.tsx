import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
}

export default function PageContextMenu({
  collections,
  currentCollectionId,
  onMove,
  onDelete,
}: PageContextMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moveMenuOpen, setMoveMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Position the portal menu relative to the trigger button
  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.right - 160 });
    setMenuOpen(true);
    setMoveMenuOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
        setMoveMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Close on scroll (reposition would be complex — just close)
  useEffect(() => {
    if (!menuOpen) return;
    const handler = () => { setMenuOpen(false); setMoveMenuOpen(false); };
    window.addEventListener('scroll', handler, true);
    return () => window.removeEventListener('scroll', handler, true);
  }, [menuOpen]);

  const otherCollections = collections.filter((c) => c.id !== currentCollectionId);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={openMenu}
        className="p-0.5 rounded hover:bg-sidebar-accent transition-all text-muted-foreground hover:text-foreground"
        title="Page options"
      >
        <MoreHorizontal size={13} />
      </button>

      {menuOpen && menuPos && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999, width: 160 }}
          className="bg-popover border border-border rounded-md shadow-lg py-1 text-sm animate-fade-in"
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
        </div>,
        document.body
      )}
    </>
  );
}
