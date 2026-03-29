import { useRef, useEffect, useState, useCallback, useMemo, KeyboardEvent } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';
import type { Block, BlockType } from '@/types';
import FloatingToolbar from './FloatingToolbar';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import DOMPurify from 'dompurify';
import {
  GripVertical,
  Trash2,
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Code,
  Group,
} from 'lucide-react';

const blockTypeOptions: { type: BlockType; label: string; icon: React.ReactNode }[] = [
  { type: 'text', label: 'Text', icon: <Type size={14} /> },
  { type: 'heading1', label: 'Heading 1', icon: <Heading1 size={14} /> },
  { type: 'heading2', label: 'Heading 2', icon: <Heading2 size={14} /> },
  { type: 'heading3', label: 'Heading 3', icon: <Heading3 size={14} /> },
  { type: 'bullet_list', label: 'Bullet List', icon: <List size={14} /> },
  { type: 'numbered_list', label: 'Numbered List', icon: <ListOrdered size={14} /> },
  { type: 'todo', label: 'To-do', icon: <CheckSquare size={14} /> },
  { type: 'quote', label: 'Quote', icon: <Quote size={14} /> },
  { type: 'divider', label: 'Divider', icon: <Minus size={14} /> },
  { type: 'code', label: 'Code', icon: <Code size={14} /> },
  { type: 'group', label: 'Group', icon: <Group size={14} /> },
];

// Convert styled JSON arrays to HTML (for content saved before server-side conversion)
function toRoman(n: number): string {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ['m','cm','d','cd','c','xc','l','xl','x','ix','v','iv','i'];
  let result = '';
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i]; }
  }
  return result;
}

function convertStyledJsonToHtml(content: string): string {
  if (!content || !content.trim().startsWith('[')) return content;
  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) return content;
    return parsed.map((item: any) => {
      if (typeof item === 'string') return item;
      if (typeof item !== 'object' || !item.text) return '';
      let html: string = item.text;
      if (item.bold) html = `<b>${html}</b>`;
      if (item.italic) html = `<i>${html}</i>`;
      if (item.underline) html = `<u>${html}</u>`;
      if (item.strikethrough) html = `<s>${html}</s>`;
      if (item.code) html = `<code>${html}</code>`;
      if (item.color) html = `<span style="color:${item.color}">${html}</span>`;
      if (item.link || item.href) html = `<a href="${item.link || item.href}" target="_blank" rel="noopener noreferrer">${html}</a>`;
      return html;
    }).join('');
  } catch {
    return content;
  }
}

