import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { Block, BlockType, PageType } from '@/types';

interface DbCollection {
  id: string;
  name: string;
  icon: string | null;
  position: number;
  created_at: string;
  user_id: string;
}

interface DbPage {
  id: string;
  title: string;
  type: string;
  collection_id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface DbBlock {
  id: string;
  page_id: string;
  type: string;
  content: string;
  checked: boolean | null;
  list_start: boolean | null;
  position: number;
  created_at: string;
}

interface AppState {
  collections: DbCollection[];
  pages: DbPage[];
  blocks: DbBlock[];
  activePageId: string | null;
  activeCollectionId: string | null;
  sidebarOpen: boolean;
  loading: boolean;
  userId: string | null;

  // Init
  init: (userId: string) => Promise<void>;
  refetch: () => Promise<void>;
  setupRealtime: () => () => void;
  reset: () => void;

  // UI
  setSidebarOpen: (open: boolean) => void;
  setActivePage: (id: string | null) => void;
  setActiveCollection: (id: string | null) => void;

  // Collections
  addCollection: (name: string) => Promise<string>;
  renameCollection: (id: string, name: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;

  // Pages
  addPage: (collectionId: string, type?: PageType) => Promise<string>;
  updatePageTitle: (id: string, title: string) => Promise<void>;
  deletePage: (id: string) => Promise<void>;

  // Blocks
  addBlock: (pageId: string, afterBlockId: string | null, type?: BlockType) => string;
  updateBlock: (pageId: string, blockId: string, updates: Partial<Block>) => void;
  deleteBlock: (pageId: string, blockId: string) => void;
  changeBlockType: (pageId: string, blockId: string, type: BlockType) => void;
}

function uid() {
  return crypto.randomUUID();
}

// Debounce map for block saves
const blockSaveTimers = new Map<string, ReturnType<typeof setTimeout>>();

// Track local mutation cooldown to suppress realtime refetch flicker
let localMutationCooldown = 0;
function markLocalMutation() {
  localMutationCooldown = Date.now() + 2000; // suppress refetch for 2s after local mutation
}
function isInLocalCooldown() {
  return Date.now() < localMutationCooldown;
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
      type: block.type,
      position: block.position,
    }).eq('id', block.id);
  }, 500));
}

// Debounce for page title
let titleTimer: ReturnType<typeof setTimeout> | null = null;

