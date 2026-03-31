import { create } from 'zustand';

interface SelectionState {
  selectionMode: boolean;
  selectedIds: Set<string>;

  enterSelectionMode: () => void;
  exitSelectionMode: () => void;
  toggleBlock: (id: string, allIds?: string[], shiftAnchor?: string | null) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  setShiftAnchor: (id: string | null) => void;
  shiftAnchorId: string | null;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectionMode: false,
  selectedIds: new Set(),
  shiftAnchorId: null,

  enterSelectionMode: () => set({ selectionMode: true }),

  exitSelectionMode: () =>
    set({ selectionMode: false, selectedIds: new Set(), shiftAnchorId: null }),

  clearSelection: () =>
    set({ selectedIds: new Set(), shiftAnchorId: null }),

  setShiftAnchor: (id) => set({ shiftAnchorId: id }),

  toggleBlock: (id, allIds, shiftAnchor) => {
    const { selectedIds } = get();
    const next = new Set(selectedIds);

    if (shiftAnchor && allIds && allIds.includes(shiftAnchor)) {
      // Select range between anchor and clicked id
      const anchorIdx = allIds.indexOf(shiftAnchor);
      const clickIdx = allIds.indexOf(id);
      const [from, to] = anchorIdx < clickIdx
        ? [anchorIdx, clickIdx]
        : [clickIdx, anchorIdx];
      for (let i = from; i <= to; i++) next.add(allIds[i]);
    } else {
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
    }

    set({ selectedIds: next, shiftAnchorId: id });
  },

  selectAll: (ids) =>
    set({ selectedIds: new Set(ids), shiftAnchorId: null }),
}));
