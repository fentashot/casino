/* ============================================================================
   Blackjack Service — orchestrates game logic, balance sync, and persistence.

   Game logic (pure functions) lives in ./engine/.
   DB operations use centralized query helpers from db/queries/.
   This service is the glue between them.
   ============================================================================ */

import { type Result, ok, err, ErrorCode } from "../../lib/errors";
import { db } from "../../db/postgres";
import { blackjackRound } from "../../db/schema";
import { balanceQueries } from "../../db/queries";
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
  const active = await getActiveGame(userId);
  if (active) {
    return ok({ game: sanitizeGame(active) });
  }

  // Check for finished game to return once (UI continuity)
  const finished = await getGameForUser(userId);
  if (finished && finished.phase === "finished") {
    await persistRound(userId, finished);
    await syncBalance(userId, finished.balance);
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
  // Refuse if active game exists
  if (await getActiveGame(userId)) {
    return err(ErrorCode.ACTIVE_GAME_EXISTS, "Finish or clear your current game first");
  }

  const { balance: currentBalance } = await findOrCreateBalance(userId);

  if (currentBalance < bet) {
    return err(
      ErrorCode.INSUFFICIENT_FUNDS,
      `Insufficient funds: need ${bet}, have ${currentBalance}`,
      { required: bet, current: currentBalance }
    );
  }

  const game = dealGame(bet, currentBalance, userId);

  // Persist deducted balance immediately
  await syncBalance(userId, game.balance);
  await saveGame(game);

  return ok({ game: sanitizeGame(game) });
}

/* ============================================================================
   Insurance
   ============================================================================ */

export async function handleInsurance(
  userId: string,
  decision: InsuranceDecision,
): Promise<Result<GameStateResult>> {
  const game = await getActiveGame(userId);
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

  await saveGame(updated);
  return ok({ game: sanitizeGame(updated) });
}

/* ============================================================================
   Player Action — hit / stand / double / split
   ============================================================================ */

export async function handleAction(
  userId: string,
  action: PlayerAction,
): Promise<Result<GameStateResult>> {
  const game = await getActiveGame(userId);
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

  await saveGame(updated);
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
    await syncBalance(userId, game.balance);
  }

  await clearGame(userId);
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
  await balanceQueries.updateBalance(userId, newBalance);
}

async function findOrCreateBalance(
  userId: string,
): Promise<{ balance: number }> {
  return balanceQueries.findOrCreateBalance(userId);
}

/* ============================================================================
   Internal Helpers — Round Persistence (inlined from blackjackRound.repository.ts)
   ============================================================================ */

async function persistRound(
  userId: string,
  game: BlackjackGameState,
): Promise<void> {
  // markPersisted is called BEFORE the DB insert so that concurrent paths
  // racing here see the flag immediately and bail out without a second write.
  if (await isPersisted(game.id)) return;
  await markPersisted(game.id);

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
