import { useRef, useCallback } from 'react';
import { useBlockStore } from '@/store/useBlockStore';
import { useSelectionStore } from '@/store/useSelectionStore';
import type { Block, BlockType } from '@/types';
import FloatingToolbar from './FloatingToolbar';
import { GripVertical, Trash2, Group } from 'lucide-react';
import { blockStyles, toRoman } from '@/utils/blockContent';
import { useSlashCommand } from '@/hooks/useSlashCommand';
import { useListIndent } from '@/hooks/useListIndent';
import { useBlockEditor } from '@/hooks/useBlockEditor';

interface BlockItemProps {
  block: Block;
  pageId: string;
  listIndex: number;
  focusBlockId: string | null;
  onFocusHandled: () => void;
  onNewBlock: (newBlockId: string) => void;
  groupId?: string | null;
  groupBlocksEnabled?: boolean;
  allPageBlockIds?: string[];
}

export default function BlockItem({ block, pageId, listIndex, focusBlockId, onFocusHandled, onNewBlock, groupId = null, groupBlocksEnabled = false, allPageBlockIds = [] }: BlockItemProps) {
  const { changeBlockType, updateBlock } = useBlockStore();
  const { selectionMode, selectedIds, shiftAnchorId, enterSelectionMode, toggleBlock } = useSelectionStore();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const indentLevel = block.indentLevel ?? 0;
  const isSelected = selectedIds.has(block.id);

  const handleSlashSelect = useCallback((type: BlockType) => {
    slashCommand.closeSlashMenu();
    if (contentRef.current) contentRef.current.innerHTML = '';
    changeBlockType(pageId, block.id, type);
    updateBlock(pageId, block.id, { content: '', listStart: type === 'numbered_list' ? true : undefined });
    if (type !== 'group') {
      setTimeout(() => contentRef.current?.focus(), 0);
    }
  }, [changeBlockType, updateBlock, pageId, block.id]);

  const slashCommand = useSlashCommand({
    groupBlocksEnabled,
    onSelect: handleSlashSelect,
    getTextContent: () => contentRef.current?.innerText ?? '',
  });

  const {
    handleInput,
    handleKeyDown,
    handleBlur,
    handleClick,
    handleToolbarChange,
    handleDeleteBlock,
  } = useBlockEditor({
    block,
    pageId,
    focusBlockId,
    onFocusHandled,
    onNewBlock,
    groupId,
    onSlashKeyDown: slashCommand.handleSlashKeyDown,
    checkSlashTrigger: slashCommand.checkSlashTrigger,
    closeSlashMenu: slashCommand.closeSlashMenu,
    showSlashMenu: slashCommand.showSlashMenu,
    contentRef,
  });

  useListIndent({
    contentRef,
    blockType: block.type,
    indentLevel,
    blockId: block.id,
    pageId,
  });

  // --- Divider ---
  if (block.type === 'divider') {
    return (
      <div className="group flex items-center py-2">
        <div className="flex-1 border-t border-border" />
        <button
          onClick={handleDeleteBlock}
          className="ml-2 p-0.5 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
        >
          <Trash2 size={12} />
        </button>
      </div>
    );
  }

  // --- Group fallback ---
  if (block.type === 'group') {
    return (
      <div className="group flex items-center gap-2 py-2 px-3 rounded border border-dashed border-border text-xs text-muted-foreground">
        <Group size={12} />
        <span>Group block (enable the group-blocks flag to use)</span>
        <button
          onClick={handleDeleteBlock}
          className="ml-auto p-0.5 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
        >
          <Trash2 size={12} />
        </button>
      </div>
    );
  }

  const showToolbar = block.type !== 'code';

  return (
    <div
      ref={wrapperRef}
      className={`group flex items-start gap-1 relative rounded-md transition-colors ${
        isSelected ? 'bg-primary/10 ring-1 ring-primary/30' : ''
      }`}
      style={indentLevel > 0 ? { paddingLeft: `${indentLevel * 1.5}rem` } : undefined}
    >
      {/* Selection checkbox */}
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          if (!selectionMode) enterSelectionMode();
          toggleBlock(block.id, allPageBlockIds, e.shiftKey ? shiftAnchorId : null);
        }}
        aria-label={isSelected ? 'Deselect block' : 'Select block'}
        className={`flex-shrink-0 mt-1 w-4 h-4 rounded border transition-all
          ${selectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground hover:border-primary bg-background'}`}
      >
        {isSelected && (
          <svg viewBox="0 0 14 14" className="w-full h-full text-primary-foreground">
            <path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        )}
      </button>

      {/* Block handle */}
      <div className="flex items-center gap-0.5 pt-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button className="p-0.5 text-muted-foreground hover:text-foreground cursor-grab">
          <GripVertical size={14} />
        </button>
      </div>

      {/* Todo checkbox */}
      {block.type === 'todo' && (
        <button
          onClick={() => updateBlock(pageId, block.id, { checked: !block.checked })}
          className={`mt-1 shrink-0 w-4 h-4 rounded border transition-colors ${
            block.checked ? 'bg-primary border-primary' : 'border-muted-foreground hover:border-primary'
          }`}
        >
          {block.checked && (
            <svg viewBox="0 0 14 14" className="w-full h-full text-primary-foreground">
              <path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          )}
        </button>
      )}

      {/* Numbered list index */}
      {block.type === 'numbered_list' && (
        <span className="mt-0.5 text-sm text-muted-foreground shrink-0 w-5 text-right pr-1">
          {indentLevel >= 2
            ? `${toRoman(listIndex + 1)}.`
            : indentLevel === 1
            ? `${String.fromCharCode(97 + (listIndex % 26))}.`
            : `${listIndex + 1}.`}
        </span>
      )}

      {/* Content */}
      <div
        ref={contentRef}
        contentEditable={!selectionMode}
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onClick={(e) => {
          if (selectionMode) {
            e.preventDefault();
            toggleBlock(block.id, allPageBlockIds, e.shiftKey ? shiftAnchorId : null);
            return;
          }
          handleClick(e);
        }}
        data-placeholder={block.type === 'heading1' ? 'Heading 1' : block.type === 'heading2' ? 'Heading 2' : block.type === 'heading3' ? 'Heading 3' : "Type '/' for commands..."}
        className={`flex-1 outline-none min-h-[1.5em] empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50 ${
          blockStyles[block.type] || blockStyles.text
        } ${block.checked ? 'line-through text-muted-foreground' : ''} ${selectionMode ? 'cursor-pointer select-none' : ''}`}
      />

      {/* Floating toolbar */}
      {showToolbar && wrapperRef.current && (
        <FloatingToolbar containerRef={wrapperRef} onContentChange={handleToolbarChange} />
      )}

      {/* Delete */}
      <button
        onClick={handleDeleteBlock}
        className="pt-1 p-0.5 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
      >
        <Trash2 size={12} />
      </button>

      {/* Slash menu */}
      {slashCommand.showSlashMenu && (
        <div className="absolute left-8 top-full z-50 mt-1 bg-popover border border-border rounded-lg shadow-lg p-1 w-56 animate-fade-in">
          {slashCommand.filteredOptions.map((opt, idx) => (
            <button
              key={opt.type}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSlashSelect(opt.type);
              }}
              className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md text-popover-foreground transition-colors ${
                idx === slashCommand.slashMenuIndex ? 'bg-accent' : 'hover:bg-accent'
              }`}
            >
              <span className="text-muted-foreground">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
