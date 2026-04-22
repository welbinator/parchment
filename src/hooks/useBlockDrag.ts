import { useRef } from 'react';
import { useBlockStore } from '@/store/useBlockStore';

interface UseBlockDragOptions {
  readonly blockId: string;
  readonly pageId: string;
  readonly groupId: string | null;
}

/**
 * Returns an onMouseDown handler to attach to the drag handle button.
 * Uses pointer capture so the drag continues even if the cursor leaves the handle.
 */
export function useBlockDrag({ blockId, pageId, groupId }: UseBlockDragOptions) {
  const reorderBlocks = useBlockStore((s) => s.reorderBlocks);
  const getBlocks = () => useBlockStore.getState().blocks;
  const isDragging = useRef(false);

  const onMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Only left mouse button
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const handle = e.currentTarget;
    const blockEl = handle.closest<HTMLDivElement>('[data-block-id]');
    const container = blockEl?.parentElement;
    if (!blockEl || !container) return;

    isDragging.current = true;

    // --- Ghost element ---
    const ghost = blockEl.cloneNode(true) as HTMLDivElement;
    ghost.style.cssText = `
      position: fixed;
      pointer-events: none;
      opacity: 0.7;
      z-index: 9999;
      width: ${blockEl.offsetWidth}px;
      background: hsl(var(--background));
      border: 1px solid hsl(var(--border));
      border-radius: 6px;
      padding: 4px 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(ghost);

    // Drop indicator line
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: absolute;
      left: 0; right: 0;
      height: 2px;
      background: hsl(var(--primary));
      border-radius: 2px;
      pointer-events: none;
      z-index: 9998;
      display: none;
    `;
    container.style.position = 'relative';
    container.appendChild(indicator);

    const startY = e.clientY;
    let targetId: string | null = null;
    let insertBefore = true;

    const moveGhost = (clientX: number, clientY: number) => {
      ghost.style.left = `${clientX + 12}px`;
      ghost.style.top = `${clientY - 12}px`;
    };
    moveGhost(e.clientX, e.clientY);

    // Dim the source block
    blockEl.style.opacity = '0.4';

    const onMouseMove = (me: MouseEvent) => {
      moveGhost(me.clientX, me.clientY);

      // Find which block we're hovering over
      const allBlockEls = Array.from(container.querySelectorAll<HTMLDivElement>('[data-block-id]'));
      let found = false;
      for (const el of allBlockEls) {
        if (el === blockEl) continue;
        const rect = el.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        if (me.clientY >= rect.top - 4 && me.clientY <= rect.bottom + 4) {
          targetId = el.getAttribute('data-block-id');
          insertBefore = me.clientY < mid;
          // Position indicator
          const containerRect = container.getBoundingClientRect();
          const yPos = insertBefore
            ? rect.top - containerRect.top - 1
            : rect.bottom - containerRect.top + 1;
          indicator.style.display = 'block';
          indicator.style.top = `${yPos}px`;
          found = true;
          break;
        }
      }
      if (!found) {
        targetId = null;
        indicator.style.display = 'none';
      }
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      ghost.remove();
      indicator.remove();
      blockEl.style.opacity = '';

      if (targetId && targetId !== blockId) {
        const blocks = getBlocks();
        const scoped = blocks
          .filter((b) => b.page_id === pageId && (groupId ? b.group_id === groupId : !b.group_id))
          .sort((a, b) => a.position - b.position);

        const ids = scoped.map((b) => b.id);
        const fromIdx = ids.indexOf(blockId);
        const toIdx = ids.indexOf(targetId);
        if (fromIdx === -1 || toIdx === -1) return;

        // Remove from current position
        ids.splice(fromIdx, 1);
        // Find new target index after removal
        const newToIdx = ids.indexOf(targetId);
        const insertIdx = insertBefore ? newToIdx : newToIdx + 1;
        ids.splice(insertIdx, 0, blockId);

        reorderBlocks(pageId, groupId, ids);
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp); // skipcq: JS-0045
  };

  return { onMouseDown };
}
