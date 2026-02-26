import { useState, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import BlockItem from './BlockItem';
import { Plus, PanelLeftOpen, Clock, FileText } from 'lucide-react';

export default function PageEditor() {
  const { pages, activePageId, updatePageTitle, addBlock, sidebarOpen, setSidebarOpen } = useAppStore();
  const page = pages.find((p) => p.id === activePageId);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

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
    const lastBlock = page.blocks[page.blocks.length - 1];
    const newId = addBlock(page.id, lastBlock?.id ?? null);
    setFocusBlockId(newId);
  };

  const updated = new Date(page.updatedAt);
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
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-12">
          {/* Page title */}
          <input
            ref={titleRef}
            value={page.title}
            onChange={(e) => updatePageTitle(page.id, e.target.value)}
            placeholder="Untitled"
            className="w-full text-4xl font-bold font-display bg-transparent outline-none text-foreground placeholder:text-muted-foreground/40 mb-8"
          />

          {/* Blocks */}
          <div className="space-y-1">
            {page.blocks.map((block, index) => {
              // Calculate numbered list index, resetting at listStart or non-numbered blocks
              let listIndex = 0;
              if (block.type === 'numbered_list') {
                let count = 0;
                for (let i = index - 1; i >= 0; i--) {
                  if (page.blocks[i].type !== 'numbered_list' || page.blocks[i + 1]?.listStart) break;
                  count++;
                }
                // Check if current block itself is a listStart
                if (block.listStart) {
                  listIndex = 0;
                } else {
                  let start = index;
                  while (start > 0 && page.blocks[start - 1].type === 'numbered_list' && !page.blocks[start].listStart) start--;
                  listIndex = index - start;
                }
              }
              return (
                <BlockItem
                  key={block.id}
                  block={block}
                  pageId={page.id}
                  listIndex={listIndex}
                  focusBlockId={focusBlockId}
                  onFocusHandled={() => setFocusBlockId(null)}
                  onNewBlock={(id) => setFocusBlockId(id)}
                />
              );
            })}
          </div>

          {/* Add block button */}
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
