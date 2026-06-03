import type { RecentlyPlayedItem } from '@/types';

const STORAGE_KEY = 'sp_play_history';
// Keep at most this many plays in storage (most-recent first)
const MAX_STORED = 2000;

function load(): RecentlyPlayedItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentlyPlayedItem[];
  } catch {
    return [];
  }
}

function save(items: RecentlyPlayedItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Quota exceeded — silently drop
  }
}

/**
 * Merges freshly-fetched plays into the persisted history.
 * Deduplicates by `played_at` timestamp (Spotify's cursors guarantee uniqueness).
 * Returns the full merged history, newest first, capped at MAX_STORED.
 */
export function mergeAndPersistPlays(
  fresh: RecentlyPlayedItem[]
): RecentlyPlayedItem[] {
  const existing = load();
  const seen = new Set(existing.map((i) => i.played_at));

  const merged = [
    ...existing,
    ...fresh.filter((i) => !seen.has(i.played_at)),
  ];

  // Sort newest-first and cap
  merged.sort(
    (a, b) =>
      new Date(b.played_at).getTime() - new Date(a.played_at).getTime()
  );
  const capped = merged.slice(0, MAX_STORED);
  save(capped);
  return capped;
}

/**
 * Returns all stored plays that fall within the given start time (ms since epoch).
 * Pass 0 to get everything.
 */
export function getStoredPlays(sinceMs: number): RecentlyPlayedItem[] {
  const all = load();
  if (sinceMs === 0) return all;
  return all.filter((i) => new Date(i.played_at).getTime() >= sinceMs);
}

/** Returns the total count of stored play records for display purposes. */
export function getStoredPlayCount(): number {
  return load().length;
}

/** Clears all stored play history (e.g. on logout). */
export function clearPlayHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
