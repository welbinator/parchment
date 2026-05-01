import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, FolderOpen } from 'lucide-react';
import ContextMenuDropdown from './ContextMenuDropdown';

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

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.right - 160 });
    setMenuOpen(true);
    setMoveMenuOpen(false);
  };

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

  useEffect(() => {
    if (!menuOpen) return;
    const handler = () => { setMenuOpen(false); setMoveMenuOpen(false); };
    window.addEventListener('scroll', handler, true);
    return () => window.removeEventListener('scroll', handler, true);
  }, [menuOpen]);

  const otherCollections = collections.filter((c) => c.id !== currentCollectionId);
  const moveTargets = otherCollections.map((col) => ({
    id: col.id,
    name: col.name,
    icon: <FolderOpen size={12} className="shrink-0 text-primary/70" />,
  }));

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
        >
          <ContextMenuDropdown
            moveTargets={moveTargets}
            moveMenuOpen={moveMenuOpen}
            onToggleMoveMenu={(e) => { e.stopPropagation(); setMoveMenuOpen((o) => !o); }}
            onMove={(colId) => { onMove(colId); setMenuOpen(false); setMoveMenuOpen(false); }}
            onDelete={(e) => { e.stopPropagation(); onDelete(); setMenuOpen(false); }}
            emptyMoveLabel="No other collections"
          />
        </div>,
        document.body
      )}
    </>
  );
}
