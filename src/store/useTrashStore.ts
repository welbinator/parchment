import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { useBlockStore, markLocalMutation } from './useBlockStore';
import { usePageStore } from './usePageStore';
import { useCollectionStore } from './useCollectionStore';
import type { DbPage } from './usePageStore';
import type { DbCollection } from './useCollectionStore';

interface TrashState {
  trashedPages: () => DbPage[];
  trashedCollections: () => DbCollection[];
  restorePage: (id: string) => Promise<void>;
  restoreCollection: (id: string) => Promise<void>;
  permanentlyDeletePage: (id: string) => Promise<void>;
  permanentlyDeleteCollection: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
}

export const useTrashStore = create<TrashState>(() => ({
  trashedPages: () => usePageStore.getState().pages.filter((p) => p.deleted_at !== null),
  trashedCollections: () => useCollectionStore.getState().collections.filter((c) => c.deleted_at !== null),

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
    const collectionStore = useCollectionStore.getState();
    collectionStore.setCollections(collectionStore.collections.map((c) => c.id === id ? { ...c, deleted_at: null } : c));
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
    const collectionStore = useCollectionStore.getState();
    collectionStore.setCollections(collectionStore.collections.filter((c) => c.id !== id));
  },

  emptyTrash: async () => {
    const trashedPagesList = usePageStore.getState().pages.filter((p) => p.deleted_at !== null);
    const trashedCollectionsList = useCollectionStore.getState().collections.filter((c) => c.deleted_at !== null);
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
    const collectionStore = useCollectionStore.getState();
    collectionStore.setCollections(collectionStore.collections.filter((c) => !deletedColIds.includes(c.id)));
  },
}));
