import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import BlockItem from './BlockItem';
import GroupBlock from './GroupBlock';
import UserMenu from './UserMenu';
import ShareButton from './ShareButton';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { Plus, PanelLeftOpen, Clock, FileText } from 'lucide-react';

export default function PageEditor() {
  const { pages, blocks, activePageId, updatePageTitle, updatePageSharing, addBlock, sidebarOpen, setSidebarOpen, undoDeleteBlock, lastDeletedBlock } = useAppStore();
  const page = pages.find((p) => p.id === activePageId && !p.deleted_at);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const groupBlocksEnabled = useFeatureFlag('group-blocks');
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize the title textarea to fit its content
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [page?.title]);

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
    // Top-level blocks only (no group children) — children are rendered inside GroupBlock
    return blocks
      .filter((b) => b.page_id === page.id && !b.group_id)
      .sort((a, b) => a.position - b.position);
  }, [blocks, page]);

  const allPageBlocks = useMemo(() => {
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
        <ShareButton
          pageId={page.id}
          shareSettings={{
            share_enabled: page.share_enabled ?? false,
            share_mode: page.share_mode ?? 'public',
            share_token: page.share_token ?? null,
            shared_with_emails: page.shared_with_emails ?? [],
          }}
          onUpdate={(updates) => updatePageSharing(page.id, updates)}
        />
        <UserMenu />
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-12">
          <textarea
            ref={titleRef}
            value={page.title}
            onChange={(e) => updatePageTitle(page.id, e.target.value)}
            placeholder="Untitled"
            rows={1}
            className="w-full text-4xl font-bold font-display bg-transparent outline-none text-foreground placeholder:text-muted-foreground/40 mb-8 resize-none overflow-hidden leading-tight"
          />

          <div className="space-y-3">
            {pageBlocks.map((block, index) => {
              // Render group blocks via GroupBlock component
              if (block.type === 'group' && groupBlocksEnabled) {
                const childBlocks = allPageBlocks.filter((b) => b.group_id === block.id);
                return (
                  <GroupBlock
                    key={block.id}
                    block={block as any}
                    pageId={page.id}
                    childBlocks={childBlocks as any}
                    groupBlocksEnabled={groupBlocksEnabled}
                  />
                );
              }

              let listIndex = 0;
              if (block.type === 'numbered_list') {
                if (block.list_start) {
                  listIndex = 0;
                } else {
                  let start = index;
                  const thisLevel = block.indent_level ?? 0;
                  while (
                    start > 0 &&
                    pageBlocks[start - 1].type === 'numbered_list' &&
                    !pageBlocks[start].list_start &&
                    (pageBlocks[start - 1].indent_level ?? 0) === thisLevel
                  ) start--;
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
                    indentLevel: (() => { const v = block.indent_level ?? 0; if (block.type === 'numbered_list' || block.type === 'bullet_list') console.log('[PageEditor passing indentLevel]', block.id.slice(0,8), v); return v; })(),
                  }}
                  pageId={page.id}
                  listIndex={listIndex}
                  focusBlockId={focusBlockId}
                  onFocusHandled={() => setFocusBlockId(null)}
                  onNewBlock={(id) => setFocusBlockId(id)}
                  groupBlocksEnabled={groupBlocksEnabled}
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
