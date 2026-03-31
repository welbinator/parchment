import { useEffect, useRef } from 'react';
import { useBlockStore } from '@/store/useBlockStore';

interface UseListIndentOptions {
  contentRef: React.RefObject<HTMLDivElement | null>;
  blockType: string;
  indentLevel: number;
  blockId: string;
  pageId: string;
}

export function useListIndent({ contentRef, blockType, indentLevel, blockId, pageId }: UseListIndentOptions) {
  const { updateBlock } = useBlockStore();

  // Stable ref so the TAB listener always sees latest values without re-attaching
  const stateRef = useRef({ blockType, indentLevel, blockId, pageId });

  useEffect(() => {
    stateRef.current = { blockType, indentLevel, blockId, pageId };
  });

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onTab = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const { blockType, indentLevel, blockId, pageId } = stateRef.current;
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
  }, [contentRef, updateBlock]);
}
