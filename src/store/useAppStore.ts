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
  deleted_at: string | null;
}

interface DbPage {
  id: string;
  title: string;
  type: string;
  collection_id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  deleted_at: string | null;
  share_enabled: boolean;
  share_mode: 'public' | 'private';
  share_token: string | null;
  shared_with_emails: string[];
}

interface DbBlock {
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

interface AppState {
  collections: DbCollection[];
  pages: DbPage[];
  blocks: DbBlock[];
  activePageId: string | null;
  activeCollectionId: string | null;
  sidebarOpen: boolean;
  loading: boolean;
  userId: string | null;
  lastDeletedBlock: { block: DbBlock; pageId: string } | null;

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
  updatePageSharing: (id: string, updates: Partial<Pick<DbPage, 'share_enabled' | 'share_mode' | 'share_token' | 'shared_with_emails'>>) => void;
  deletePage: (id: string) => Promise<void>;

  // Blocks
  addBlock: (pageId: string, afterBlockId: string | null, type?: BlockType, groupId?: string | null, indentLevel?: number) => string;
  updateBlock: (pageId: string, blockId: string, updates: Partial<Block>) => void;
  deleteBlock: (pageId: string, blockId: string) => Promise<void>;
  deleteGroup: (pageId: string, groupBlockId: string) => Promise<void>;
  undoDeleteBlock: () => void;
  changeBlockType: (pageId: string, blockId: string, type: BlockType) => void;

