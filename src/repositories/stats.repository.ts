/* ============================================================================
   Stats Repository — raw data fetching for statistics aggregation
   
   All queries return raw DB records. Aggregation logic lives in the
   stats service. This separation makes stats logic testable without DB.
   ============================================================================ */

import { db } from "../db/postgres";
import { casinoSpin, blackjackRound, plinkoRound } from "../db/schema";
import { eq, asc, desc } from "drizzle-orm";

/* ============================================================================
   Types — minimal projections for stats
   ============================================================================ */

export interface RoundRecord {
  totalBet: string;
  totalWin: string;
  createdAt: Date;
}

export interface RecentSpinRecord {
  id: string;
  number: number;
  color: string;
  totalBet: string;
  totalWin: string;
  createdAt: Date;
}

export interface RecentBlackjackRecord {
  id: string;
  totalBet: string;
  totalWin: string;
  handsSnapshot: unknown;
  createdAt: Date;
}

export interface RecentPlinkoRecord {
  id: string;
  bet: string;
  totalWin: string;
  multiplier: string;
  finalBucket: number;
  difficulty: string;
  createdAt: Date;
}

export interface BetWinRecord {
  totalBet: string;
  totalWin: string;
}

/* ============================================================================
   Queries
   ============================================================================ */

/**
 * Fetch all roulette rounds for a user, ordered by creation time (ascending).
 */
export async function findRouletteRounds(
  userId: string,
): Promise<RoundRecord[]> {
  return db.query.casinoSpin.findMany({
    where: eq(casinoSpin.userId, userId),
    columns: { totalBet: true, totalWin: true, createdAt: true },
    orderBy: asc(casinoSpin.createdAt),
  });
}

/**
 * Fetch all blackjack rounds for a user, ordered by creation time (ascending).
 */
export async function findBlackjackRounds(
  userId: string,
): Promise<RoundRecord[]> {
  return db.query.blackjackRound.findMany({
    where: eq(blackjackRound.userId, userId),
    columns: { totalBet: true, totalWin: true, createdAt: true },
    orderBy: asc(blackjackRound.createdAt),
  });
}

/**
 * Fetch both game types in parallel for a user.
 */
export async function findAllRounds(
  userId: string,
): Promise<{ spins: RoundRecord[]; bjRounds: RoundRecord[] }> {
  const [spins, bjRounds] = await Promise.all([
    findRouletteRounds(userId),
    findBlackjackRounds(userId),
  ]);
  return { spins, bjRounds };
}

/**
 * Fetch recent roulette spins (newest first).
 */
export async function findRecentSpins(
  userId: string,
  limit: number,
): Promise<RecentSpinRecord[]> {
  return db.query.casinoSpin.findMany({
    where: eq(casinoSpin.userId, userId),
    orderBy: desc(casinoSpin.createdAt),
    limit,
    columns: {
      id: true,
      number: true,
      color: true,
      totalBet: true,
      totalWin: true,
      createdAt: true,
    },
  });
}

/**
 * Fetch recent blackjack rounds (newest first).
 */
export async function findRecentBlackjackRounds(
  userId: string,
  limit: number,
): Promise<RecentBlackjackRecord[]> {
  return db.query.blackjackRound.findMany({
    where: eq(blackjackRound.userId, userId),
    orderBy: desc(blackjackRound.createdAt),
    limit,
    columns: {
      id: true,
      totalBet: true,
      totalWin: true,
      handsSnapshot: true,
      createdAt: true,
    },
  });
}

/**
 * Fetch roulette bet/win totals only (no timestamps).
 */
export async function findRouletteBetWins(
  userId: string,
): Promise<BetWinRecord[]> {
  return db.query.casinoSpin.findMany({
    where: eq(casinoSpin.userId, userId),
    columns: { totalBet: true, totalWin: true },
  });
}

/**
 * Fetch blackjack bet/win totals only (no timestamps).
 */
export async function findBlackjackBetWins(
  userId: string,
): Promise<BetWinRecord[]> {
  return db.query.blackjackRound.findMany({
    where: eq(blackjackRound.userId, userId),
    columns: { totalBet: true, totalWin: true },
  });
}

/**
 * Fetch roulette rounds with timestamps (no ordering constraint).
 */
export async function findRouletteRoundsUnordered(
  userId: string,
): Promise<RoundRecord[]> {
  return db.query.casinoSpin.findMany({
    where: eq(casinoSpin.userId, userId),
    columns: { totalBet: true, totalWin: true, createdAt: true },
  });
}

/**
 * Fetch blackjack rounds with timestamps (no ordering constraint).
 */
export async function findBlackjackRoundsUnordered(
  userId: string,
): Promise<RoundRecord[]> {
  return db.query.blackjackRound.findMany({
    where: eq(blackjackRound.userId, userId),
    columns: { totalBet: true, totalWin: true, createdAt: true },
  });
}

/**
 * Fetch all plinko rounds for a user, ordered by creation time (ascending).
 * Maps `bet` → `totalBet` so it satisfies the shared RoundRecord interface.
 */
export async function findPlinkoRounds(
  userId: string,
): Promise<RoundRecord[]> {
  const rows = await db.query.plinkoRound.findMany({
    where: eq(plinkoRound.userId, userId),
    columns: { bet: true, totalWin: true, createdAt: true },
    orderBy: asc(plinkoRound.createdAt),
  });
  return rows.map((r) => ({ totalBet: r.bet, totalWin: r.totalWin, createdAt: r.createdAt }));
}

/**
 * Fetch recent plinko rounds (newest first).
 */
export async function findRecentPlinkoRounds(
  userId: string,
  limit: number,
): Promise<RecentPlinkoRecord[]> {
  return db.query.plinkoRound.findMany({
    where: eq(plinkoRound.userId, userId),
    orderBy: desc(plinkoRound.createdAt),
    limit,
    columns: {
      id: true,
      bet: true,
      totalWin: true,
      multiplier: true,
      finalBucket: true,
      difficulty: true,
      createdAt: true,
    },
  });
}

/**
 * Fetch plinko bet/win totals only.
 */
export async function findPlinkoBetWins(
  userId: string,
): Promise<BetWinRecord[]> {
  const rows = await db.query.plinkoRound.findMany({
    where: eq(plinkoRound.userId, userId),
    columns: { bet: true, totalWin: true },
  });
  return rows.map((r) => ({ totalBet: r.bet, totalWin: r.totalWin }));
}

/**
 * Fetch plinko rounds with timestamps (no ordering constraint).
 */
export async function findPlinkoRoundsUnordered(
  userId: string,
): Promise<RoundRecord[]> {
  const rows = await db.query.plinkoRound.findMany({
    where: eq(plinkoRound.userId, userId),
    columns: { bet: true, totalWin: true, createdAt: true },
  });
  return rows.map((r) => ({ totalBet: r.bet, totalWin: r.totalWin, createdAt: r.createdAt }));
}
