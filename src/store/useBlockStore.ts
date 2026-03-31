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

// Track local mutation cooldown to suppress realtime refetch flicker
let localMutationCooldown = 0;

export function markLocalMutation() {
  localMutationCooldown = Date.now() + 2000;
}

export function isInLocalCooldown() {
  return Date.now() < localMutationCooldown || blockSaveTimers.size > 0;
}

function debounceSaveBlock(block: DbBlock) {
  const existing = blockSaveTimers.get(block.id);
  if (existing) clearTimeout(existing);
  blockSaveTimers.set(block.id, setTimeout(async () => {
    blockSaveTimers.delete(block.id);
    markLocalMutation();
    await supabase.from('blocks').update({
      content: block.content,
      checked: block.checked,
      list_start: block.list_start,
      indent_level: block.indent_level,
      type: block.type,
      position: block.position,
    }).eq('id', block.id);
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

      markLocalMutation();
      supabase.from('blocks').insert({ ...newBlock, position: insertIdx, group_id: groupId }).then(() => {
        repositioned.forEach((b) => {
          if (b.id !== blockId) {
            supabase.from('blocks').update({ position: b.position }).eq('id', b.id);
          }
        });
      });

      const otherBlocks = s.blocks.filter((b) => !(b.page_id === pageId && (groupId ? b.group_id === groupId : !b.group_id)));
      return { blocks: [...otherBlocks, ...repositioned] };
    });
    return blockId;
  },

  updateBlock: (pageId, blockId, updates) => {
    markLocalMutation();
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
    markLocalMutation();
    await supabase.from('blocks').delete().eq('id', blockId);
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
        supabase.from('blocks').insert(newBlock);
        newState.blocks = [...remaining, newBlock];
      }
      return newState as any;
    });
  },

  deleteGroup: async (pageId, groupBlockId) => {
    markLocalMutation();
    await supabase.from('blocks').delete().eq('group_id', groupBlockId);
    await supabase.from('blocks').delete().eq('id', groupBlockId);
    set((s) => ({
      blocks: s.blocks.filter((b) => b.id !== groupBlockId && b.group_id !== groupBlockId),
      lastDeletedBlock: null,
    }));
  },

  undoDeleteBlock: () => {
    const { lastDeletedBlock } = get();
    if (!lastDeletedBlock) return;
    const { block } = lastDeletedBlock;
    markLocalMutation();
    supabase.from('blocks').insert({
      id: block.id,
      page_id: block.page_id,
      type: block.type,
      content: block.content,
      checked: block.checked,
      list_start: block.list_start,
      position: block.position,
      group_id: block.group_id,
    });
    set((s) => ({
      blocks: [...s.blocks, block],
      lastDeletedBlock: null,
    }));
  },

  changeBlockType: (pageId, blockId, type) => {
    markLocalMutation();
    set((s) => ({
      blocks: s.blocks.map((b) =>
        b.id === blockId ? { ...b, type, checked: type === 'todo' ? false : b.checked } : b
      ),
    }));
    supabase.from('blocks').update({ type, checked: type === 'todo' ? false : null }).eq('id', blockId);
  },
}));
