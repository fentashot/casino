import { db } from "../db/postgres";
import { plinkoRound } from "../db/schema";
import * as crypto from "crypto";
import { eq, desc } from "drizzle-orm";

export interface PlinkoRoundInsert {
  userId: string;
  bet: number;
  totalWin: number;
  rows: number;
  difficulty: string;
  finalBucket: number;
  multiplier: number;
  balanceAfter: number;
}

export async function createRound(data: PlinkoRoundInsert): Promise<void> {
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

export async function getRecentRounds(userId: string, limit: number) {
  return db.query.plinkoRound.findMany({
    where: eq(plinkoRound.userId, userId),
    orderBy: desc(plinkoRound.createdAt),
    limit,
    columns: {
      id: true,
      bet: true,
      totalWin: true,
      rows: true,
      difficulty: true,
      finalBucket: true,
      multiplier: true,
      balanceAfter: true,
      createdAt: true,
    },
  });
}
