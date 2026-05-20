import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { Block, BlockType } from '@/types';

export interface DbBlock {
  id: string;
  page_id: string;
  type: string;
  content: string;
  checked: boolean | null;
  list_start: boolean | null;
  indent_level: number;
  position: number;
  created_at: string;
  group_id: string | null;
}

function uid() {
  return crypto.randomUUID();
}

// Debounce map for block saves
const blockSaveTimers = new Map<string, ReturnType<typeof setTimeout>>();

// Per-block pending mutation tracking — replaces the old global timestamp cooldown.
// A block ID lives in this set while any local mutation is in-flight or debounced.
// The realtime handler checks this before scheduling a refetch, so a racing DB
// event for a block WE just mutated never triggers an overwrite.
const pendingBlockIds = new Set<string>();

export function markBlockPending(blockId: string) {
  pendingBlockIds.add(blockId);
}

export function unmarkBlockPending(blockId: string) {
  pendingBlockIds.delete(blockId);
}

export function isBlockPending(blockId: string) {
  return pendingBlockIds.has(blockId);
}

/** Returns true if ANY block is currently pending (coarse guard for non-block realtime events). */
export function isInLocalCooldown() {
  return pendingBlockIds.size > 0 || blockSaveTimers.size > 0;
}

/** @deprecated No-op — per-block tracking is now the source of truth. */
export function markLocalMutation() {
  // intentionally empty
}

function debounceSaveBlock(block: DbBlock) {
  const existing = blockSaveTimers.get(block.id);
  if (existing) clearTimeout(existing);
  markBlockPending(block.id);
  blockSaveTimers.set(block.id, setTimeout(async () => {
    blockSaveTimers.delete(block.id);
    await supabase.from('blocks').update({
      content: block.content,
      checked: block.checked,
      list_start: block.list_start,
      indent_level: block.indent_level,
      type: block.type,
      position: block.position,
    }).eq('id', block.id);
    unmarkBlockPending(block.id);
  }, 500));
}

interface BlockState {
  blocks: DbBlock[];
  lastDeletedBlock: { block: DbBlock; pageId: string } | null;

  // Called by useAppStore during init/refetch to hand off fetched data
  setBlocks: (blocks: DbBlock[]) => void;
  resetBlocks: () => void;

  // Block CRUD
  addBlock: (pageId: string, afterBlockId: string | null, type?: BlockType, groupId?: string | null, indentLevel?: number) => string;
  updateBlock: (pageId: string, blockId: string, updates: Partial<Block>) => void;
  deleteBlock: (pageId: string, blockId: string) => Promise<void>;
  deleteGroup: (pageId: string, groupBlockId: string) => Promise<void>;
  undoDeleteBlock: () => void;
  changeBlockType: (pageId: string, blockId: string, type: BlockType) => void;
  reorderBlocks: (pageId: string, groupId: string | null, orderedIds: string[]) => void;
}

