/* ============================================================================
   Blackjack – In-Memory Game Store
   Per-user game state persistence with TTL-based cleanup to prevent
   memory leaks from abandoned games.
   ============================================================================ */

import type { BlackjackGameState } from "./types";

/** How long a finished game stays in memory before being garbage-collected */
const FINISHED_GAME_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** How long an active (non-finished) game stays before being considered abandoned */
const ACTIVE_GAME_TTL_MS = 60 * 60 * 1000; // 1 hour

/** How often the cleanup sweep runs */
const CLEANUP_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

interface StoredGame {
  game: BlackjackGameState;
  /** Timestamp (ms) when this entry was last touched */
  lastTouched: number;
}

/** Game store keyed by gameId */
const gameStore = new Map<string, StoredGame>();

/** userId → gameId mapping for quick lookups */
const userGameMap = new Map<string, string>();

/**
 * Tracks gameIds that have already been written to the DB.
 * Owned by the store (not the value object) so saveGame() can never
 * accidentally clobber the flag by overwriting the game state.
 */
const persistedIds = new Set<string>();

/* ============================================================================
   Public API
   ============================================================================ */

/**
 * Get the active (non-finished) game for a user, or undefined if none exists.
 */
export function getActiveGame(
  userId: string,
): BlackjackGameState | undefined {
  const gameId = userGameMap.get(userId);
  if (!gameId) return undefined;

  const entry = gameStore.get(gameId);
  if (!entry || entry.game.phase === "finished") return undefined;

  // Touch the entry to keep it alive
  entry.lastTouched = Date.now();
  return entry.game;
}

/**
 * Get any game for a user (including finished), or undefined.
 * Does NOT touch the entry — used for one-time reads like returning
 * a finished game to the client before clearing.
 */
export function getGameForUser(
  userId: string,
): BlackjackGameState | undefined {
  const gameId = userGameMap.get(userId);
  if (!gameId) return undefined;

  const entry = gameStore.get(gameId);
  return entry?.game;
}

/**
 * Save (create or update) a game in the store.
 */
export function saveGame(game: BlackjackGameState): void {
  const entry: StoredGame = {
    game,
    lastTouched: Date.now(),
  };
  gameStore.set(game.id, entry);
  userGameMap.set(game.userId, game.id);
}

/**
 * Clear/remove a user's game from the store.
 */
export function clearGame(userId: string): void {
  const gameId = userGameMap.get(userId);
  if (gameId) {
    gameStore.delete(gameId);
    userGameMap.delete(userId);
    persistedIds.delete(gameId);
  }
}

/**
 * Mark a game as already persisted to the DB.
 * Called before the actual INSERT so concurrent paths see the flag immediately.
 */
export function markPersisted(gameId: string): void {
  persistedIds.add(gameId);
}

/**
 * Returns true if this game has already been written to the DB.
 */
export function isPersisted(gameId: string): boolean {
  return persistedIds.has(gameId);
}

/**
 * Get store statistics (for monitoring/debugging).
 */
export function getStoreStats(): {
  totalGames: number;
  totalUsers: number;
} {
  return {
    totalGames: gameStore.size,
    totalUsers: userGameMap.size,
  };
}

/* ============================================================================
   TTL-based Cleanup
   Runs periodically to remove stale entries and prevent memory leaks.
   ============================================================================ */

function cleanupStaleEntries(): void {
  const now = Date.now();
  const staleGameIds: string[] = [];

  for (const [gameId, entry] of gameStore) {
    const age = now - entry.lastTouched;
    const isFinished = entry.game.phase === "finished";

    const ttl = isFinished ? FINISHED_GAME_TTL_MS : ACTIVE_GAME_TTL_MS;

    if (age > ttl) {
      staleGameIds.push(gameId);
    }
  }

  for (const gameId of staleGameIds) {
    const entry = gameStore.get(gameId);
    if (entry) {
      userGameMap.delete(entry.game.userId);
      gameStore.delete(gameId);
    }
  }
}

// Start the periodic cleanup. Using unref() so this timer doesn't
// prevent the Node/Bun process from exiting gracefully.
const cleanupTimer = setInterval(cleanupStaleEntries, CLEANUP_INTERVAL_MS);
if (typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
  cleanupTimer.unref();
}
