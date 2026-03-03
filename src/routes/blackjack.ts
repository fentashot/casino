/* ============================================================================
   Blackjack Routes
   Thin HTTP handlers — all game logic lives in src/lib/blackjack/*.
   ============================================================================ */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db/postgres";
import { userBalance, blackjackRound } from "../db/schema";
import { eq } from "drizzle-orm";
import * as crypto from "crypto";
import type { User, Vars } from "../types";
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
} from "../lib/blackjack";

import type { BlackjackGameState } from "../lib/blackjack";

/* ============================================================================
   Validation Schemas
   ============================================================================ */

const dealSchema = z.object({
  bet: z.number().int().min(10, "Minimum bet is 10").max(1_000_000),
});

const actionSchema = z.object({
  action: z.enum(["hit", "stand", "double", "split"]),
});

const insuranceSchema = z.object({
  decision: z.enum(["take", "skip"]),
});

/* ============================================================================
   DB Helpers
   ============================================================================ */

async function syncBalance(userId: string, newBalance: number): Promise<void> {
  await db
    .update(userBalance)
    .set({ balance: newBalance.toString() })
    .where(eq(userBalance.userId, userId));
}

/**
 * Persist a finished blackjack game to the blackjack_round table.
 * Called exactly once per game, right before clearing it from memory.
 * Calculates totalBet and totalWin from the settled hand results.
 */
