/* ============================================================================
   Blackjack Service — orchestrates game logic, balance sync, and persistence.

   Game logic (pure functions) lives in ./engine/.
   DB operations use centralized query helpers from db/queries/.
   This service is the glue between them.
   ============================================================================ */

import { type Result, ok, err, ErrorCode } from "../../lib/errors";
import { db } from "../../db/postgres";
import { blackjackRound, userBalance } from "../../db/schema";
import { balanceQueries } from "../../db/queries";
import * as crypto from "crypto";
import { eq, sql } from "drizzle-orm";
import type { BlackjackGameState } from "./engine";
import {
  hydrateShoe,
  persistShoe,
  dealGame,
  resolveInsurance,
  hitHand,
  standHand,
  doubleDown,
  splitHand,
  resolveDealerAndSettle,
  shouldTriggerDealer,
  sanitizeGame,
  getActiveGame,
  getActiveGameWithRaw,
  getGameForUser,
  saveGame,
  compareAndSaveGame,
  clearGame,
  getShoeInfo,
  canSplit,
  markPersisted,
} from "./engine";
import type { GameStateResult, ShoeInfoResult, HandSnapshot } from "./types";

/* ============================================================================
   Types
   ============================================================================ */

type InsuranceDecision = "take" | "skip";
type PlayerAction = "hit" | "stand" | "double" | "split";

/* ============================================================================
   Game State
   ============================================================================ */

export async function getState(
  userId: string,
): Promise<Result<GameStateResult>> {
  await hydrateShoe(userId);

  // Check for active (non-finished) game
  const active = await getActiveGame(userId);
  if (active) {
    return ok({ game: sanitizeGame(active) });
  }

  // Check for finished game to return once (UI continuity)
  const finished = await getGameForUser(userId);
  if (finished && finished.phase === "finished") {
    await persistRound(userId, finished);
    // Balance was already applied during settlement — just clear the game
    await clearGame(userId);
    return ok({ game: sanitizeGame(finished) });
  }

  return ok({ game: null });
}

/* ============================================================================
   Deal — Start a new round
   ============================================================================ */

export async function deal(
  userId: string,
  bet: number,
): Promise<Result<GameStateResult>> {
  await hydrateShoe(userId);

  // Check Redis for existing active game before touching DB
  const existingGame = await getActiveGame(userId);
  if (existingGame) {
    return err(ErrorCode.ACTIVE_GAME_EXISTS, "Finish or clear your current game first");
  }

  const txResult = await db.transaction(async (tx) => {
    await tx
      .insert(userBalance)
      .values({ userId, balance: "100000.00", lastNonce: 0 })
      .onConflictDoNothing();

    const lockedBalance = await tx.execute(
      sql`SELECT balance FROM user_balance
          WHERE user_id = ${userId}
          FOR UPDATE`,
    );
    if (lockedBalance.length === 0) {
      return { errorCode: ErrorCode.INTERNAL_ERROR } as const;
    }

    const currentBalance = Number((lockedBalance[0] as { balance: string }).balance);
    if (currentBalance < bet) {
      return { errorCode: ErrorCode.INSUFFICIENT_FUNDS } as const;
    }

    const nextGame = await dealGame(bet, currentBalance, userId);

    await tx
      .update(userBalance)
      .set({ balance: nextGame.balance.toString() })
      .where(eq(userBalance.userId, userId));

    return { game: nextGame };
  });

  if ("errorCode" in txResult && txResult.errorCode === ErrorCode.INSUFFICIENT_FUNDS) {
    return err(ErrorCode.INSUFFICIENT_FUNDS, "Insufficient funds");
  }
  if ("errorCode" in txResult && txResult.errorCode === ErrorCode.INTERNAL_ERROR) {
    return err(ErrorCode.INTERNAL_ERROR, "Failed to start game");
  }

  await saveGame(txResult.game);
  await persistShoe(userId);
  return ok({ game: sanitizeGame(txResult.game) });
}

/* ============================================================================
   Insurance
   ============================================================================ */

export async function handleInsurance(
  userId: string,
  decision: InsuranceDecision,
): Promise<Result<GameStateResult>> {
  const entry = await getActiveGameWithRaw(userId);
  if (!entry) {
    return err(ErrorCode.NO_ACTIVE_GAME);
  }
  const { game, raw: expectedRaw } = entry;

  if (game.phase !== "insurance") {
    return err(ErrorCode.INSURANCE_NOT_AVAILABLE);
  }

  let updated: BlackjackGameState;
  try {
    await hydrateShoe(userId);
    updated = resolveInsurance(game, decision);
  } catch (e) {
    return err(ErrorCode.INSUFFICIENT_FUNDS, (e as Error).message);
  }

  const insuranceDelta = updated.balance - game.balance;
  try {
    await applyDelta(userId, insuranceDelta);
  } catch (e) {
    return err(ErrorCode.INSUFFICIENT_FUNDS, (e as Error).message);
  }

  if (updated.phase === "finished") {
    await persistRound(userId, updated);
  }

  const saved = await compareAndSaveGame(updated, expectedRaw);
  if (!saved) {
    return err(ErrorCode.INTERNAL_ERROR, "Concurrent modification detected, please retry");
  }
  await persistShoe(userId);
  return ok({ game: sanitizeGame(updated) });
}

/* ============================================================================
   Player Action — hit / stand / double / split
   ============================================================================ */

