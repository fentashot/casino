/* ============================================================================
   Plinko Service — orchestrates game logic and persistence
   
   Game logic (pure functions) lives in ./engine.ts.
   DB operations are inlined (no separate repository layer).
   ============================================================================ */

import { type Result, ok, err, ErrorCode } from "../../lib/errors";
import { db } from "../../db/postgres";
import { userBalance, plinkoRound } from "../../db/schema";
import { eq } from "drizzle-orm";
import * as crypto from "crypto";
import { dropBall, type Difficulty } from "./engine";
import type { PlinkoPlayResult } from "./types";

const DEFAULT_BALANCE = "100000.00";
const DEFAULT_NONCE = 0;

/* ============================================================================
   Play Plinko
   ============================================================================ */

export async function play(
  userId: string,
  bet: number,
  rows: number,
  difficulty: Difficulty,
): Promise<Result<PlinkoPlayResult>> {
  const { balance: currentBalance } = await findOrCreateBalance(userId);

  if (currentBalance < bet) {
    return err(ErrorCode.INSUFFICIENT_FUNDS);
  }

  // Generate a random seed for this drop
  const seed = crypto.randomBytes(16).toString("hex");
  const result = dropBall(bet, rows, difficulty, seed);

  const newBalance = currentBalance - bet + result.win;

  await updateBalance(userId, newBalance);

  await createRound({
    userId,
    bet,
    totalWin: result.win,
    rows,
    difficulty,
    finalBucket: result.finalBucket,
    multiplier: result.multiplier,
    balanceAfter: newBalance,
  });

  return ok({
    path: result.path,
    finalBucket: result.finalBucket,
    multiplier: result.multiplier,
    win: result.win,
    balance: newBalance,
  });
}

/* ============================================================================
   Internal Helpers — Balance (inlined from balance.repository.ts)
   ============================================================================ */

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

async function updateBalance(userId: string, newBalance: number): Promise<void> {
  await db
    .update(userBalance)
    .set({ balance: newBalance.toString() })
    .where(eq(userBalance.userId, userId));
}

/* ============================================================================
   Internal Helpers — Round Persistence (inlined from plinkoRound.repository.ts)
   ============================================================================ */

interface PlinkoRoundInsert {
  userId: string;
  bet: number;
  totalWin: number;
  rows: number;
  difficulty: string;
  finalBucket: number;
  multiplier: number;
  balanceAfter: number;
}

async function createRound(data: PlinkoRoundInsert): Promise<void> {
  await db.insert(plinkoRound).values({
    id: crypto.randomBytes(16).toString("hex"),
    userId: data.userId,
    bet: data.bet.toString(),
    totalWin: data.totalWin.toString(),
    rows: data.rows,
    difficulty: data.difficulty,
    finalBucket: data.finalBucket,
    multiplier: data.multiplier.toString(),
    balanceAfter: data.balanceAfter.toString(),
  });
}
