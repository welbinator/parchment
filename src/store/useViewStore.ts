import { create } from 'zustand';

type ViewMode = 'list' | 'kanban';

interface ViewStore {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

export const useViewStore = create<ViewStore>((set) => ({
  viewMode: (localStorage.getItem('parchment_view_mode') as ViewMode) || 'list',
  setViewMode: (mode) => {
    localStorage.setItem('parchment_view_mode', mode);
    set({ viewMode: mode });
  },
}));
