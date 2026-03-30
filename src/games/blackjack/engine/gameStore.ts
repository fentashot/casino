/* ============================================================================
   Blackjack – DB-backed Game Store
   Replaces the previous in-memory Map with PostgreSQL persistence via the
   blackjack_active_game table. Falls back gracefully: if the DB call fails
   the error propagates and the service layer handles it.

   API is intentionally identical to the previous in-memory version so the
   service layer requires no changes beyond import paths.
   ============================================================================ */

import { eq } from "drizzle-orm";
import { db } from "../../../db/postgres";
import { blackjackActiveGame } from "../../../db/schema";
import type { BlackjackGameState } from "./types";

/* ============================================================================
   Public API
   ============================================================================ */

/**
 * Get the active (non-finished) game for a user, or undefined if none exists.
 */
export async function getActiveGame(
  userId: string,
): Promise<BlackjackGameState | undefined> {
  const row = await db.query.blackjackActiveGame.findFirst({
    where: eq(blackjackActiveGame.userId, userId),
  });

  if (!row) return undefined;
  const game = row.state as BlackjackGameState;
  if (game.phase === "finished") return undefined;
  return game;
}

/**
 * Get any game for a user (including finished), or undefined.
 */
export async function getGameForUser(
  userId: string,
): Promise<BlackjackGameState | undefined> {
  const row = await db.query.blackjackActiveGame.findFirst({
    where: eq(blackjackActiveGame.userId, userId),
  });

  return row ? (row.state as BlackjackGameState) : undefined;
}

/**
 * Save (create or update) a game in the store.
 */
export async function saveGame(game: BlackjackGameState): Promise<void> {
  const existing = await db.query.blackjackActiveGame.findFirst({
    where: eq(blackjackActiveGame.userId, game.userId),
    columns: { gameId: true },
  });

  const isSameGame = existing?.gameId === game.id;

  await db
    .insert(blackjackActiveGame)
    .values({
      userId: game.userId,
      gameId: game.id,
      state: game,
      persisted: isSameGame ? true : false,
    })
    .onConflictDoUpdate({
      target: blackjackActiveGame.userId,
      set: {
        gameId: game.id,
        state: game,
        persisted: isSameGame ? true : false,
        updatedAt: new Date(),
      },
    });
}

/**
 * Clear/remove a user's game from the store.
 */
export async function clearGame(userId: string): Promise<void> {
  await db
    .delete(blackjackActiveGame)
    .where(eq(blackjackActiveGame.userId, userId));
}

/**
 * Mark a game as already persisted to the blackjack_round table.
 */
export async function markPersisted(gameId: string): Promise<void> {
  await db
    .update(blackjackActiveGame)
    .set({ persisted: true })
    .where(eq(blackjackActiveGame.gameId, gameId));
}