async function persistBlackjackRound(
  userId: string,
  game: BlackjackGameState,
): Promise<void> {
  let totalBet = 0;
  let totalWin = 0;

  for (const hand of game.playerHands) {
    totalBet += hand.bet;

    // Add insurance bet to the total wagered
    if (hand.insuranceBet) {
      totalBet += hand.insuranceBet;
    }

    // Calculate what was returned to the player for this hand
    const result = hand.result;
    if (result === "blackjack") {
      totalWin += Math.floor(hand.bet * 2.5);
    } else if (result === "win") {
      totalWin += hand.bet * 2;
    } else if (result === "push") {
      totalWin += hand.bet;
    }
    // bust / loss → 0 returned

    // Insurance win pays 2:1 on the insurance bet
    if (hand.insuranceBet && hand.insuranceResult === "win") {
      totalWin += hand.insuranceBet * 3; // 2:1 + stake back
    }
  }

  const handsSnapshot = game.playerHands.map((h) => ({
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

async function fetchOrCreateBalance(
  userId: string,
): Promise<{ balance: number }> {
  let record = await db.query.userBalance.findFirst({
    where: eq(userBalance.userId, userId),
  });

  if (!record) {
    await db.insert(userBalance).values({
      userId,
      balance: "100000.00",
      lastNonce: 0,
    });
    record = {
      userId,
      balance: "100000.00",
      lastNonce: 0,
      updatedAt: new Date(),
    };
  }

  return { balance: Number(record.balance) };
}

/* ============================================================================
   Route Handlers
   ============================================================================ */

export const blackjackRoutes = new Hono<Vars>()

  /** GET /api/blackjack/state — current game state for user */
  .get("/state", async (c) => {
    const { id: userId } = c.get("user") as User;

    // First check for an active (non-finished) game
    const active = getActiveGame(userId);
    if (active) {
      return c.json({ game: sanitizeGame(active) });
    }

    // Check if there's a finished game to return once (for UI continuity)
    const finished = getGameForUser(userId);
    if (finished && finished.phase === "finished") {
      await syncBalance(userId, finished.balance);
      clearGame(userId);
      return c.json({ game: sanitizeGame(finished) });
    }

    return c.json({ game: null });
  })

  /** POST /api/blackjack/deal — start a new round */
  .post("/deal", zValidator("json", dealSchema), async (c) => {
    const { id: userId } = c.get("user") as User;
    const { bet } = c.req.valid("json");

    // Refuse if there is already an active (non-finished) game
    if (getActiveGame(userId)) {
      return c.json({ error: "active_game_exists" }, 409);
    }

    const { balance: currentBalance } = await fetchOrCreateBalance(userId);

    if (currentBalance < bet) {
      return c.json({ error: "insufficient_funds" }, 402);
    }

    const game = dealGame(bet, currentBalance, userId);

    // Persist deducted balance immediately
    await syncBalance(userId, game.balance);
    saveGame(game);

    return c.json({ game: sanitizeGame(game) });
  })

  /** POST /api/blackjack/insurance — accept or decline insurance */
  .post("/insurance", zValidator("json", insuranceSchema), async (c) => {
    const { id: userId } = c.get("user") as User;
    const { decision } = c.req.valid("json");

    const game = getActiveGame(userId);
    if (!game) {
      return c.json({ error: "no_active_game" }, 404);
    }

    if (game.phase !== "insurance") {
      return c.json({ error: "insurance_not_available" }, 400);
    }

    let updated: BlackjackGameState;
    try {
      updated = resolveInsurance(game, decision);
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400);
    }

    await syncBalance(userId, updated.balance);

    if (updated.phase === "finished") {
      await persistBlackjackRound(userId, updated);
    }

    saveGame(updated);

    return c.json({ game: sanitizeGame(updated) });
  })

  /** POST /api/blackjack/action — player action (hit / stand / double / split) */
  .post("/action", zValidator("json", actionSchema), async (c) => {
    const { id: userId } = c.get("user") as User;
    const { action } = c.req.valid("json");

    const game = getActiveGame(userId);
    if (!game) {
      return c.json({ error: "no_active_game" }, 404);
    }

    if (game.phase === "insurance") {
      return c.json({ error: "insurance_pending" }, 400);
    }

    if (game.phase !== "playing") {
      return c.json({ error: "not_your_turn" }, 400);
    }

    const hand = game.playerHands[game.activeHandIndex];
    if (!hand) {
      return c.json({ error: "no_active_hand" }, 400);
    }

    if (hand.splitAces) {
      return c.json({ error: "split_aces_no_actions" }, 400);
    }

    let updated: BlackjackGameState;

    try {
      switch (action) {
        case "hit":
          updated = hitHand(game);
          break;

        case "stand":
          updated = standHand(game);
          break;

        case "double":
          if (hand.cards.length !== 2) {
            return c.json({ error: "cannot_double_now" }, 400);
          }
          if (game.balance < hand.bet) {
            return c.json({ error: "insufficient_funds" }, 402);
          }
          updated = doubleDown(game);
          break;

        case "split":
          if (!canSplit(hand.cards)) {
            return c.json({ error: "cannot_split" }, 400);
          }
          if (game.balance < hand.bet) {
            return c.json({ error: "insufficient_funds" }, 402);
          }
          updated = splitHand(game);
          break;
      }
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400);
    }

    // Trigger dealer play when all hands are done
    if (shouldTriggerDealer(updated!)) {
      updated = resolveDealerAndSettle(updated!);
    }

    // Sync balance when funds changed (double, split, or game finished)
    if (
      action === "double" ||
      action === "split" ||
      updated!.phase === "finished"
    ) {
      await syncBalance(userId, updated!.balance);
    }

    if (updated!.phase === "finished") {
      await persistBlackjackRound(userId, updated!);
    }

    saveGame(updated!);
    return c.json({ game: sanitizeGame(updated!) });
  })

  /** POST /api/blackjack/clear — clear a finished game so the UI can reset */
  .post("/clear", async (c) => {
    const { id: userId } = c.get("user") as User;

    const game = getGameForUser(userId);
    if (game && game.phase === "finished") {
      await syncBalance(userId, game.balance);
      // Persist the round if it hasn't been persisted yet (e.g. the client
      // refreshed mid-game and /clear is the first post-finish request).
      // We use a try/catch so a duplicate-key error (if already persisted
      // via /action or /insurance) doesn't break the clear flow.
      try {
        await persistBlackjackRound(userId, game);
      } catch {
        // Already persisted — ignore duplicate
      }
    }

    clearGame(userId);
    return c.json({ ok: true });
  })

  /** GET /api/blackjack/shoe-info — remaining shoe penetration */
  .get("/shoe-info", (c) => {
    const { id: userId } = c.get("user") as User;
    const info = getShoeInfo(userId);

    if (!info) {
      return c.json({ cardsRemaining: null, penetration: null });
    }

    return c.json(info);
  });
