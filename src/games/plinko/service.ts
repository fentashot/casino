/* ============================================================================
   Plinko Service — orchestrates game logic and persistence

   Game logic (pure functions) lives in ./engine.ts.
   DB operations use centralized query helpers from db/queries/.
   ============================================================================ */

import { type Result, ok, err, ErrorCode } from "../../lib/errors";
import { db } from "../../db/postgres";
import { plinkoRound } from "../../db/schema";
import { balanceQueries } from "../../db/queries";
import * as crypto from "crypto";
import { eq, sql } from "drizzle-orm";
import { dropBall, type Difficulty } from "./engine";
import { hasActiveBlackjackGame } from "../blackjack/engine";
import type { PlinkoPlayResult } from "./types";

/* ============================================================================
   Play Plinko
   ============================================================================ */

export async function play(
  userId: string,
  bet: number,
  rows: number,
  difficulty: Difficulty,
  idempotencyKey: string,
): Promise<Result<PlinkoPlayResult>> {
  // 1. Idempotency — return cached result if key already used
  const existing = await db.query.plinkoRound.findFirst({
    where: eq(plinkoRound.idempotencyKey, idempotencyKey),
  });
  if (existing) {
    return ok({
      path: [],
      finalBucket: existing.finalBucket,
      multiplier: Number(existing.multiplier),
      win: Number(existing.totalWin),
      balance: Number(existing.balanceAfter),
    });
  }

  // 2. Block play while a blackjack game is active
  if (await hasActiveBlackjackGame(userId)) {
    return err(ErrorCode.ACTIVE_GAME_EXISTS, "Finish your blackjack game first");
  }

  // 3. Ensure balance row exists for new users
  await balanceQueries.findOrCreateBalance(userId);

  // 3. Compute result before transaction (pure — does not touch DB)
  const seed = crypto.randomBytes(16).toString("hex");
  const result = dropBall(bet, rows, difficulty, seed);
  const roundId = crypto.randomBytes(16).toString("hex");

  // 4. Atomic: deduct bet + add win + insert round — all in one transaction
  const txResult = await db.transaction(async (tx) => {
    // Lock the row — prevents concurrent plays from reading stale balance
    const locked = await tx.execute(
      sql`SELECT balance FROM user_balance
          WHERE user_id = ${userId}
          FOR UPDATE`,
    );
    if (locked.length === 0) return null;

    const balance = Number((locked[0] as { balance: string }).balance);
    if (balance < bet) return null;

    const newBalance = balance - bet + result.win;

    await tx.execute(
      sql`UPDATE user_balance SET balance = ${newBalance} WHERE user_id = ${userId}`,
    );

    await tx.insert(plinkoRound).values({
      id: roundId,
      userId,
      bet: bet.toString(),
      totalWin: result.win.toString(),
      rows,
      difficulty,
      finalBucket: result.finalBucket,
      multiplier: result.multiplier.toString(),
      balanceAfter: newBalance.toString(),
      seed,
      idempotencyKey,
    });

    return { newBalance };
  });

  if (!txResult) {
    return err(ErrorCode.INSUFFICIENT_FUNDS, "Insufficient funds");
  }

  return ok({
    path: result.path,
    finalBucket: result.finalBucket,
    multiplier: result.multiplier,
    win: result.win,
    balance: txResult.newBalance,
  });
}