  // Trash
  trashedPages: () => DbPage[];
  trashedCollections: () => DbCollection[];
  restorePage: (id: string) => Promise<void>;
  restoreCollection: (id: string) => Promise<void>;
  permanentlyDeletePage: (id: string) => Promise<void>;
  permanentlyDeleteCollection: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
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

// (no init guard needed — seeding is protected by re-check before insert)
function isInLocalCooldown() {
  // Also consider pending if any block save timers are active
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

// Debounce for page title
let titleTimer: ReturnType<typeof setTimeout> | null = null;

export const useAppStore = create<AppState>((set, get) => ({
  collections: [],
  pages: [],
  blocks: [],
  activePageId: localStorage.getItem('activePageId') || null,
  activeCollectionId: localStorage.getItem('activeCollectionId') || null,
  sidebarOpen: true,
  loading: true,
  userId: null,
  lastDeletedBlock: null,

  init: async (userId: string) => {
    set({ loading: true, userId });

    const [collectionsRes, pagesRes, blocksRes] = await Promise.all([
      supabase.from('collections').select('*').eq('user_id', userId).order('position'),
      supabase.from('pages').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('blocks').select('id, page_id, type, content, checked, list_start, indent_level, position, created_at, group_id, pages!inner(user_id)').eq('pages.user_id', userId).order('position'),
    ]);

    const collections = (collectionsRes.data ?? []) as DbCollection[];
    const pages = (pagesRes.data ?? []) as DbPage[];
    const blocks = ((blocksRes.data ?? []) as any[]).map(({ pages: _, ...b }) => b) as DbBlock[];

    const indented = blocks.filter(b => b.indent_level > 0);
    console.log('[init] total blocks:', blocks.length, '| indented:', indented.length);
    console.log('[init] first list block:', JSON.stringify(blocks.find(b => b.type === 'numbered_list' || b.type === 'bullet_list')));

    // If new user, create a welcome collection + page
    if (collections.length === 0) {
      // Re-check immediately before inserting to guard against concurrent init calls
      const { data: recheck } = await supabase.from('collections').select('id').eq('user_id', userId).limit(1);
      if (recheck && recheck.length > 0) {
        // Another init already seeded — just refetch and continue
        get().refetch();
        return;
      }
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

      localStorage.setItem('activePageId', pageId);
      localStorage.setItem('activeCollectionId', colId);
      // Flag for new-user onboarding redirect (settings page with API key modal)
      localStorage.setItem('parchment_new_user', 'true');
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

    const currentState = get();
    const newActivePageId = currentState.activePageId && pages.some((p) => p.id === currentState.activePageId && !p.deleted_at) ? currentState.activePageId : (pages.filter(p => !p.deleted_at)[0]?.id ?? null);
    const newActiveCollectionId = currentState.activeCollectionId && collections.some((c) => c.id === currentState.activeCollectionId && !c.deleted_at) ? currentState.activeCollectionId : (collections.filter(c => !c.deleted_at)[0]?.id ?? null);
    if (newActivePageId) localStorage.setItem('activePageId', newActivePageId);
    if (newActiveCollectionId) localStorage.setItem('activeCollectionId', newActiveCollectionId);
    set({
      collections,
      pages,
      blocks,
      activePageId: newActivePageId,
      activeCollectionId: newActiveCollectionId,
      loading: false,
    });
  },

  refetch: async () => {
    const { userId } = get();
    if (!userId) return;
    console.log('[refetch] called from:', new Error().stack?.split('\n')[2]?.trim());

    const [collectionsRes, pagesRes, blocksRes] = await Promise.all([
      supabase.from('collections').select('*').eq('user_id', userId).order('position'),
      supabase.from('pages').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('blocks').select('id, page_id, type, content, checked, list_start, indent_level, position, created_at, group_id, pages!inner(user_id)').eq('pages.user_id', userId).order('position'),
    ]);

    const collections = (collectionsRes.data ?? []) as DbCollection[];
    const pages = (pagesRes.data ?? []) as DbPage[];
    const blocks = ((blocksRes.data ?? []) as any[]).map(({ pages: _, ...b }) => b) as DbBlock[];

    const refetchIndented = blocks.filter(b => b.indent_level > 0);
    console.log('[refetch]', new Date().toISOString(), 'total blocks:', blocks.length, '| indented:', refetchIndented.length);
    console.log('[refetch] first list block:', JSON.stringify(blocks.find(b => b.type === 'numbered_list' || b.type === 'bullet_list')));

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

  reset: () => {
    set({
      collections: [],
      pages: [],
      blocks: [],
      activePageId: null,
      activeCollectionId: null,
      loading: false,
      userId: null,
      lastDeletedBlock: null,
    });
  },

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActivePage: (id) => {
    if (id) localStorage.setItem('activePageId', id);
    else localStorage.removeItem('activePageId');
    set({ activePageId: id });
  },
  setActiveCollection: (id) => {
    if (id) localStorage.setItem('activeCollectionId', id);
    else localStorage.removeItem('activeCollectionId');
    set({ activeCollectionId: id });
  },

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
    const now = new Date().toISOString();
    markLocalMutation();
    await supabase.from('collections').update({ deleted_at: now }).eq('id', id);
    // Also soft-delete pages in this collection
    await supabase.from('pages').update({ deleted_at: now }).match({ collection_id: id, deleted_at: null });
    set((s) => ({
      collections: s.collections.map((c) => c.id === id ? { ...c, deleted_at: now } : c),
      pages: s.pages.map((p) => p.collection_id === id ? { ...p, deleted_at: now } : p),
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

  updatePageSharing: (id, updates) => {
    set((s) => ({ pages: s.pages.map((p) => p.id === id ? { ...p, ...updates } : p) }));
  },

  deletePage: async (id) => {
    const now = new Date().toISOString();
    markLocalMutation();
    await supabase.from('pages').update({ deleted_at: now }).eq('id', id);
    set((s) => {
      const activePages = s.pages.filter((p) => p.id !== id && !p.deleted_at);
      return {
        pages: s.pages.map((p) => p.id === id ? { ...p, deleted_at: now } : p),
        activePageId: s.activePageId === id ? (activePages[0]?.id ?? null) : s.activePageId,
      };
    });
  },

  addBlock: (pageId, afterBlockId, type = 'text', groupId = null, indentLevel = 0) => {
    const blockId = uid();
    set((s) => {
      // For group children, scope positioning to siblings within the group
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

      // Reposition scoped siblings
      const updatedScoped = [...scopedBlocks];
      updatedScoped.splice(insertIdx, 0, newBlock);
      const repositioned = updatedScoped.map((b, i) => ({ ...b, position: i }));

      // Save to db
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
      const newState: Partial<AppState> = {
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
    // Delete all child blocks first (CASCADE would handle it but let's be explicit for state sync)
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

  // Trash methods
  trashedPages: () => get().pages.filter((p) => p.deleted_at !== null),
  trashedCollections: () => get().collections.filter((c) => c.deleted_at !== null),

  restorePage: async (id) => {
    markLocalMutation();
    await supabase.from('pages').update({ deleted_at: null }).eq('id', id);
    set((s) => ({
      pages: s.pages.map((p) => p.id === id ? { ...p, deleted_at: null } : p),
    }));
  },

  restoreCollection: async (id) => {
    markLocalMutation();
    await supabase.from('collections').update({ deleted_at: null }).eq('id', id);
    // Also restore pages that were soft-deleted with this collection
    await supabase.from('pages').update({ deleted_at: null }).eq('collection_id', id);
    set((s) => ({
      collections: s.collections.map((c) => c.id === id ? { ...c, deleted_at: null } : c),
      pages: s.pages.map((p) => p.collection_id === id ? { ...p, deleted_at: null } : p),
    }));
  },

  permanentlyDeletePage: async (id) => {
    markLocalMutation();
    await supabase.from('pages').delete().eq('id', id);
    set((s) => ({
      pages: s.pages.filter((p) => p.id !== id),
      blocks: s.blocks.filter((b) => b.page_id !== id),
    }));
  },

  permanentlyDeleteCollection: async (id) => {
    markLocalMutation();
    const pageIds = get().pages.filter((p) => p.collection_id === id).map((p) => p.id);
    await supabase.from('collections').delete().eq('id', id);
    set((s) => ({
      collections: s.collections.filter((c) => c.id !== id),
      pages: s.pages.filter((p) => p.collection_id !== id),
      blocks: s.blocks.filter((b) => !pageIds.includes(b.page_id)),
    }));
  },

  emptyTrash: async () => {
    const { trashedPages, trashedCollections } = get();
    const deletedPages = trashedPages();
    const deletedCollections = trashedCollections();
    markLocalMutation();
    for (const p of deletedPages) {
      await supabase.from('pages').delete().eq('id', p.id);
    }
    for (const c of deletedCollections) {
      await supabase.from('collections').delete().eq('id', c.id);
    }
    const deletedPageIds = deletedPages.map((p) => p.id);
    const deletedColIds = deletedCollections.map((c) => c.id);
    set((s) => ({
      pages: s.pages.filter((p) => !deletedPageIds.includes(p.id)),
      collections: s.collections.filter((c) => !deletedColIds.includes(c.id)),
      blocks: s.blocks.filter((b) => !deletedPageIds.includes(b.page_id)),
    }));
  },
}));
