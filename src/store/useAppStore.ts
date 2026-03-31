import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { PageType } from '@/types';
import { useBlockStore, markLocalMutation, isInLocalCooldown } from './useBlockStore';
import { usePageStore } from './usePageStore';
import type { DbBlock } from './useBlockStore';
import type { DbPage } from './usePageStore';

interface DbCollection {
  id: string;
  name: string;
  icon: string | null;
  position: number;
  created_at: string;
  user_id: string;
  deleted_at: string | null;
}

interface AppState {
  collections: DbCollection[];
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

  // Page shortcuts (delegate to usePageStore but manage activePageId)
  addPage: (collectionId: string, type?: PageType) => Promise<string>;
  deletePage: (id: string) => Promise<void>;

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

export const useAppStore = create<AppState>((set, get) => ({
  collections: [],
  activePageId: localStorage.getItem('activePageId') || null,
  activeCollectionId: localStorage.getItem('activeCollectionId') || null,
  sidebarOpen: true,
  loading: true,
  userId: null,

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

    // If new user, create a welcome collection + page
    if (collections.length === 0) {
      const { data: recheck } = await supabase.from('collections').select('id').eq('user_id', userId).limit(1);
      if (recheck && recheck.length > 0) {
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
      localStorage.setItem('parchment_new_user', 'true');

      useBlockStore.getState().setBlocks(welcomeBlocks as DbBlock[]);
      usePageStore.getState().setPages(page ? [page] : []);
      set({
        collections: col ? [col] : [],
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

    useBlockStore.getState().setBlocks(blocks);
    usePageStore.getState().setPages(pages);
    set({
      collections,
      activePageId: newActivePageId,
      activeCollectionId: newActiveCollectionId,
      loading: false,
    });
  },

  refetch: async () => {
    const { userId } = get();
    if (!userId) return;

    const [collectionsRes, pagesRes, blocksRes] = await Promise.all([
      supabase.from('collections').select('*').eq('user_id', userId).order('position'),
      supabase.from('pages').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('blocks').select('id, page_id, type, content, checked, list_start, indent_level, position, created_at, group_id, pages!inner(user_id)').eq('pages.user_id', userId).order('position'),
    ]);

    const collections = (collectionsRes.data ?? []) as DbCollection[];
    const pages = (pagesRes.data ?? []) as DbPage[];
    const blocks = ((blocksRes.data ?? []) as any[]).map(({ pages: _, ...b }) => b) as DbBlock[];

    useBlockStore.getState().setBlocks(blocks);
    usePageStore.getState().setPages(pages);
    set((s) => ({
      collections,
      activePageId: s.activePageId && pages.some((p) => p.id === s.activePageId) ? s.activePageId : (pages[0]?.id ?? null),
      activeCollectionId: s.activeCollectionId && collections.some((c) => c.id === s.activeCollectionId) ? s.activeCollectionId : (collections[0]?.id ?? null),
    }));
  },

  setupRealtime: () => {
    const { userId } = get();
    if (!userId) return () => {};

    const handleRealtimeChange = () => {
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
    useBlockStore.getState().resetBlocks();
    usePageStore.getState().resetPages();
    set({
      collections: [],
      activePageId: null,
      activeCollectionId: null,
      loading: false,
      userId: null,
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
    await supabase.from('pages').update({ deleted_at: now }).match({ collection_id: id, deleted_at: null });

    // Also update pages in page store
    const pageStore = usePageStore.getState();
    pageStore.setPages(pageStore.pages.map((p) => p.collection_id === id ? { ...p, deleted_at: now } : p));

    set((s) => ({
      collections: s.collections.map((c) => c.id === id ? { ...c, deleted_at: now } : c),
      activeCollectionId: s.activeCollectionId === id ? null : s.activeCollectionId,
      activePageId: pageStore.pages.find((p) => p.id === s.activePageId)?.collection_id === id ? null : s.activePageId,
    }));
  },

  addPage: async (collectionId, type = 'blank') => {
    const { userId } = get();
    if (!userId) return '';
    const id = await usePageStore.getState().addPage(collectionId, userId, type);
    if (id) {
      set({ activePageId: id, activeCollectionId: collectionId });
      localStorage.setItem('activePageId', id);
    }
    return id;
  },

  deletePage: async (id) => {
    const result = await usePageStore.getState().deletePage(id);
    if (result) {
      set((s) => ({
        activePageId: s.activePageId === id ? result.newActivePageId : s.activePageId,
      }));
    }
  },

  // Trash methods
  trashedPages: () => usePageStore.getState().pages.filter((p) => p.deleted_at !== null),
  trashedCollections: () => get().collections.filter((c) => c.deleted_at !== null),

  restorePage: async (id) => {
    markLocalMutation();
    await supabase.from('pages').update({ deleted_at: null }).eq('id', id);
    const pageStore = usePageStore.getState();
    pageStore.setPages(pageStore.pages.map((p) => p.id === id ? { ...p, deleted_at: null } : p));
  },

  restoreCollection: async (id) => {
    markLocalMutation();
    await supabase.from('collections').update({ deleted_at: null }).eq('id', id);
    await supabase.from('pages').update({ deleted_at: null }).eq('collection_id', id);

    const pageStore = usePageStore.getState();
    pageStore.setPages(pageStore.pages.map((p) => p.collection_id === id ? { ...p, deleted_at: null } : p));

    set((s) => ({
      collections: s.collections.map((c) => c.id === id ? { ...c, deleted_at: null } : c),
    }));
  },

  permanentlyDeletePage: async (id) => {
    markLocalMutation();
    await supabase.from('pages').delete().eq('id', id);
    const blockStore = useBlockStore.getState();
    blockStore.setBlocks(blockStore.blocks.filter((b) => b.page_id !== id));
    const pageStore = usePageStore.getState();
    pageStore.setPages(pageStore.pages.filter((p) => p.id !== id));
  },

  permanentlyDeleteCollection: async (id) => {
    markLocalMutation();
    const pageStore = usePageStore.getState();
    const pageIds = pageStore.pages.filter((p) => p.collection_id === id).map((p) => p.id);
    await supabase.from('collections').delete().eq('id', id);
    const blockStore = useBlockStore.getState();
    blockStore.setBlocks(blockStore.blocks.filter((b) => !pageIds.includes(b.page_id)));
    pageStore.setPages(pageStore.pages.filter((p) => p.collection_id !== id));
    set((s) => ({
      collections: s.collections.filter((c) => c.id !== id),
    }));
  },

  emptyTrash: async () => {
    const trashedPagesList = get().trashedPages();
    const trashedCollectionsList = get().trashedCollections();
    markLocalMutation();
    for (const p of trashedPagesList) {
      await supabase.from('pages').delete().eq('id', p.id);
    }
    for (const c of trashedCollectionsList) {
      await supabase.from('collections').delete().eq('id', c.id);
    }
    const deletedPageIds = trashedPagesList.map((p) => p.id);
    const deletedColIds = trashedCollectionsList.map((c) => c.id);
    const blockStore = useBlockStore.getState();
    blockStore.setBlocks(blockStore.blocks.filter((b) => !deletedPageIds.includes(b.page_id)));
    const pageStore = usePageStore.getState();
    pageStore.setPages(pageStore.pages.filter((p) => !deletedPageIds.includes(p.id)));
    set((s) => ({
      collections: s.collections.filter((c) => !deletedColIds.includes(c.id)),
    }));
  },
}));
