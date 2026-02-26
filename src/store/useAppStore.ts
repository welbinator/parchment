import { create } from 'zustand';
import type { Collection, Page, Block, BlockType, PageType } from '@/types';

function uid() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

function createDefaultBlocks(type: PageType): Block[] {
  switch (type) {
    case 'checklist':
      return [
        { id: uid(), type: 'todo', content: '', checked: false },
      ];
    case 'roadmap':
      return [
        { id: uid(), type: 'heading2', content: 'Phase 1' },
        { id: uid(), type: 'todo', content: '', checked: false },
      ];
    default:
      return [
        { id: uid(), type: 'text', content: '' },
      ];
  }
}

interface AppState {
  collections: Collection[];
  pages: Page[];
  activePageId: string | null;
  activeCollectionId: string | null;
  sidebarOpen: boolean;

  // Actions
  setSidebarOpen: (open: boolean) => void;
  setActivePage: (id: string | null) => void;
  setActiveCollection: (id: string | null) => void;

  addCollection: (name: string) => string;
  renameCollection: (id: string, name: string) => void;
  deleteCollection: (id: string) => void;

  addPage: (collectionId: string, type?: PageType) => string;
  updatePageTitle: (id: string, title: string) => void;
  deletePage: (id: string) => void;

  addBlock: (pageId: string, afterBlockId: string | null, type?: BlockType) => string;
  updateBlock: (pageId: string, blockId: string, updates: Partial<Block>) => void;
  deleteBlock: (pageId: string, blockId: string) => void;
  changeBlockType: (pageId: string, blockId: string, type: BlockType) => void;
}

const defaultCollectionId = uid();
const defaultPageId = uid();

export const useAppStore = create<AppState>((set, get) => ({
  collections: [
    { id: defaultCollectionId, name: 'Getting Started', createdAt: now() },
  ],
  pages: [
    {
      id: defaultPageId,
      title: 'Welcome',
      type: 'blank',
      collectionId: defaultCollectionId,
      createdAt: now(),
      updatedAt: now(),
      blocks: [
        { id: uid(), type: 'heading1', content: 'Welcome to Parchment' },
        { id: uid(), type: 'text', content: 'A simple place for your thoughts. No databases, no complexity — just pages.' },
        { id: uid(), type: 'divider', content: '' },
        { id: uid(), type: 'heading2', content: 'Quick start' },
        { id: uid(), type: 'todo', content: 'Create a new collection in the sidebar', checked: false },
        { id: uid(), type: 'todo', content: 'Add a page to your collection', checked: false },
        { id: uid(), type: 'todo', content: 'Start writing — press / for block types', checked: false },
        { id: uid(), type: 'divider', content: '' },
        { id: uid(), type: 'quote', content: 'Simplicity is the ultimate sophistication.' },
      ],
    },
  ],
  activePageId: defaultPageId,
  activeCollectionId: defaultCollectionId,
  sidebarOpen: true,

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActivePage: (id) => set({ activePageId: id }),
  setActiveCollection: (id) => set({ activeCollectionId: id }),

  addCollection: (name) => {
    const id = uid();
    set((s) => ({
      collections: [...s.collections, { id, name, createdAt: now() }],
      activeCollectionId: id,
    }));
    return id;
  },

  renameCollection: (id, name) => {
    set((s) => ({
      collections: s.collections.map((c) => (c.id === id ? { ...c, name } : c)),
    }));
  },

  deleteCollection: (id) => {
    set((s) => ({
      collections: s.collections.filter((c) => c.id !== id),
      pages: s.pages.filter((p) => p.collectionId !== id),
      activeCollectionId: s.activeCollectionId === id ? null : s.activeCollectionId,
      activePageId: s.pages.find((p) => p.id === s.activePageId)?.collectionId === id ? null : s.activePageId,
    }));
  },

  addPage: (collectionId, type = 'blank') => {
    const id = uid();
    set((s) => ({
      pages: [...s.pages, {
        id,
        title: 'Untitled',
        type,
        collectionId,
        createdAt: now(),
        updatedAt: now(),
        blocks: createDefaultBlocks(type),
      }],
      activePageId: id,
      activeCollectionId: collectionId,
    }));
    return id;
  },

  updatePageTitle: (id, title) => {
    set((s) => ({
      pages: s.pages.map((p) => (p.id === id ? { ...p, title, updatedAt: now() } : p)),
    }));
  },

  deletePage: (id) => {
    set((s) => {
      const remaining = s.pages.filter((p) => p.id !== id);
      return {
        pages: remaining,
        activePageId: s.activePageId === id ? (remaining[0]?.id ?? null) : s.activePageId,
      };
    });
  },

  addBlock: (pageId, afterBlockId, type = 'text') => {
    const blockId = uid();
    set((s) => ({
      pages: s.pages.map((p) => {
        if (p.id !== pageId) return p;
        const newBlock: Block = { id: blockId, type, content: '', ...(type === 'todo' ? { checked: false } : {}) };
        if (!afterBlockId) return { ...p, blocks: [...p.blocks, newBlock], updatedAt: now() };
        const idx = p.blocks.findIndex((b) => b.id === afterBlockId);
        const blocks = [...p.blocks];
        blocks.splice(idx + 1, 0, newBlock);
        return { ...p, blocks, updatedAt: now() };
      }),
    }));
    return blockId;
  },

  updateBlock: (pageId, blockId, updates) => {
    set((s) => ({
      pages: s.pages.map((p) => {
        if (p.id !== pageId) return p;
        return {
          ...p,
          blocks: p.blocks.map((b) => (b.id === blockId ? { ...b, ...updates } : b)),
          updatedAt: now(),
        };
      }),
    }));
  },

  deleteBlock: (pageId, blockId) => {
    set((s) => ({
      pages: s.pages.map((p) => {
        if (p.id !== pageId) return p;
        const blocks = p.blocks.filter((b) => b.id !== blockId);
        return { ...p, blocks: blocks.length ? blocks : [{ id: uid(), type: 'text', content: '' }], updatedAt: now() };
      }),
    }));
  },

  changeBlockType: (pageId, blockId, type) => {
    set((s) => ({
      pages: s.pages.map((p) => {
        if (p.id !== pageId) return p;
        return {
          ...p,
          blocks: p.blocks.map((b) =>
            b.id === blockId ? { ...b, type, ...(type === 'todo' ? { checked: false } : {}) } : b
          ),
          updatedAt: now(),
        };
      }),
    }));
  },
}));
