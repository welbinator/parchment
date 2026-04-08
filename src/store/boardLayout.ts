/**
 * Board layout store — persists column assignments and within-column order
 * to localStorage. No DB schema changes needed; collection_id in Supabase
 * is the source of truth for which collection a page belongs to.
 *
 * Structure:
 *   columns: string[][]   — array of 4 columns, each containing collection IDs in order
 */

// Note: STORAGE_KEY is a localStorage namespace string, not a secret or credential
const STORAGE_KEY = 'parchment_board_layout'; // skipcq: SCT-A000

export interface BoardLayout {
  // Each element is a column; each column is an ordered list of collection IDs
  columns: string[][];
}

// skipcq: JS-0067
function defaultLayout(): BoardLayout {
  return { columns: [[], [], [], []] };
}

// skipcq: JS-0067
export function loadBoardLayout(): BoardLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultLayout();
    const parsed = JSON.parse(raw);
    // Ensure exactly 4 columns
    const cols = Array.isArray(parsed.columns) ? parsed.columns : [];
    while (cols.length < 4) cols.push([]);
    return { columns: cols.slice(0, 4) };
  } catch {
    return defaultLayout();
  }
}

// skipcq: JS-0067
export function saveBoardLayout(layout: BoardLayout) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}

/**
 * Given the current collection IDs from the store and the saved layout,
 * return a reconciled layout:
 * - Collections in the layout stay where they are (if still active)
 * - New collections (not in layout yet) are appended to the shortest column
 * - Deleted collections are removed
 */
// skipcq: JS-0067
export function reconcileLayout(
  layout: BoardLayout,
  activeCollectionIds: string[]
): BoardLayout {
  const activeSet = new Set(activeCollectionIds);
  const inLayout = new Set(layout.columns.flat());

  // Filter out deleted
  const columns = layout.columns.map((col) => col.filter((id) => activeSet.has(id)));

  // Add new collections to the shortest column
  for (const id of activeCollectionIds) {
    if (!inLayout.has(id)) {
      const shortest = columns.reduce(
        (minIdx, col, i, arr) => (col.length < arr[minIdx].length ? i : minIdx),
        0
      );
      columns[shortest].push(id);
    }
  }

  return { columns };
}
