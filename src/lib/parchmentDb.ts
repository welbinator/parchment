/**
 * parchmentDb.ts — Dexie.js IndexedDB cache layer
 *
 * Stores the four hot-path tables (workspaces, collections, pages, blocks)
 * locally so the app can render immediately from cache on load, then sync
 * with Supabase in the background.
 *
 * Design rules:
 *  - Cache at the DB row level (snake_case) to match what Supabase returns.
 *  - Soft-deleted rows ARE stored here (deleted_at !== null). Filtering
 *    happens in the Zustand stores, same as today. Trash still works.
 *  - The cache is keyed per user_id. On sign-out the entire cache is cleared.
 *  - Writes happen AFTER the Supabase round-trip confirms success, not at the
 *    optimistic step. This keeps the cache authoritative.
 *  - Cache is invalidated (full replace) on every successful refetch/init.
 *    It is never the source of truth — only a fast first-paint.
 */

import Dexie, { type Table } from 'dexie';
import type { DbWorkspace } from '@/store/useWorkspaceStore';
import type { DbCollection } from '@/store/useCollectionStore';
import type { DbPage } from '@/store/usePageStore';
import type { DbBlock } from '@/store/useBlockStore';

// ─── Schema ──────────────────────────────────────────────────────────────────

export interface CachedWorkspace extends DbWorkspace {
  _userId: string; // denormalised so we can bulk-clear by user
}
export interface CachedCollection extends DbCollection {
  _userId: string;
}
export interface CachedPage extends DbPage {
  _userId: string;
}
export interface CachedBlock extends DbBlock {
  _userId: string;
}

class ParchmentDatabase extends Dexie {
  workspaces!: Table<CachedWorkspace, string>;
  collections!: Table<CachedCollection, string>;
  pages!: Table<CachedPage, string>;
  blocks!: Table<CachedBlock, string>;

  constructor() {
    super('parchment_cache');
    this.version(1).stores({
      // Primary key first, then indexed fields. Non-indexed fields need no listing.
      workspaces:  'id, _userId',
      collections: 'id, _userId, workspace_id',
      pages:       'id, _userId, collection_id',
      blocks:      'id, _userId, page_id',
    });
  }
}

// Singleton — safe to import anywhere.
export const parchmentDb = new ParchmentDatabase();

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Load all cached data for a user.
 * Returns null if nothing is cached yet (first visit or after a cache clear).
 */
export async function loadFromCache(userId: string): Promise<{
  workspaces: DbWorkspace[];
  collections: DbCollection[];
  pages: DbPage[];
  blocks: DbBlock[];
} | null> {
  try {
    const [workspaces, collections, pages, blocks] = await Promise.all([
      parchmentDb.workspaces.where('_userId').equals(userId).toArray(),
      parchmentDb.collections.where('_userId').equals(userId).toArray(),
      parchmentDb.pages.where('_userId').equals(userId).toArray(),
      parchmentDb.blocks.where('_userId').equals(userId).toArray(),
    ]);

    // Nothing cached yet — return null so caller can show spinner normally.
    if (workspaces.length === 0 && collections.length === 0 && pages.length === 0) {
      return null;
    }

    // Strip the denormalised _userId field before handing rows to Zustand stores.
    return {
      workspaces: workspaces.map(({ _userId: _, ...w }) => w as DbWorkspace),
      collections: collections.map(({ _userId: _, ...c }) => c as DbCollection),
      pages: pages.map(({ _userId: _, ...p }) => p as DbPage),
      blocks: blocks.map(({ _userId: _, ...b }) => b as DbBlock),
    };
  } catch (err) {
    // IndexedDB can fail in private-browsing or storage-quota situations.
    // Silently return null — the app will just fetch from Supabase normally.
    console.warn('[parchmentDb] loadFromCache failed, falling back to network:', err);
    return null;
  }
}

/**
 * Replace the entire cache for a user with fresh data from Supabase.
 * Called after every successful init() or refetch().
 */
export async function saveToCache(
  userId: string,
  data: {
    workspaces: DbWorkspace[];
    collections: DbCollection[];
    pages: DbPage[];
    blocks: DbBlock[];
  }
): Promise<void> {
  try {
    await parchmentDb.transaction('rw', [
      parchmentDb.workspaces,
      parchmentDb.collections,
      parchmentDb.pages,
      parchmentDb.blocks,
    ], async () => {
      // Delete old rows for this user, then bulk-insert fresh data.
      await parchmentDb.workspaces.where('_userId').equals(userId).delete();
      await parchmentDb.collections.where('_userId').equals(userId).delete();
      await parchmentDb.pages.where('_userId').equals(userId).delete();
      await parchmentDb.blocks.where('_userId').equals(userId).delete();

      await parchmentDb.workspaces.bulkAdd(
        data.workspaces.map((w) => ({ ...w, _userId: userId }))
      );
      await parchmentDb.collections.bulkAdd(
        data.collections.map((c) => ({ ...c, _userId: userId }))
      );
      await parchmentDb.pages.bulkAdd(
        data.pages.map((p) => ({ ...p, _userId: userId }))
      );
      await parchmentDb.blocks.bulkAdd(
        data.blocks.map((b) => ({ ...b, _userId: userId }))
      );
    });
  } catch (err) {
    // Cache write failures are non-fatal. The app already has live Supabase data.
    console.warn('[parchmentDb] saveToCache failed:', err);
  }
}

/**
 * Remove all cached data for a user.
 * Called on sign-out so a new user on the same device starts clean.
 */
export async function clearCache(userId: string): Promise<void> {
  try {
    await parchmentDb.transaction('rw', [
      parchmentDb.workspaces,
      parchmentDb.collections,
      parchmentDb.pages,
      parchmentDb.blocks,
    ], async () => {
      await parchmentDb.workspaces.where('_userId').equals(userId).delete();
      await parchmentDb.collections.where('_userId').equals(userId).delete();
      await parchmentDb.pages.where('_userId').equals(userId).delete();
      await parchmentDb.blocks.where('_userId').equals(userId).delete();
    });
  } catch (err) {
    console.warn('[parchmentDb] clearCache failed:', err);
  }
}
