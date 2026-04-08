import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { PageType } from '@/types';
import { useBlockStore, isInLocalCooldown } from './useBlockStore';
import { usePageStore } from './usePageStore';
import { useCollectionStore } from './useCollectionStore';
import { useWorkspaceStore } from './useWorkspaceStore';
import type { DbBlock } from './useBlockStore';
import type { DbPage } from './usePageStore';
import type { DbCollection } from './useCollectionStore';
import type { DbWorkspace } from './useWorkspaceStore';

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

  // Workspace orchestration
  addWorkspace: (name: string) => Promise<string>;
  deleteWorkspace: (id: string) => Promise<void>;
  switchWorkspace: (id: string) => void;

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

// skipcq: JS-0067
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

  // skipcq: JS-R1005
  init: async (userId: string) => {
    set({ loading: true, userId });

    const [workspacesRes, collectionsRes, pagesRes, blocksRes] = await Promise.all([
      supabase.from('workspaces').select('*').eq('user_id', userId).order('position'),
      supabase.from('collections').select('*').eq('user_id', userId).order('position'),
      supabase.from('pages').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('blocks').select('id, page_id, type, content, checked, list_start, indent_level, position, created_at, group_id, pages!inner(user_id)').eq('pages.user_id', userId).order('position'),
    ]);

    const workspaces = (workspacesRes.data ?? []) as DbWorkspace[];
    const collections = (collectionsRes.data ?? []) as DbCollection[];
    const pages = (pagesRes.data ?? []) as DbPage[];
    const blocks = ((blocksRes.data ?? []) as any[]).map(({ pages: _, ...b }) => b) as DbBlock[]; // skipcq: JS-0323

    // If new user, seed workspaces + welcome collection + page
    if (workspaces.filter((w) => !w.deleted_at).length === 0) {
      const { data: recheck } = await supabase.from('workspaces').select('id').eq('user_id', userId).limit(1);
      if (recheck && recheck.length > 0) {
        get().refetch();
        return;
      }
      // Create Personal workspace first
      const personalWsId = uid();
      await supabase.from('workspaces').insert({ id: personalWsId, user_id: userId, name: 'Personal', position: 0 });
      // Create Work workspace (empty)
      await supabase.from('workspaces').insert({ id: uid(), user_id: userId, name: 'Work', position: 1 });

      const colId = uid();
      const pageId = uid();
      const { data: col } = await supabase.from('collections').insert({ id: colId, user_id: userId, name: 'Getting Started', position: 0, workspace_id: personalWsId }).select().single();
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
      localStorage.setItem('activeWorkspaceId', personalWsId);
      localStorage.setItem('parchment_new_user', 'true');

      const { data: freshWorkspaces } = await supabase.from('workspaces').select('*').eq('user_id', userId).order('position');
      useWorkspaceStore.getState().setWorkspaces((freshWorkspaces ?? []) as DbWorkspace[]);
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

    useWorkspaceStore.getState().setWorkspaces(workspaces);
    useBlockStore.getState().setBlocks(blocks);
    usePageStore.getState().setPages(pages);
    useCollectionStore.getState().setCollections(collections);
    set({
      activePageId: newActivePageId,
      activeCollectionId: newActiveCollectionId,
      loading: false,
    });
  },

  // skipcq: JS-R1005
  refetch: async () => {
    const { userId } = get();
    if (!userId) return;

    const [workspacesRes, collectionsRes, pagesRes, blocksRes] = await Promise.all([
      supabase.from('workspaces').select('*').eq('user_id', userId).order('position'),
      supabase.from('collections').select('*').eq('user_id', userId).order('position'),
      supabase.from('pages').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('blocks').select('id, page_id, type, content, checked, list_start, indent_level, position, created_at, group_id, pages!inner(user_id)').eq('pages.user_id', userId).order('position'),
    ]);

    const workspaces = (workspacesRes.data ?? []) as DbWorkspace[];
    const collections = (collectionsRes.data ?? []) as DbCollection[];
    const pages = (pagesRes.data ?? []) as DbPage[];
    const blocks = ((blocksRes.data ?? []) as any[]).map(({ pages: _, ...b }) => b) as DbBlock[]; // skipcq: JS-0323

    useWorkspaceStore.getState().setWorkspaces(workspaces);
    useBlockStore.getState().setBlocks(blocks);
    usePageStore.getState().setPages(pages);
    useCollectionStore.getState().setCollections(collections);
    set((s) => ({
      activePageId: s.activePageId && pages.some((p) => p.id === s.activePageId) ? s.activePageId : (pages[0]?.id ?? null),
      activeCollectionId: s.activeCollectionId && collections.some((c) => c.id === s.activeCollectionId) ? s.activeCollectionId : (collections[0]?.id ?? null),
    }));
  },

  // skipcq: JS-R1005
  setupRealtime: () => {
    const { userId } = get();
    if (!userId) return () => {}; // skipcq: JS-0321

    const handleRealtimeChange = () => {
      if (isInLocalCooldown()) return;
      clearTimeout((window as any).__syncTimer); // skipcq: JS-0323
      (window as any).__syncTimer = setTimeout(() => { // skipcq: JS-0323
        if (!isInLocalCooldown()) get().refetch();
      }, 1000);
    };

    const channel = supabase
      .channel('sync-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blocks' }, handleRealtimeChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pages' }, handleRealtimeChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, handleRealtimeChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspaces' }, handleRealtimeChange)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // skipcq: JS-R1005
  reset: () => {
    useWorkspaceStore.getState().resetWorkspaces();
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

  // skipcq: JS-R1005
  addWorkspace: async (name) => {
    const { userId } = get();
    if (!userId) return '';
    return await useWorkspaceStore.getState().addWorkspace(name, userId);
  },

  switchWorkspace: (id) => {
    useWorkspaceStore.getState().setActiveWorkspace(id);
    // Find the first available collection + page in the new workspace
    const { collections } = useCollectionStore.getState();
    const { pages } = usePageStore.getState();
    const wsCollections = collections
      .filter((c) => c.workspace_id === id && !c.deleted_at)
      .sort((a, b) => a.position - b.position);
    const firstCollection = wsCollections[0] ?? null;
    const firstPage = firstCollection
      ? pages.filter((p) => p.collection_id === firstCollection.id && !p.deleted_at)[0] ?? null
      : null;
    const newPageId = firstPage?.id ?? null;
    const newCollectionId = firstCollection?.id ?? null;
    if (newPageId) localStorage.setItem('activePageId', newPageId);
    else localStorage.removeItem('activePageId');
    if (newCollectionId) localStorage.setItem('activeCollectionId', newCollectionId);
    else localStorage.removeItem('activeCollectionId');
    set({ activePageId: newPageId, activeCollectionId: newCollectionId });
  },

  deleteWorkspace: async (id) => {
    const now = new Date().toISOString();
    // Soft-delete all collections in this workspace and their pages
    const { collections } = useCollectionStore.getState();
    const wsCollections = collections.filter((c) => c.workspace_id === id && !c.deleted_at);
    const wsCollectionIds = wsCollections.map((c) => c.id);

    if (wsCollectionIds.length > 0) {
      // Soft-delete collections
      await supabase.from('collections').update({ deleted_at: now }).in('id', wsCollectionIds);
      // Soft-delete their pages
      await supabase.from('pages').update({ deleted_at: now }).in('collection_id', wsCollectionIds).is('deleted_at', null);

      // Update local stores
      const pageStore = usePageStore.getState();
      pageStore.setPages(pageStore.pages.map((p) =>
        wsCollectionIds.includes(p.collection_id) && !p.deleted_at ? { ...p, deleted_at: now } : p
      ));
      useCollectionStore.getState().setCollections(
        collections.map((c) => wsCollectionIds.includes(c.id) ? { ...c, deleted_at: now } : c)
      );
    }

    await useWorkspaceStore.getState().deleteWorkspace(id);
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
    const workspaceId = useWorkspaceStore.getState().activeWorkspaceId;
    if (!workspaceId) return '';
    const id = await useCollectionStore.getState().addCollection(name, userId, workspaceId);
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