export const useAppStore = create<AppState>((set, get) => ({
  collections: [],
  pages: [],
  blocks: [],
  activePageId: null,
  activeCollectionId: null,
  sidebarOpen: true,
  loading: true,
  userId: null,

  init: async (userId: string) => {
    set({ loading: true, userId });

    const [collectionsRes, pagesRes, blocksRes] = await Promise.all([
      supabase.from('collections').select('*').eq('user_id', userId).order('position'),
      supabase.from('pages').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('blocks').select('*, pages!inner(user_id)').eq('pages.user_id', userId).order('position'),
    ]);

    const collections = (collectionsRes.data ?? []) as DbCollection[];
    const pages = (pagesRes.data ?? []) as DbPage[];
    const blocks = ((blocksRes.data ?? []) as any[]).map(({ pages: _, ...b }) => b) as DbBlock[];

    // If new user, create a welcome collection + page
    if (collections.length === 0) {
      const colId = uid();
      const pageId = uid();
      const { data: col } = await supabase.from('collections').insert({ id: colId, user_id: userId, name: 'Getting Started', position: 0 }).select().single();
      const { data: page } = await supabase.from('pages').insert({ id: pageId, user_id: userId, collection_id: colId, title: 'Welcome', type: 'blank' }).select().single();

      const welcomeBlocks = [
        { id: uid(), page_id: pageId, type: 'heading1', content: 'Welcome to Parchment', position: 0 },
        { id: uid(), page_id: pageId, type: 'text', content: 'A simple place for your thoughts. No databases, no complexity — just pages.', position: 1 },
        { id: uid(), page_id: pageId, type: 'divider', content: '', position: 2 },
        { id: uid(), page_id: pageId, type: 'heading2', content: 'Quick start', position: 3 },
        { id: uid(), page_id: pageId, type: 'todo', content: 'Create a new collection in the sidebar', checked: false, position: 4 },
        { id: uid(), page_id: pageId, type: 'todo', content: 'Add a page to your collection', checked: false, position: 5 },
        { id: uid(), page_id: pageId, type: 'todo', content: "Start writing — press / for block types", checked: false, position: 6 },
        { id: uid(), page_id: pageId, type: 'divider', content: '', position: 7 },
        { id: uid(), page_id: pageId, type: 'quote', content: 'Simplicity is the ultimate sophistication.', position: 8 },
      ];

      await supabase.from('blocks').insert(welcomeBlocks);

      set({
        collections: col ? [col] : [],
        pages: page ? [page] : [],
        blocks: welcomeBlocks as DbBlock[],
        activePageId: pageId,
        activeCollectionId: colId,
        loading: false,
      });
      return;
    }

    set({
      collections,
      pages,
      blocks,
      activePageId: pages[0]?.id ?? null,
      activeCollectionId: collections[0]?.id ?? null,
      loading: false,
    });
  },

  refetch: async () => {
    const { userId } = get();
    if (!userId) return;

    const [collectionsRes, pagesRes, blocksRes] = await Promise.all([
      supabase.from('collections').select('*').eq('user_id', userId).order('position'),
      supabase.from('pages').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('blocks').select('*, pages!inner(user_id)').eq('pages.user_id', userId).order('position'),
    ]);

    const collections = (collectionsRes.data ?? []) as DbCollection[];
    const pages = (pagesRes.data ?? []) as DbPage[];
    const blocks = ((blocksRes.data ?? []) as any[]).map(({ pages: _, ...b }) => b) as DbBlock[];

    set((s) => ({
      collections,
      pages,
      blocks,
      activePageId: s.activePageId && pages.some((p) => p.id === s.activePageId) ? s.activePageId : (pages[0]?.id ?? null),
      activeCollectionId: s.activeCollectionId && collections.some((c) => c.id === s.activeCollectionId) ? s.activeCollectionId : (collections[0]?.id ?? null),
    }));
  },

  setupRealtime: () => {
    const { userId } = get();
    if (!userId) return () => {};

    const handleRealtimeChange = () => {
      // Skip refetch if we just made a local mutation (prevents flash)
      if (isInLocalCooldown()) return;
      clearTimeout((window as any).__syncTimer);
      (window as any).__syncTimer = setTimeout(() => {
        if (!isInLocalCooldown()) get().refetch();
      }, 1000);
    };

    const channel = supabase
      .channel('sync-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blocks' }, handleRealtimeChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pages' }, handleRealtimeChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, handleRealtimeChange)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  reset: () => set({
    collections: [],
    pages: [],
    blocks: [],
    activePageId: null,
    activeCollectionId: null,
    loading: false,
    userId: null,
  }),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActivePage: (id) => set({ activePageId: id }),
  setActiveCollection: (id) => set({ activeCollectionId: id }),

  addCollection: async (name) => {
    const { userId, collections } = get();
    if (!userId) return '';
    const id = uid();
    const position = collections.length;
    const { data } = await supabase.from('collections').insert({ id, user_id: userId, name, position }).select().single();
    if (data) {
      set((s) => ({ collections: [...s.collections, data], activeCollectionId: id }));
    }
    return id;
  },

  renameCollection: async (id, name) => {
    await supabase.from('collections').update({ name }).eq('id', id);
    set((s) => ({ collections: s.collections.map((c) => (c.id === id ? { ...c, name } : c)) }));
  },

  deleteCollection: async (id) => {
    await supabase.from('collections').delete().eq('id', id);
    set((s) => ({
      collections: s.collections.filter((c) => c.id !== id),
      pages: s.pages.filter((p) => p.collection_id !== id),
      blocks: s.blocks.filter((b) => {
        const pageIds = s.pages.filter((p) => p.collection_id === id).map((p) => p.id);
        return !pageIds.includes(b.page_id);
      }),
      activeCollectionId: s.activeCollectionId === id ? null : s.activeCollectionId,
      activePageId: s.pages.find((p) => p.id === s.activePageId)?.collection_id === id ? null : s.activePageId,
    }));
  },

  addPage: async (collectionId, type = 'blank') => {
    const { userId } = get();
    if (!userId) return '';
    const id = uid();
    const { data: page } = await supabase.from('pages').insert({ id, user_id: userId, collection_id: collectionId, title: 'Untitled', type }).select().single();

    const defaultBlock = { id: uid(), page_id: id, type: type === 'checklist' ? 'todo' : 'text', content: '', position: 0, checked: type === 'checklist' ? false : null };
    await supabase.from('blocks').insert(defaultBlock);

    if (page) {
      set((s) => ({
        pages: [...s.pages, page],
        blocks: [...s.blocks, defaultBlock as DbBlock],
        activePageId: id,
        activeCollectionId: collectionId,
      }));
    }
    return id;
  },

  updatePageTitle: async (id, title) => {
    set((s) => ({ pages: s.pages.map((p) => (p.id === id ? { ...p, title } : p)) }));
    if (titleTimer) clearTimeout(titleTimer);
    titleTimer = setTimeout(async () => {
      await supabase.from('pages').update({ title }).eq('id', id);
    }, 500);
  },

  deletePage: async (id) => {
    await supabase.from('pages').delete().eq('id', id);
    set((s) => {
      const remaining = s.pages.filter((p) => p.id !== id);
      return {
        pages: remaining,
        blocks: s.blocks.filter((b) => b.page_id !== id),
        activePageId: s.activePageId === id ? (remaining[0]?.id ?? null) : s.activePageId,
      };
    });
  },

  addBlock: (pageId, afterBlockId, type = 'text') => {
    const blockId = uid();
    set((s) => {
      const pageBlocks = s.blocks.filter((b) => b.page_id === pageId).sort((a, b) => a.position - b.position);
      let insertIdx = pageBlocks.length;
      if (afterBlockId) {
        const idx = pageBlocks.findIndex((b) => b.id === afterBlockId);
        if (idx >= 0) insertIdx = idx + 1;
      }

      const newBlock: DbBlock = {
        id: blockId,
        page_id: pageId,
        type,
        content: '',
        checked: type === 'todo' ? false : null,
        list_start: null,
        position: insertIdx,
        created_at: new Date().toISOString(),
      };

      // Reposition
      const updatedBlocks = [...pageBlocks];
      updatedBlocks.splice(insertIdx, 0, newBlock);
      const repositioned = updatedBlocks.map((b, i) => ({ ...b, position: i }));

      // Save to db
      markLocalMutation();
      supabase.from('blocks').insert({ ...newBlock, position: insertIdx }).then(() => {
        // Update positions of shifted blocks
        repositioned.forEach((b) => {
          if (b.id !== blockId) {
            supabase.from('blocks').update({ position: b.position }).eq('id', b.id);
          }
        });
      });

      const otherBlocks = s.blocks.filter((b) => b.page_id !== pageId);
      return { blocks: [...otherBlocks, ...repositioned] };
    });
    return blockId;
  },

  updateBlock: (pageId, blockId, updates) => {
    set((s) => {
      const newBlocks = s.blocks.map((b) => {
        if (b.id !== blockId) return b;
        return {
          ...b,
          content: updates.content !== undefined ? updates.content : b.content,
          checked: updates.checked !== undefined ? updates.checked : b.checked,
          list_start: updates.listStart !== undefined ? updates.listStart : b.list_start,
          type: updates.type !== undefined ? updates.type : b.type,
        };
      });
      const updated = newBlocks.find((b) => b.id === blockId);
      if (updated) debounceSaveBlock(updated);
      return { blocks: newBlocks };
    });
  },

  deleteBlock: (pageId, blockId) => {
    // Mark cooldown to prevent realtime refetch from flashing the deleted block
    markLocalMutation();
    supabase.from('blocks').delete().eq('id', blockId).then(() => {
      // DB delete confirmed
    });
    set((s) => {
      const remaining = s.blocks.filter((b) => b.id !== blockId);
      const pageBlocks = remaining.filter((b) => b.page_id === pageId);
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
        };
        supabase.from('blocks').insert(newBlock);
        return { blocks: [...remaining, newBlock] };
      }
      return { blocks: remaining };
    });
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
