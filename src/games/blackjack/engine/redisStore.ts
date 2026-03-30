/* ============================================================================
   Blackjack – Redis-backed Game Store
   Replaces the Postgres blackjack_active_game table for active game state.
   Postgres is only used for settled rounds (blackjack_round table).

   TTL: 24h — abandoned games auto-expire.
   API is identical to gameStore.ts so the service layer requires no changes.
   ============================================================================ */

import { getRedis } from "../../../lib/redis";
import type { BlackjackGameState } from "./types";

const TTL_SECONDS = 86_400; // 24h

function key(userId: string): string {
  return `blackjack:game:${userId}`;
}

/* ============================================================================
   Public API
   ============================================================================ */

/**
 * Returns true if the user has an active (non-finished) blackjack game.
 * Lightweight check used by plinko/roulette to block concurrent play.
 */
export async function hasActiveBlackjackGame(userId: string): Promise<boolean> {
  const raw = await getRedis().get(key(userId));
  if (!raw) return false;
  const game = JSON.parse(raw) as { phase?: string };
  return game.phase !== undefined && game.phase !== "finished";
}

/**
 * Get the active (non-finished) game for a user, or undefined if none exists.
 */
export async function getActiveGame(
  userId: string,
): Promise<BlackjackGameState | undefined> {
  const raw = await getRedis().get(key(userId));
  if (!raw) return undefined;
  const game = JSON.parse(raw) as BlackjackGameState;
  if (game.phase === "finished") return undefined;
  return game;
}

/**
 * Like getActiveGame but also returns the raw JSON string.
 * Used by the service layer for optimistic locking (compareAndSaveGame).
 */
export async function getActiveGameWithRaw(
  userId: string,
): Promise<{ game: BlackjackGameState; raw: string } | undefined> {
  const raw = await getRedis().get(key(userId));
  if (!raw) return undefined;
  const game = JSON.parse(raw) as BlackjackGameState;
  if (game.phase === "finished") return undefined;
  return { game, raw };
}

/**
 * Get any game for a user (including finished), or undefined.
 */
export async function getGameForUser(
  userId: string,
): Promise<BlackjackGameState | undefined> {
  const raw = await getRedis().get(key(userId));
  if (!raw) return undefined;
  return JSON.parse(raw) as BlackjackGameState;
}

/**
 * Save (create or update) a game. Refreshes TTL on every write.
 */
export async function saveGame(game: BlackjackGameState): Promise<void> {
  await getRedis().set(key(game.userId), JSON.stringify(game), "EX", TTL_SECONDS);
}

// Lua script: set key to newVal with TTL only if current value equals expected.
// Returns 1 on success, 0 on conflict. Executed atomically on Redis server.
const CAS_LUA = [
  "local cur = redis.call('GET', KEYS[1])",
  "if cur == ARGV[1] then",
  "  redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])",
  "  return 1",
  "end",
  "return 0",
].join("\n");

/**
 * Compare-and-save: atomically writes `game` only if the key still holds
 * `expectedRaw` (the raw JSON captured before the caller mutated state).
 * Uses a Lua script for atomicity — no dedicated connection needed.
 *
 * Returns true on success, false on conflict (concurrent write detected).
 */
export async function compareAndSaveGame(
  game: BlackjackGameState,
  expectedRaw: string,
): Promise<boolean> {
  const result = await getRedis().eval(
    CAS_LUA,
    1,
    key(game.userId),
    expectedRaw,
    JSON.stringify(game),
    String(TTL_SECONDS),
  );
  return result === 1;
}

/**
 * Clear/remove a user's game from the store.
 */
export async function clearGame(userId: string): Promise<void> {
  await getRedis().del(key(userId));
}

/**
 * Mark the game as already persisted to the blackjack_round table.
 * Patches the persisted flag in Redis without a full rewrite.
 */
export async function markPersisted(gameId: string): Promise<void> {
  // We don't have a userId here — scan approach would be expensive.
  // Instead the service layer sets persisted=true via saveGame after persistRound.
  // This is a no-op stub kept for API compatibility.
  void gameId;
}
