import { useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { useBlockStore } from '@/store/useBlockStore';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';
import { convertStyledJsonToHtml, autoLinkify } from '@/utils/blockContent';
import type { Block, BlockType } from '@/types';

interface UseBlockEditorOptions {
  block: Block;
  pageId: string;
  focusBlockId: string | null;
  onFocusHandled: () => void;
  onNewBlock: (newBlockId: string) => void;
  groupId: string | null;
  /** Whether the slash menu consumed the key */
  onSlashKeyDown: (key: string) => boolean;
  checkSlashTrigger: () => boolean;
  closeSlashMenu: () => void;
  showSlashMenu: boolean;
  contentRef: React.RefObject<HTMLDivElement | null>;
}

// skipcq: JS-0067
export function useBlockEditor({
  block,
  pageId,
  focusBlockId,
  onFocusHandled,
  onNewBlock,
  groupId,
  onSlashKeyDown,
  checkSlashTrigger,
  closeSlashMenu: _closeSlashMenu,
  showSlashMenu,
  contentRef,
}: UseBlockEditorOptions) {
  const { updateBlock, deleteBlock, addBlock, undoDeleteBlock } = useBlockStore();
  const ref = contentRef;
  const initializedRef = useRef(false);
  const indentLevel = block.indentLevel ?? 0;

  // Set initial content only once on mount
  useEffect(() => {
    if (ref.current && !initializedRef.current) {
      const html = convertStyledJsonToHtml(block.content);
      // Run autoLinkify on mount so API-inserted blocks with plain-text URLs
      // render as clickable links immediately (not only after focus+blur).
      // We only update the DOM here — NOT the store — to avoid triggering a
      // realtime write that would race with the Supabase realtime subscription
      // and overwrite the DOM back to the un-linkified version.
      const linkified = block.type !== 'code' ? autoLinkify(html) : html;
      // eslint-disable-next-line react/no-danger
      ref.current.innerHTML = DOMPurify.sanitize(linkified); // Content sanitized by DOMPurify before assignment
      initializedRef.current = true;
    }
  }, []);

  // Sync content when block type changes (slash command)
  // Guard with initializedRef so this doesn't fire on the initial render
  // and overwrite the linkified content set by the mount effect above.
  const typeChangeRef = useRef(false);
  useEffect(() => {
    if (!typeChangeRef.current) {
      typeChangeRef.current = true;
      return;
    }
    if (ref.current) {
      // eslint-disable-next-line react/no-danger
      ref.current.innerHTML = DOMPurify.sanitize(convertStyledJsonToHtml(block.content));
    }
  }, [block.type]);

  // Focus management
  useEffect(() => {
    if (focusBlockId === block.id && ref.current) {
      ref.current.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
      onFocusHandled();
    }
  }, [focusBlockId, block.id, onFocusHandled]);

  const getContentForStore = useCallback((): string => {
    if (!ref.current) return '';
    return ref.current.innerHTML;
  }, []);

  const getTextContent = useCallback((): string => {
    if (!ref.current) return '';
    return ref.current.innerText;
  }, []);

  const handleInput = useCallback(() => {
    if (!ref.current) return;
    if (checkSlashTrigger()) return;
    updateBlock(pageId, block.id, { content: getContentForStore() });
  }, [checkSlashTrigger, updateBlock, pageId, block.id, getContentForStore]);

  const handleToolbarChange = useCallback(() => {
    updateBlock(pageId, block.id, { content: getContentForStore() });
  }, [updateBlock, pageId, block.id, getContentForStore]);

  const handleBlur = useCallback(() => {
    if (!ref.current || block.type === 'code') return;
    const html = ref.current.innerHTML;
    const linkified = autoLinkify(html);
    if (linkified !== html) {
      ref.current.innerHTML = DOMPurify.sanitize(linkified);
      updateBlock(pageId, block.id, { content: DOMPurify.sanitize(linkified) });
    }
  }, [block.type, updateBlock, pageId, block.id]);

  const handleDeleteBlock = useCallback(() => {
    deleteBlock(pageId, block.id);
    toast('Block deleted', {
      action: { label: 'Undo', onClick: () => undoDeleteBlock() },
      duration: 5000,
    });
  }, [deleteBlock, undoDeleteBlock, pageId, block.id]);

  // skipcq: JS-R1005
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
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

    // Slash menu gets first crack at keys
    if (showSlashMenu) {
      if (onSlashKeyDown(e.key)) {
        e.preventDefault();
        return;
      }
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
      const inheritedIndent = (newType === 'bullet_list' || newType === 'numbered_list') ? indentLevel : 0;
      const newId = addBlock(pageId, block.id, newType, groupId, inheritedIndent);
      onNewBlock(newId);
    }

    if (e.key === 'Backspace' && ref.current?.innerText === '') {
      e.preventDefault();
      handleDeleteBlock();
    }
  }, [showSlashMenu, onSlashKeyDown, updateBlock, addBlock, pageId, block.id, block.type, groupId, indentLevel, onNewBlock, getContentForStore, handleDeleteBlock]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A') {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const href = (target as HTMLAnchorElement).href;
        if (href) window.open(href, '_blank', 'noopener,noreferrer');
      }
    }
  }, []);

  // Show pointer cursor on links when Ctrl is held (Ctrl+click opens the link)
  useEffect(() => {
    const setLinkCursors = (pointer: boolean) => {
      if (!ref.current) return;
      ref.current.querySelectorAll('a').forEach((a) => {
        a.style.cursor = pointer ? 'pointer' : 'text';
      });
    };
    const onKeyDown = (e: Event) => { if ((e as globalThis.KeyboardEvent).key === 'Control') setLinkCursors(true); };
    const onKeyUp = (e: Event) => { if ((e as globalThis.KeyboardEvent).key === 'Control') setLinkCursors(false); };
    const onBlurWindow = () => setLinkCursors(false);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlurWindow);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlurWindow);
    };
  }, []);

  return {
    handleInput,
    handleKeyDown,
    handleBlur,
    handleClick,
    handleToolbarChange,
    handleDeleteBlock,
    getTextContent,
  };
}