// URL regex for auto-linkify
const URL_REGEX = /(?<!\S)(https?:\/\/[^\s<]+[^\s<.,;:!?)"'\]])/g;

function autoLinkify(html: string): string {
  // Don't linkify inside existing anchor tags
  const parts: string[] = [];
  let lastIndex = 0;
  const tagRegex = /<a\b[^>]*>[\s\S]*?<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(html)) !== null) {
    // Process text before this anchor
    const before = html.slice(lastIndex, match.index);
    parts.push(before.replace(URL_REGEX, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'));
    // Keep anchor as-is
    parts.push(match[0]);
    lastIndex = match.index + match[0].length;
  }
  // Process remaining text
  const remaining = html.slice(lastIndex);
  parts.push(remaining.replace(URL_REGEX, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'));

  return parts.join('');
}

interface BlockItemProps {
  block: Block;
  pageId: string;
  listIndex: number;
  focusBlockId: string | null;
  onFocusHandled: () => void;
  onNewBlock: (newBlockId: string) => void;
  groupId?: string | null;
  groupBlocksEnabled?: boolean;
}

export default function BlockItem({ block, pageId, listIndex, focusBlockId, onFocusHandled, onNewBlock, groupId = null, groupBlocksEnabled = false }: BlockItemProps) {
  const { updateBlock, deleteBlock, addBlock, changeBlockType, undoDeleteBlock } = useAppStore();
  const ref = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [slashMenuIndex, setSlashMenuIndex] = useState(0);
  const listIndentEnabled = useFeatureFlag('list-indent');
  const indentLevel = block.indentLevel ?? 0;

  const handleDeleteBlock = useCallback(() => {
    deleteBlock(pageId, block.id);
    toast('Block deleted', {
      action: {
        label: 'Undo',
        onClick: () => undoDeleteBlock(),
      },
      duration: 5000,
    });
  }, [deleteBlock, undoDeleteBlock, pageId, block.id]);

  // Set initial content only once on mount
  useEffect(() => {
    if (ref.current && !initializedRef.current) {
      ref.current.innerHTML = DOMPurify.sanitize(convertStyledJsonToHtml(block.content));
      initializedRef.current = true;
    }
  }, []);

  // Sync content when block type changes (slash command)
  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = DOMPurify.sanitize(convertStyledJsonToHtml(block.content));
    }
  }, [block.type]);

  useEffect(() => {
    if (focusBlockId === block.id && ref.current) {
      ref.current.focus();
      // Place cursor at end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
      onFocusHandled();
    }
  }, [focusBlockId, block.id, onFocusHandled]);

  const getContentForStore = (): string => {
    if (!ref.current) return '';
    return ref.current.innerHTML;
  };

  const handleInput = () => {
    if (!ref.current) return;
    const text = ref.current.innerText;

    // Check for slash command
    if (text === '/') {
      setShowSlashMenu(true);
      setSlashFilter('');
      setSlashMenuIndex(0);
      return;
    }
    if (showSlashMenu && text.startsWith('/')) {
      setSlashFilter(text.slice(1).toLowerCase());
      setSlashMenuIndex(0);
      return;
    }
    if (showSlashMenu && !text.startsWith('/')) {
      setShowSlashMenu(false);
    }

    updateBlock(pageId, block.id, { content: getContentForStore() });
  };

  const handleToolbarChange = () => {
    updateBlock(pageId, block.id, { content: getContentForStore() });
  };

  // Auto-linkify on blur
  const handleBlur = () => {
    if (!ref.current || block.type === 'code') return;
    const html = ref.current.innerHTML;
    const linkified = autoLinkify(html);
    if (linkified !== html) {
      ref.current.innerHTML = DOMPurify.sanitize(linkified);
      updateBlock(pageId, block.id, { content: DOMPurify.sanitize(linkified) });
    }
  };

  // Stable ref so the TAB listener always sees latest values without re-attaching
  const tabHandlerRef = useRef<{
    listIndentEnabled: boolean;
    blockType: string;
    indentLevel: number;
    blockId: string;
    pageId: string;
  }>({ listIndentEnabled, blockType: block.type, indentLevel: block.indentLevel ?? 0, blockId: block.id, pageId });

  useEffect(() => {
    tabHandlerRef.current = {
      listIndentEnabled,
      blockType: block.type,
      indentLevel: block.indentLevel ?? 0,
      blockId: block.id,
      pageId,
    };
  });

  // Native TAB handler — must be DOM-level to beat browser focus management
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onTab = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const { listIndentEnabled, blockType, indentLevel, blockId, pageId } = tabHandlerRef.current;
      if (!listIndentEnabled) return;
      if (blockType !== 'numbered_list' && blockType !== 'bullet_list') return;
      e.preventDefault();
      e.stopPropagation();
      const next = e.shiftKey ? Math.max(0, indentLevel - 1) : Math.min(4, indentLevel + 1);
      if (next !== indentLevel) {
        updateBlock(pageId, blockId, { indentLevel: next });
      }
    };
    el.addEventListener('keydown', onTab);
    return () => el.removeEventListener('keydown', onTab);
  }, [updateBlock]); // stable: only re-attach if updateBlock identity changes

  const handleKeyDown = (e: KeyboardEvent) => {
    // List indent/outdent handled by native listener above (TAB)
    if (e.key === 'Tab' && listIndentEnabled && (block.type === 'numbered_list' || block.type === 'bullet_list')) {
      e.preventDefault();
      return;
    }

    // Bold/Italic shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      document.execCommand('bold');
      updateBlock(pageId, block.id, { content: getContentForStore() });
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      document.execCommand('italic');
      updateBlock(pageId, block.id, { content: getContentForStore() });
      return;
    }

    if (showSlashMenu) {
      if (e.key === 'Escape') {
        setShowSlashMenu(false);
        return;
      }
      const filtered = blockTypeOptions.filter((o) => {
        if (o.type === 'group' && !groupBlocksEnabled) return false;
        return o.label.toLowerCase().includes(slashFilter);
      });
      if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSlashMenuIndex((i) => (i + 1) % Math.max(filtered.length, 1));
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSlashMenuIndex((i) => (i - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1));
          return;
        }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered.length > 0) {
          const idx = slashMenuIndex;
          selectSlashOption(filtered[Math.min(idx, filtered.length - 1)].type);
        }
        return;
      }
      return;
    }

    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const newId = addBlock(pageId, block.id, 'text', groupId, 0);
      onNewBlock(newId);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const newType: BlockType = block.type === 'todo' ? 'todo' : block.type === 'bullet_list' ? 'bullet_list' : block.type === 'numbered_list' ? 'numbered_list' : 'text';
      // Inherit indent level for list blocks so sub-items continue at the same level
      const inheritedIndent = (newType === 'bullet_list' || newType === 'numbered_list') ? indentLevel : 0;
      const newId = addBlock(pageId, block.id, newType, groupId, inheritedIndent);
      onNewBlock(newId);
    }

    if (e.key === 'Backspace' && ref.current?.innerText === '') {
      e.preventDefault();
      handleDeleteBlock();
    }
  };

  // Only open links on Ctrl+click / Cmd+click
  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A') {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const href = (target as HTMLAnchorElement).href;
        if (href) window.open(href, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const selectSlashOption = (type: BlockType) => {
    setShowSlashMenu(false);
    if (ref.current) ref.current.innerHTML = '';
    // Group blocks are handled by PageEditor — just change the type; PageEditor will swap to GroupBlock
    changeBlockType(pageId, block.id, type);
    updateBlock(pageId, block.id, { content: '', listStart: type === 'numbered_list' ? true : undefined });
    if (type !== 'group') {
      setTimeout(() => ref.current?.focus(), 0);
    }
  };

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

  // Group blocks are rendered by GroupBlock in PageEditor — this is a fallback
  // for when the flag is off or block somehow escapes the PageEditor check
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

  const blockStyles: Record<string, string> = {
    text: 'text-base text-foreground',
    heading1: 'text-3xl font-bold text-foreground font-display',
    heading2: 'text-2xl font-semibold text-foreground font-display',
    heading3: 'text-xl font-medium text-foreground font-display',
    bullet_list: 'text-base text-foreground pl-4 before:content-["•"] before:absolute before:-left-0 before:text-primary relative',
    numbered_list: 'text-base text-foreground pl-4',
    todo: 'text-base text-foreground',
    quote: 'text-base italic text-muted-foreground border-l-2 border-primary pl-4',
    code: 'text-sm font-mono bg-muted px-3 py-2 rounded-md text-foreground',
  };

  const showToolbar = block.type !== 'code';

  return (
    <div
      ref={wrapperRef}
      className="group flex items-start gap-1 relative"
      style={listIndentEnabled && indentLevel > 0 ? { paddingLeft: `${indentLevel * 1.5}rem` } : undefined}
    >
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
            block.checked
              ? 'bg-primary border-primary'
              : 'border-muted-foreground hover:border-primary'
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
          {listIndentEnabled && indentLevel >= 2
            ? `${toRoman(listIndex + 1)}.`
            : listIndentEnabled && indentLevel === 1
            ? `${String.fromCharCode(97 + (listIndex % 26))}.`
            : `${listIndex + 1}.`}
        </span>
      )}

      {/* Content */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onClick={handleClick}
        data-placeholder={block.type === 'heading1' ? 'Heading 1' : block.type === 'heading2' ? 'Heading 2' : block.type === 'heading3' ? 'Heading 3' : "Type '/' for commands..."}
        className={`flex-1 outline-none min-h-[1.5em] empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50 ${
          blockStyles[block.type] || blockStyles.text
        } ${block.checked ? 'line-through text-muted-foreground' : ''}`}
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
      {showSlashMenu && (
        <div className="absolute left-8 top-full z-50 mt-1 bg-popover border border-border rounded-lg shadow-lg p-1 w-56 animate-fade-in">
          {blockTypeOptions
            .filter((o) => {
              if (o.type === 'group' && !groupBlocksEnabled) return false;
              return o.label.toLowerCase().includes(slashFilter);
            })
            .map((opt, idx) => (
              <button
                key={opt.type}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectSlashOption(opt.type);
                }}
                className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md text-popover-foreground transition-colors ${
                  idx === slashMenuIndex
                    ? 'bg-accent'
                    : 'hover:bg-accent'
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
