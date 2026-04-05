import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { markLocalMutation } from './useBlockStore';
import { usePageStore } from './usePageStore';

export interface DbCollection {
  id: string;
  name: string;
  icon: string | null;
  position: number;
  created_at: string;
  user_id: string;
  deleted_at: string | null;
}

function uid() {
  return crypto.randomUUID();
}

interface CollectionState {
  collections: DbCollection[];

  // Called by useAppStore during init/refetch
  setCollections: (collections: DbCollection[]) => void;
  resetCollections: () => void;

  // Collection CRUD
  addCollection: (name: string, userId: string) => Promise<string>;
  renameCollection: (id: string, name: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  reorderCollections: (orderedIds: string[]) => Promise<void>;
}

export const useCollectionStore = create<CollectionState>((set, get) => ({
  collections: [],

  setCollections: (collections) => set({ collections }),
  resetCollections: () => set({ collections: [] }),

  addCollection: async (name, userId) => {
    if (!userId) return '';
    const { collections } = get();
    const id = uid();
    const position = collections.length;
    const { data } = await supabase.from('collections').insert({ id, user_id: userId, name, position }).select().single();
    if (data) {
      set((s) => ({ collections: [...s.collections, data] }));
    }
    return id;
  },

  renameCollection: async (id, name) => {
    await supabase.from('collections').update({ name }).eq('id', id);
    set((s) => ({ collections: s.collections.map((c) => (c.id === id ? { ...c, name } : c)) }));
  },

  reorderCollections: async (orderedIds) => {
    // Optimistic update
    const { collections } = get();
    const reordered = orderedIds
      .map((id, index) => {
        const col = collections.find((c) => c.id === id);
        return col ? { ...col, position: index } : null;
      })
      .filter(Boolean) as typeof collections;
    // Keep any collections not in orderedIds (e.g. deleted) at the end
    const rest = collections.filter((c) => !orderedIds.includes(c.id));
    set({ collections: [...reordered, ...rest] });
    // Persist to Supabase
    await Promise.all(
      orderedIds.map((id, index) =>
        supabase.from('collections').update({ position: index }).eq('id', id)
      )
    );
  },

  deleteCollection: async (id) => {
    const now = new Date().toISOString();
    markLocalMutation();
    await supabase.from('collections').update({ deleted_at: now }).eq('id', id);
    await supabase.from('pages').update({ deleted_at: now }).match({ collection_id: id, deleted_at: null });

    // Update pages in page store
    const pageStore = usePageStore.getState();
    pageStore.setPages(pageStore.pages.map((p) => p.collection_id === id ? { ...p, deleted_at: now } : p));

    set((s) => ({
      collections: s.collections.map((c) => c.id === id ? { ...c, deleted_at: now } : c),
    }));
  },
}));