export async function handleAction(
  userId: string,
  action: PlayerAction,
): Promise<Result<GameStateResult>> {
  const entry = await getActiveGameWithRaw(userId);
  if (!entry) {
    return err(ErrorCode.NO_ACTIVE_GAME);
  }
  const { game, raw: expectedRaw } = entry;

  if (game.phase === "insurance") {
    return err(ErrorCode.INSURANCE_PENDING);
  }

  if (game.phase !== "playing") {
    return err(ErrorCode.NOT_YOUR_TURN);
  }

  const hand = game.playerHands[game.activeHandIndex];
  if (!hand) {
    return err(ErrorCode.NO_ACTIVE_HAND);
  }

  if (hand.splitAces) {
    return err(ErrorCode.SPLIT_ACES_NO_ACTIONS);
  }

  // Pre-action validations
  const validationError = validateAction(action, game, hand);
  if (validationError) return validationError;

  // Execute action (pure logic)
  let updated: BlackjackGameState;
  try {
    await hydrateShoe(userId);
    updated = await executeAction(action, game);
  } catch (e) {
    return err(ErrorCode.VALIDATION_ERROR, (e as Error).message);
  }

  // Trigger dealer play when all hands are done
  if (shouldTriggerDealer(updated)) {
    updated = await resolveDealerAndSettle(updated);
  }

  // Apply delta to DB balance (never overwrite with stale snapshot)
  if (action === "double" || action === "split" || updated.phase === "finished") {
    const delta = updated.balance - game.balance;
    try {
      await applyDelta(userId, delta);
    } catch (e) {
      return err(ErrorCode.INSUFFICIENT_FUNDS, (e as Error).message);
    }
  }

  if (updated.phase === "finished") {
    await persistRound(userId, updated);
  }

  const saved = await compareAndSaveGame(updated, expectedRaw);
  if (!saved) {
    return err(ErrorCode.INTERNAL_ERROR, "Concurrent modification detected, please retry");
  }
  await persistShoe(userId);
  return ok({ game: sanitizeGame(updated) });
}

/* ============================================================================
   Clear — clear a finished game
   ============================================================================ */

export async function clearFinishedGame(
  userId: string,
): Promise<Result<{ ok: true }>> {
  const game = await getGameForUser(userId);
  if (game && game.phase === "finished") {
    // persistRound is idempotent — safe to call even if already persisted.
    await persistRound(userId, game);
    // Balance delta was already applied during settlement — no sync needed here
  }

  await clearGame(userId);
  return ok({ ok: true });
}

/* ============================================================================
   Shoe Info
   ============================================================================ */

export async function getShoeInfoForUser(userId: string): Promise<Result<ShoeInfoResult>> {
  const info = await getShoeInfo(userId);
  if (!info) {
    return ok({ cardsRemaining: null, penetration: null });
  }
  return ok(info);
}

/* ============================================================================
   Internal Helpers — Balance
   ============================================================================ */

/**
 * Apply a signed balance delta atomically to the DB.
 * Always uses balance += delta, never overwrites with a stale snapshot.
 * Returns the new DB balance, or throws if it would go negative.
 */
async function applyDelta(userId: string, delta: number): Promise<number> {
  if (delta === 0) {
    const row = await balanceQueries.getBalanceAmount(userId);
    return Number(row?.balance ?? 0);
  }
  const result = await balanceQueries.applyBalanceDelta(userId, delta);
  if (!result) {
    throw new Error("balance_went_negative");
  }
  return result.newBalance;
}

/* ============================================================================
   Internal Helpers — Round Persistence (inlined from blackjackRound.repository.ts)
   ============================================================================ */

async function persistRound(
  userId: string,
  game: BlackjackGameState,
): Promise<void> {
  let totalBet = 0;
  let totalWin = 0;

  for (const hand of game.playerHands) {
    totalBet += hand.bet;
    if (hand.insuranceBet) totalBet += hand.insuranceBet;

    const result = hand.result;
    if (result === "blackjack") totalWin += Math.floor(hand.bet * 2.5);
    else if (result === "win") totalWin += hand.bet * 2;
    else if (result === "push") totalWin += hand.bet;

    if (hand.insuranceBet && hand.insuranceResult === "win") {
      totalWin += hand.insuranceBet * 3;
    }
  }

  const handsSnapshot: HandSnapshot[] = game.playerHands.map((h) => ({
    result: h.result ?? "loss",
    bet: h.bet,
    doubled: h.doubled ?? false,
    splitAces: h.splitAces ?? false,
  }));

  await db.insert(blackjackRound).values({
    id: crypto.randomBytes(16).toString("hex"),
    gameId: game.id,
    userId,
    totalBet: totalBet.toString(),
    totalWin: totalWin.toString(),
    handsSnapshot,
    balanceAfter: game.balance.toString(),
  }).onConflictDoNothing({ target: blackjackRound.gameId });

  await markPersisted(game.id);
}

/* ============================================================================
   Internal Helpers — Action Validation
   ============================================================================ */

function validateAction(
  action: PlayerAction,
  game: BlackjackGameState,
  hand: BlackjackGameState["playerHands"][0],
): Result<never> | undefined {
  switch (action) {
    case "double":
      if (hand.cards.length !== 2) {
        return err(ErrorCode.CANNOT_DOUBLE_NOW);
      }
      if (game.balance < hand.bet) {
        return err(ErrorCode.INSUFFICIENT_FUNDS);
      }
      return undefined;

    case "split":
      if (!canSplit(hand.cards)) {
        return err(ErrorCode.CANNOT_SPLIT);
      }
      if (game.balance < hand.bet) {
        return err(ErrorCode.INSUFFICIENT_FUNDS);
      }
      return undefined;

    default:
      return undefined;
  }
}

async function executeAction(
  action: PlayerAction,
  game: BlackjackGameState,
): Promise<BlackjackGameState> {
  switch (action) {
    case "hit":
      return hitHand(game);
    case "stand":
      return standHand(game);
    case "double":
      return doubleDown(game);
    case "split":
      return splitHand(game);
  }
}
