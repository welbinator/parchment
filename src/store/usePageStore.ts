import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { PageType } from '@/types';
import { useBlockStore, markLocalMutation } from './useBlockStore';
import type { DbBlock } from './useBlockStore';

export interface DbPage {
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

function uid() {
  return crypto.randomUUID();
}

// Debounce for page title
let titleTimer: ReturnType<typeof setTimeout> | null = null;

interface PageState {
  pages: DbPage[];

  // Called by useAppStore during init/refetch
  setPages: (pages: DbPage[]) => void;
  resetPages: () => void;

  // Page CRUD
  addPage: (collectionId: string, userId: string, type?: PageType) => Promise<string>;
  updatePageTitle: (id: string, title: string) => Promise<void>;
  updatePageSharing: (id: string, updates: Partial<Pick<DbPage, 'share_enabled' | 'share_mode' | 'share_token' | 'shared_with_emails'>>) => void;
  deletePage: (id: string) => Promise<{ newActivePageId: string | null } | null>;
}

export const usePageStore = create<PageState>((set, get) => ({
  pages: [],

  setPages: (pages) => set({ pages }),
  resetPages: () => set({ pages: [] }),

  addPage: async (collectionId, userId, type = 'blank') => {
    if (!userId) return '';
    const id = uid();
    const { data: page } = await supabase.from('pages').insert({ id, user_id: userId, collection_id: collectionId, title: 'Untitled', type }).select().single();

    const defaultBlock: DbBlock = {
      id: uid(),
      page_id: id,
      type: type === 'checklist' ? 'todo' : 'text',
      content: '',
      position: 0,
      checked: type === 'checklist' ? false : null,
      list_start: null,
      indent_level: 0,
      created_at: new Date().toISOString(),
      group_id: null,
    };
    await supabase.from('blocks').insert(defaultBlock);

    if (page) {
      const blockStore = useBlockStore.getState();
      blockStore.setBlocks([...blockStore.blocks, defaultBlock]);

      set((s) => ({
        pages: [...s.pages, page],
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

    let newActivePageId: string | null = null;
    set((s) => {
      const activePages = s.pages.filter((p) => p.id !== id && !p.deleted_at);
      newActivePageId = activePages[0]?.id ?? null;
      return {
        pages: s.pages.map((p) => p.id === id ? { ...p, deleted_at: now } : p),
      };
    });

    // Return the suggested new active page so the caller (useAppStore) can update activePageId
    return { newActivePageId };
  },
}));
