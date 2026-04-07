import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useBlockStore } from '@/store/useBlockStore';
import { usePageStore } from '@/store/usePageStore';
import { useSelectionStore } from '@/store/useSelectionStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import BlockItem from './BlockItem';
import GroupBlock from './GroupBlock';
import UserMenu from './UserMenu';
import ShareButton from './ShareButton';
import SelectionActionBar from './SelectionActionBar';
import EditorErrorBoundary from './EditorErrorBoundary';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { Plus, PanelLeftOpen, Clock, FileText, ChevronDown } from 'lucide-react';


export default function PageEditor({ hideChrome = false }: { hideChrome?: boolean }) {
  const { activePageId, sidebarOpen, setSidebarOpen } = useAppStore();
  const { workspaces, activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId && !w.deleted_at) ?? null;
  const activeWorkspaces = workspaces.filter((w) => !w.deleted_at).sort((a, b) => a.position - b.position);
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const { blocks, addBlock, undoDeleteBlock, lastDeletedBlock } = useBlockStore();
  const { pages, updatePageTitle, updatePageSharing } = usePageStore();
  const { exitSelectionMode } = useSelectionStore();
  const page = pages.find((p) => p.id === activePageId && !p.deleted_at);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const groupBlocksEnabled = useFeatureFlag('group-blocks');
  const titleRef = useRef<HTMLDivElement>(null);

  // Close workspace dropdown on outside click
  useEffect(() => {
    if (!workspaceDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      setWorkspaceDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [workspaceDropdownOpen]);

  // Keep contentEditable div in sync when page changes
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    if (el.textContent !== (page?.title ?? '')) {
      el.textContent = page?.title ?? '';
    }
  }, [page?.title, activePageId]);

  // Exit selection mode when switching pages
  useEffect(() => {
    exitSelectionMode();
  }, [activePageId, exitSelectionMode]);

  // Ctrl+Z to undo block deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        const blockState = useBlockStore.getState();
        if (blockState.lastDeletedBlock) {
          e.preventDefault();
          blockState.undoDeleteBlock();
        }
      }
      // Escape — clear selection
      if (e.key === 'Escape') {
        const { selectionMode, clearSelection, exitSelectionMode } = useSelectionStore.getState();
        if (selectionMode) {
          e.preventDefault();
          exitSelectionMode();
        }
      }

      // Ctrl+A — toggle select/deselect all blocks on the page
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        // Don't intercept when the user is editing text in a contentEditable block
        const active = document.activeElement;
        const isEditing = active && (
          (active as HTMLElement).isContentEditable ||
          active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA'
        );
        if (isEditing) return;

        const ids = useBlockStore.getState().blocks
          .filter((b) => b.page_id === activePageId && !b.group_id)
          .sort((a, b) => a.position - b.position)
          .map((b) => b.id);
        if (ids.length > 0) {
          e.preventDefault();
          const { selectionMode, selectedIds, enterSelectionMode, selectAll, exitSelectionMode } = useSelectionStore.getState();
          // If all blocks are already selected, deselect all
          if (selectionMode && selectedIds.size === ids.length && ids.every((id) => selectedIds.has(id))) {
            exitSelectionMode();
          } else {
            enterSelectionMode();
            selectAll(ids);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePageId]);

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
  const dateTimeStr = updated.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Top bar */}
      {!hideChrome && (
      <div className="flex items-center gap-2 px-4 h-14 border-b border-border shrink-0">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded hover:bg-accent text-muted-foreground transition-colors"
          >
            <PanelLeftOpen size={16} />
          </button>
        )}
        {/* Workspace name — desktop only */}
        {activeWorkspace && (
          <div className="relative hidden sm:block">
            <button
              onClick={() => setWorkspaceDropdownOpen((v) => !v)}
              className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              {activeWorkspace.name}
              {activeWorkspaces.length > 1 && <ChevronDown size={12} className="text-muted-foreground" />}
            </button>
            {workspaceDropdownOpen && activeWorkspaces.length > 1 && (
              <div className="absolute left-0 top-7 w-44 bg-popover border border-border rounded-lg shadow-lg py-1 z-50 animate-fade-in">
                {activeWorkspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => { setActiveWorkspace(ws.id); setWorkspaceDropdownOpen(false); }}
                    className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm transition-colors hover:bg-accent ${
                      ws.id === activeWorkspaceId ? 'text-primary font-medium' : 'text-foreground'
                    }`}
                  >
                    {ws.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex-1" />
        {page.type !== 'blank' && (
          <span className="text-xs text-muted-foreground font-mono capitalize">{page.type}</span>
        )}
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
      )}

      {/* Editor area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-12">
          {/* Date/time above title */}
          <div title="Last Updated" className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-default mb-3">
            <Clock size={11} />
            <span>{dateTimeStr}</span>
          </div>
          <div
            ref={titleRef}
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => updatePageTitle(page.id, (e.target as HTMLDivElement).textContent ?? '')}
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
            data-placeholder="Untitled"
            className="w-full text-4xl font-bold font-display bg-transparent outline-none text-foreground mb-8 leading-tight empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/40"
          />

          <div className="space-y-3">
            {pageBlocks.map((block, index) => {
              // Render group blocks via GroupBlock component
              if (block.type === 'group' && groupBlocksEnabled) {
                const childBlocks = allPageBlocks.filter((b) => b.group_id === block.id);
                return (
                  <EditorErrorBoundary key={block.id} label="group block">
                    <GroupBlock
                      block={block as any /* eslint-disable-line @typescript-eslint/no-explicit-any */}
                      pageId={page.id}
                      childBlocks={childBlocks as any /* eslint-disable-line @typescript-eslint/no-explicit-any */}
                      groupBlocksEnabled={groupBlocksEnabled}
                    />
                  </EditorErrorBoundary>
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

              const allPageBlockIds = pageBlocks.map((b) => b.id);

              return (
                <EditorErrorBoundary key={block.id} label="block">
                  <BlockItem
                    block={{
                      id: block.id,
                      type: block.type as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                      content: block.content,
                      checked: block.checked ?? undefined,
                      listStart: block.list_start ?? undefined,
                      indentLevel: block.indent_level ?? 0,
                    }}
                    pageId={page.id}
                    listIndex={listIndex}
                    focusBlockId={focusBlockId}
                    onFocusHandled={() => setFocusBlockId(null)}
                    onNewBlock={(id) => setFocusBlockId(id)}
                    groupBlocksEnabled={groupBlocksEnabled}
                    allPageBlockIds={allPageBlockIds}
                  />
                </EditorErrorBoundary>
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

      {/* Floating selection action bar */}
      <SelectionActionBar
        pageId={page.id}
        allBlockIds={pageBlocks.map((b) => b.id)}
      />
    </div>
  );
}