export const useBlockStore = create<BlockState>((set, get) => ({
  blocks: [],
  lastDeletedBlock: null,

  setBlocks: (blocks) => set({ blocks }),
  resetBlocks: () => set({ blocks: [], lastDeletedBlock: null }),

  addBlock: (pageId, afterBlockId, type = 'text', groupId = null, indentLevel = 0) => {
    const blockId = uid();
    set((s) => {
      const scopedBlocks = groupId
        ? s.blocks.filter((b) => b.page_id === pageId && b.group_id === groupId).sort((a, b) => a.position - b.position)
        : s.blocks.filter((b) => b.page_id === pageId && !b.group_id).sort((a, b) => a.position - b.position);

      let insertIdx = scopedBlocks.length;
      if (afterBlockId) {
        const idx = scopedBlocks.findIndex((b) => b.id === afterBlockId);
        if (idx >= 0) insertIdx = idx + 1;
      }

      const newBlock: DbBlock = {
        id: blockId,
        page_id: pageId,
        type,
        content: '',
        checked: type === 'todo' ? false : null,
        list_start: null,
        indent_level: indentLevel,
        position: insertIdx,
        created_at: new Date().toISOString(),
        group_id: groupId,
      };

      const updatedScoped = [...scopedBlocks];
      updatedScoped.splice(insertIdx, 0, newBlock);
      const repositioned = updatedScoped.map((b, i) => ({ ...b, position: i }));

      // Mark every affected block as pending BEFORE firing any async work
      repositioned.forEach((b) => markBlockPending(b.id));

      supabase.from('blocks').insert({ ...newBlock, position: insertIdx, group_id: groupId }).then(async () => {
        const positionUpdates = repositioned.filter((b) => b.id !== blockId);
        await Promise.all(
          positionUpdates.map((b) =>
            supabase.from('blocks').update({ position: b.position }).eq('id', b.id)
          )
        );
        // All DB writes done — unmark the whole batch
        repositioned.forEach((b) => unmarkBlockPending(b.id));
      });

      const otherBlocks = s.blocks.filter((b) => !(b.page_id === pageId && (groupId ? b.group_id === groupId : !b.group_id)));
      return { blocks: [...otherBlocks, ...repositioned] };
    });
    return blockId;
  },

  updateBlock: (pageId, blockId, updates) => {
    markBlockPending(blockId); // debounceSaveBlock will unmark after DB write
    set((s) => {
      const newBlocks = s.blocks.map((b) => {
        if (b.id !== blockId) return b;
        return {
          ...b,
          content: updates.content !== undefined ? updates.content : b.content,
          checked: updates.checked !== undefined ? updates.checked : b.checked,
          list_start: updates.listStart !== undefined ? updates.listStart : b.list_start,
          indent_level: updates.indentLevel !== undefined ? updates.indentLevel : b.indent_level,
          type: updates.type !== undefined ? updates.type : b.type,
        };
      });
      const updated = newBlocks.find((b) => b.id === blockId);
      if (updated) debounceSaveBlock(updated);
      return { blocks: newBlocks };
    });
  },

  deleteBlock: async (pageId, blockId) => {
    const deletedBlock = get().blocks.find((b) => b.id === blockId);
    markBlockPending(blockId);

    // Optimistically remove from UI IMMEDIATELY — don't wait for the DB round-trip.
    // The old pattern (await delete, THEN set) left a window where the realtime event
    // could fire before the UI updated, causing the block to flicker back.
    set((s) => {
      const remaining = s.blocks.filter((b) => b.id !== blockId);
      const pageBlocks = remaining.filter((b) => b.page_id === pageId);
      const newState: Partial<BlockState> = {
        blocks: remaining,
        lastDeletedBlock: deletedBlock ? { block: deletedBlock, pageId } : null,
      };
      if (pageBlocks.length === 0) {
        const newBlock: DbBlock = {
          id: uid(),
          page_id: pageId,
          type: 'text',
          content: '',
          checked: null,
          list_start: null,
          position: 0,
          created_at: new Date().toISOString(),
          group_id: null,
        };
        markBlockPending(newBlock.id);
        supabase.from('blocks').insert(newBlock).then(() => unmarkBlockPending(newBlock.id));
        newState.blocks = [...remaining, newBlock];
      }
      return newState as BlockState;
    });

    await supabase.from('blocks').delete().eq('id', blockId);
    unmarkBlockPending(blockId);
  },

  deleteGroup: async (pageId, groupBlockId) => {
    const groupMemberIds = get().blocks
      .filter((b) => b.id === groupBlockId || b.group_id === groupBlockId)
      .map((b) => b.id);
    groupMemberIds.forEach((id) => markBlockPending(id));

    // Optimistically remove from UI before awaiting DB
    set((s) => ({
      blocks: s.blocks.filter((b) => b.id !== groupBlockId && b.group_id !== groupBlockId),
      lastDeletedBlock: null,
    }));

    await supabase.from('blocks').delete().eq('group_id', groupBlockId);
    await supabase.from('blocks').delete().eq('id', groupBlockId);
    groupMemberIds.forEach((id) => unmarkBlockPending(id));
  },

  undoDeleteBlock: () => {
    const { lastDeletedBlock } = get();
    if (!lastDeletedBlock) return;
    const { block } = lastDeletedBlock;
    markBlockPending(block.id);
    supabase.from('blocks').insert({
      id: block.id,
      page_id: block.page_id,
      type: block.type,
      content: block.content,
      checked: block.checked,
      list_start: block.list_start,
      position: block.position,
      group_id: block.group_id,
    }).then(() => unmarkBlockPending(block.id));
    set((s) => ({
      blocks: [...s.blocks, block],
      lastDeletedBlock: null,
    }));
  },

  changeBlockType: (pageId, blockId, type) => {
    markBlockPending(blockId);
    set((s) => ({
      blocks: s.blocks.map((b) =>
        b.id === blockId ? { ...b, type, checked: type === 'todo' ? false : b.checked } : b
      ),
    }));
    supabase.from('blocks').update({ type, checked: type === 'todo' ? false : null }).eq('id', blockId)
      .then(() => unmarkBlockPending(blockId));
  },

  reorderBlocks: (pageId, groupId, orderedIds) => {
    orderedIds.forEach((id) => markBlockPending(id));
    set((s) => {
      const updated = s.blocks.map((b) => {
        if (b.page_id !== pageId) return b;
        if (groupId ? b.group_id !== groupId : b.group_id !== null) return b;
        const newPos = orderedIds.indexOf(b.id);
        if (newPos === -1) return b;
        return { ...b, position: newPos };
      });
      // Persist new positions
      Promise.all(
        orderedIds.map((id, pos) =>
          supabase.from('blocks').update({ position: pos }).eq('id', id)
        )
      ).then(() => orderedIds.forEach((id) => unmarkBlockPending(id)));
      return { blocks: updated };
    });
  },
}));
