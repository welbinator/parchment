/**
 * mutationTracker.ts — Lightweight version counter for non-block mutations.
 *
 * Problem: When the app loads with a cache, the Zustand stores are hydrated
 * immediately and the UI is interactive. Meanwhile a background Supabase fetch
 * is in flight. If the user makes a mutation (add collection, delete page, etc.)
 * before that fetch returns, the fetch result will be stale — it was issued
 * before the mutation — and applying it would clobber the user's action.
 *
 * Fix: Every non-block mutation bumps this counter before doing any async work.
 * init() and refetch() capture the version before firing their Supabase fetch,
 * and skip the store overwrite if the version changed while they were waiting.
 * The realtime subscription will trigger a fresh corrective refetch once the
 * mutation's Supabase write completes.
 *
 * Blocks have their own per-block pending tracking (pendingBlockIds in
 * useBlockStore). This covers everything else: collections, pages, workspaces.
 */

let _version = 0;

export function bumpMutationVersion(): void {
  _version++;
}

export function getMutationVersion(): number {
  return _version;
}
