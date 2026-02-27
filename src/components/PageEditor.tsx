import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import BlockItem from './BlockItem';
import UserMenu from './UserMenu';
import { Plus, PanelLeftOpen, Clock, FileText } from 'lucide-react';

export default function PageEditor() {
  const { pages, blocks, activePageId, updatePageTitle, addBlock, sidebarOpen, setSidebarOpen, undoDeleteBlock, lastDeletedBlock } = useAppStore();
  const page = pages.find((p) => p.id === activePageId && !p.deleted_at);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);

  // Ctrl+Z to undo block deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        const store = useAppStore.getState();
        if (store.lastDeletedBlock) {
          e.preventDefault();
          store.undoDeleteBlock();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const pageBlocks = useMemo(() => {
    if (!page) return [];
    return blocks.filter((b) => b.page_id === page.id).sort((a, b) => a.position - b.position);
  }, [blocks, page]);

  if (!page) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <FileText size={48} className="mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-lg text-muted-foreground">Select a page to get started</p>
          <p className="text-sm text-muted-foreground/60 mt-1">or create a new one from the sidebar</p>
        </div>
      </div>
    );
  }

  const handleAddBlock = () => {
    const lastBlock = pageBlocks[pageBlocks.length - 1];
    const newId = addBlock(page.id, lastBlock?.id ?? null);
    setFocusBlockId(newId);
  };

  const updated = new Date(page.updated_at);
  const timeStr = updated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-border shrink-0">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded hover:bg-accent text-muted-foreground transition-colors"
          >
            <PanelLeftOpen size={16} />
          </button>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock size={12} />
          <span>{timeStr}</span>
        </div>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground font-mono capitalize">{page.type}</span>
        <UserMenu />
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-12">
          <input
            value={page.title}
            onChange={(e) => updatePageTitle(page.id, e.target.value)}
            placeholder="Untitled"
            className="w-full text-4xl font-bold font-display bg-transparent outline-none text-foreground placeholder:text-muted-foreground/40 mb-8"
          />

          <div className="space-y-3">
            {pageBlocks.map((block, index) => {
              let listIndex = 0;
              if (block.type === 'numbered_list') {
                if (block.list_start) {
                  listIndex = 0;
                } else {
                  let start = index;
                  while (start > 0 && pageBlocks[start - 1].type === 'numbered_list' && !pageBlocks[start].list_start) start--;
                  listIndex = index - start;
                }
              }
              return (
                <BlockItem
                  key={block.id}
                  block={{
                    id: block.id,
                    type: block.type as any,
                    content: block.content,
                    checked: block.checked ?? undefined,
                    listStart: block.list_start ?? undefined,
                  }}
                  pageId={page.id}
                  listIndex={listIndex}
                  focusBlockId={focusBlockId}
                  onFocusHandled={() => setFocusBlockId(null)}
                  onNewBlock={(id) => setFocusBlockId(id)}
                />
              );
            })}
          </div>

          <button
            onClick={handleAddBlock}
            className="flex items-center gap-2 mt-4 px-2 py-2 text-sm text-muted-foreground/50 hover:text-muted-foreground rounded-md transition-colors"
          >
            <Plus size={14} />
            Add a block
          </button>
        </div>
      </div>
    </div>
  );
}
