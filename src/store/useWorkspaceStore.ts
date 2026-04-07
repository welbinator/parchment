import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export interface DbWorkspace {
  id: string;
  user_id: string;
  name: string;
  position: number;
  created_at: string;
  deleted_at: string | null;
}

interface WorkspaceState {
  workspaces: DbWorkspace[];
  activeWorkspaceId: string | null;

  // Called by useAppStore during init/refetch
  setWorkspaces: (workspaces: DbWorkspace[]) => void;
  resetWorkspaces: () => void;

  // Active workspace
  setActiveWorkspace: (id: string) => void;

  // CRUD
  addWorkspace: (name: string, userId: string) => Promise<string>;
  renameWorkspace: (id: string, name: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: localStorage.getItem('activeWorkspaceId') || null,

  setWorkspaces: (workspaces) => {
    set((s) => {
      // Persist active workspace — default to first non-deleted if current is gone
      const active = s.activeWorkspaceId;
      const valid = workspaces.filter((w) => !w.deleted_at);
      const still = valid.find((w) => w.id === active);
      const newActive = still ? still.id : (valid[0]?.id ?? null);
      if (newActive) localStorage.setItem('activeWorkspaceId', newActive);
      return { workspaces, activeWorkspaceId: newActive };
    });
  },

  resetWorkspaces: () => set({ workspaces: [], activeWorkspaceId: null }),

  setActiveWorkspace: (id) => {
    localStorage.setItem('activeWorkspaceId', id);
    set({ activeWorkspaceId: id });
  },

  addWorkspace: async (name, userId) => {
    const { workspaces } = get();
    const active = workspaces.filter((w) => !w.deleted_at);
    const position = active.length;
    const { data } = await supabase
      .from('workspaces')
      .insert({ user_id: userId, name, position })
      .select()
      .single();
    if (data) {
      set((s) => ({ workspaces: [...s.workspaces, data as DbWorkspace] }));
      return data.id;
    }
    return '';
  },

  renameWorkspace: async (id, name) => {
    await supabase.from('workspaces').update({ name }).eq('id', id);
    set((s) => ({
      workspaces: s.workspaces.map((w) => (w.id === id ? { ...w, name } : w)),
    }));
  },

  deleteWorkspace: async (id) => {
    const now = new Date().toISOString();
    await supabase.from('workspaces').update({ deleted_at: now }).eq('id', id);
    set((s) => ({
      workspaces: s.workspaces.map((w) => (w.id === id ? { ...w, deleted_at: now } : w)),
    }));
    // Switch to another workspace if this one was active
    const { activeWorkspaceId, workspaces } = get();
    if (activeWorkspaceId === id) {
      const next = workspaces.find((w) => !w.deleted_at && w.id !== id);
      if (next) get().setActiveWorkspace(next.id);
    }
  },
}));
