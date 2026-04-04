import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { PageType } from '@/types';
import { useBlockStore, isInLocalCooldown } from './useBlockStore';
import { usePageStore } from './usePageStore';
import { useCollectionStore } from './useCollectionStore';
import type { DbBlock } from './useBlockStore';
import type { DbPage } from './usePageStore';
import type { DbCollection } from './useCollectionStore';

interface AppState {
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

  // Orchestrated actions (touch multiple stores + active IDs)
  addCollection: (name: string) => Promise<string>;
  deleteCollection: (id: string) => Promise<void>;
  addPage: (collectionId: string, type?: PageType) => Promise<string>;
  deletePage: (id: string) => Promise<void>;
}

function uid() {
  return crypto.randomUUID();
}

// Capture ?page= param at module load time, before anything cleans the URL
const _urlPageId = new URLSearchParams(window.location.search).get('page');
if (_urlPageId) {
  // Clean it immediately so it doesn't persist in history
  const _url = new URL(window.location.href);
  _url.searchParams.delete('page');
  window.history.replaceState({}, '', _url.toString());
}

export const useAppStore = create<AppState>((set, get) => ({
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
      useCollectionStore.getState().setCollections(col ? [col] : []);
      set({
        activePageId: pageId,
        activeCollectionId: colId,
        loading: false,
      });
      return;
    }

    const currentState = get();

    // Use page ID captured from URL at module load time
    const urlPageValid = _urlPageId && pages.some((p) => p.id === _urlPageId && !p.deleted_at);

    const newActivePageId = urlPageValid
      ? _urlPageId
      : (currentState.activePageId && pages.some((p) => p.id === currentState.activePageId && !p.deleted_at) ? currentState.activePageId : (pages.filter(p => !p.deleted_at)[0]?.id ?? null));
    const newActiveCollectionId = (() => {
      if (urlPageValid) {
        const col = pages.find(p => p.id === _urlPageId)?.collection_id;
        return col || (currentState.activeCollectionId && collections.some((c) => c.id === currentState.activeCollectionId && !c.deleted_at) ? currentState.activeCollectionId : (collections.filter(c => !c.deleted_at)[0]?.id ?? null));
      }
      return currentState.activeCollectionId && collections.some((c) => c.id === currentState.activeCollectionId && !c.deleted_at) ? currentState.activeCollectionId : (collections.filter(c => !c.deleted_at)[0]?.id ?? null);
    })();
    if (newActivePageId) localStorage.setItem('activePageId', newActivePageId);
    if (newActiveCollectionId) localStorage.setItem('activeCollectionId', newActiveCollectionId);

    useBlockStore.getState().setBlocks(blocks);
    usePageStore.getState().setPages(pages);
    useCollectionStore.getState().setCollections(collections);
    set({
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
    useCollectionStore.getState().setCollections(collections);
    set((s) => ({
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
    useCollectionStore.getState().resetCollections();
    set({
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
    const { userId } = get();
    if (!userId) return '';
    const id = await useCollectionStore.getState().addCollection(name, userId);
    if (id) {
      set({ activeCollectionId: id });
    }
    return id;
  },

  deleteCollection: async (id) => {
    await useCollectionStore.getState().deleteCollection(id);
    const pageStore = usePageStore.getState();
    set((s) => ({
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
}));
