/* ============================================================================
   Blackjack Service — orchestrates game logic, balance sync, and persistence.
   
   Game logic (pure functions) lives in ./engine/.
   DB operations are inlined (no separate repository layer).
   This service is the glue between them.
   ============================================================================ */

import { type Result, ok, err, ErrorCode } from "../../lib/errors";
import { db } from "../../db/postgres";
import { userBalance, blackjackRound } from "../../db/schema";
import { eq } from "drizzle-orm";
import * as crypto from "crypto";
import type { BlackjackGameState } from "./engine";
import {
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
  getGameForUser,
  saveGame,
  clearGame,
  getShoeInfo,
  canSplit,
  markPersisted,
  isPersisted,
} from "./engine";
import type { GameStateResult, ShoeInfoResult, HandSnapshot } from "./types";

/* ============================================================================
   Types
   ============================================================================ */

type InsuranceDecision = "take" | "skip";
type PlayerAction = "hit" | "stand" | "double" | "split";

const DEFAULT_BALANCE = "100000.00";
const DEFAULT_NONCE = 0;

/* ============================================================================
   Game State
   ============================================================================ */

export async function getState(
  userId: string,
): Promise<Result<GameStateResult>> {
  // Check for active (non-finished) game
  const active = getActiveGame(userId);
  if (active) {
    return ok({ game: sanitizeGame(active) });
  }

  // Check for finished game to return once (UI continuity)
  const finished = getGameForUser(userId);
  if (finished && finished.phase === "finished") {
    await persistRound(userId, finished);
    await syncBalance(userId, finished.balance);
    clearGame(userId);
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
  // Refuse if active game exists
  if (getActiveGame(userId)) {
    return err(ErrorCode.ACTIVE_GAME_EXISTS);
  }

  const { balance: currentBalance } = await findOrCreateBalance(userId);

  if (currentBalance < bet) {
    return err(ErrorCode.INSUFFICIENT_FUNDS);
  }

  const game = dealGame(bet, currentBalance, userId);

  // Persist deducted balance immediately
  await syncBalance(userId, game.balance);
  saveGame(game);

  return ok({ game: sanitizeGame(game) });
}

/* ============================================================================
   Insurance
   ============================================================================ */

export async function handleInsurance(
  userId: string,
  decision: InsuranceDecision,
): Promise<Result<GameStateResult>> {
  const game = getActiveGame(userId);
  if (!game) {
    return err(ErrorCode.NO_ACTIVE_GAME);
  }

  if (game.phase !== "insurance") {
    return err(ErrorCode.INSURANCE_NOT_AVAILABLE);
  }

  let updated: BlackjackGameState;
  try {
    updated = resolveInsurance(game, decision);
  } catch (e) {
    return err(ErrorCode.INSUFFICIENT_FUNDS, (e as Error).message);
  }

  await syncBalance(userId, updated.balance);

  if (updated.phase === "finished") {
    await persistRound(userId, updated);
  }

  saveGame(updated);
  return ok({ game: sanitizeGame(updated) });
}

/* ============================================================================
   Player Action — hit / stand / double / split
   ============================================================================ */

export async function handleAction(
  userId: string,
  action: PlayerAction,
): Promise<Result<GameStateResult>> {
  const game = getActiveGame(userId);
  if (!game) {
    return err(ErrorCode.NO_ACTIVE_GAME);
  }

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
    updated = executeAction(action, game);
  } catch (e) {
    return err(ErrorCode.VALIDATION_ERROR, (e as Error).message);
  }

  // Trigger dealer play when all hands are done
  if (shouldTriggerDealer(updated)) {
    updated = resolveDealerAndSettle(updated);
  }

  // Sync balance when funds changed
  if (action === "double" || action === "split" || updated.phase === "finished") {
    await syncBalance(userId, updated.balance);
  }

  if (updated.phase === "finished") {
    await persistRound(userId, updated);
  }

  saveGame(updated);
  return ok({ game: sanitizeGame(updated) });
}

/* ============================================================================
   Clear — clear a finished game
   ============================================================================ */

export async function clearFinishedGame(
  userId: string,
): Promise<Result<{ ok: true }>> {
  const game = getGameForUser(userId);
  if (game && game.phase === "finished") {
    // persistRound is idempotent — safe to call even if already persisted.
    await persistRound(userId, game);
    await syncBalance(userId, game.balance);
  }

  clearGame(userId);
  return ok({ ok: true });
}

/* ============================================================================
   Shoe Info
   ============================================================================ */

export function getShoeInfoForUser(userId: string): Result<ShoeInfoResult> {
  const info = getShoeInfo(userId);
  if (!info) {
    return ok({ cardsRemaining: null, penetration: null });
  }
  return ok(info);
}

/* ============================================================================
   Internal Helpers — Balance (inlined from balance.repository.ts)
   ============================================================================ */

async function syncBalance(userId: string, newBalance: number): Promise<void> {
  await db
    .update(userBalance)
    .set({ balance: newBalance.toString() })
    .where(eq(userBalance.userId, userId));
}

async function findOrCreateBalance(
  userId: string,
): Promise<{ balance: number }> {
  const existing = await db.query.userBalance.findFirst({
    where: eq(userBalance.userId, userId),
  });
  
  if (existing) {
    return { balance: Number(existing.balance) };
  }
  
  await db.insert(userBalance).values({
    userId,
    balance: DEFAULT_BALANCE,
    lastNonce: DEFAULT_NONCE,
  });
  
  return { balance: Number(DEFAULT_BALANCE) };
}

/* ============================================================================
   Internal Helpers — Round Persistence (inlined from blackjackRound.repository.ts)
   ============================================================================ */

async function persistRound(
  userId: string,
  game: BlackjackGameState,
): Promise<void> {
  // The persisted flag lives in the store (a Set<gameId>), not on the value
  // object. This prevents saveGame() from accidentally clobbering the flag
  // when the caller updates and re-saves the game after this function runs.
  // We call markPersisted BEFORE the DB insert so that any concurrent path
  // racing here sees the flag immediately and bails out without a second write.
  if (isPersisted(game.id)) return;
  markPersisted(game.id);

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
    userId,
    totalBet: totalBet.toString(),
    totalWin: totalWin.toString(),
    handsSnapshot,
    balanceAfter: game.balance.toString(),
  });
}

/* ============================================================================
   Internal Helpers — Action Validation
   ============================================================================ */

function validateAction(
  action: PlayerAction,
  game: BlackjackGameState,
  hand: BlackjackGameState["playerHands"][0],
): Result<GameStateResult> | null {
  switch (action) {
    case "double":
      if (hand.cards.length !== 2) {
        return err(ErrorCode.CANNOT_DOUBLE_NOW);
      }
      if (game.balance < hand.bet) {
        return err(ErrorCode.INSUFFICIENT_FUNDS);
      }
      return null;

    case "split":
      if (!canSplit(hand.cards)) {
        return err(ErrorCode.CANNOT_SPLIT);
      }
      if (game.balance < hand.bet) {
        return err(ErrorCode.INSUFFICIENT_FUNDS);
      }
      return null;

    default:
      return null;
  }
}

function executeAction(
  action: PlayerAction,
  game: BlackjackGameState,
): BlackjackGameState {
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
