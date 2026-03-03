// Stats service — pure aggregation logic separated from I/O
// All heavy aggregation is implemented here as pure functions.
// Database access is performed by the StatsRepository.

import { type Result, ok } from "../lib/errors";
import * as StatsRepo from "../repositories/stats.repository";
import type { RoundRecord } from "../repositories/stats.repository";

// Types

export interface OverviewResult {
  totalRounds: number;
  totalWagered: number;
  totalWon: number;
  netProfit: number;
  winRate: number;
  biggestWin: number;
  biggestLoss: number;
  currentStreak: number;
  longestWinStreak: number;
  longestLossStreak: number;
  avgBet: number;
  avgWin: number;
  roiPct: number;
  rouletteRounds: number;
  blackjackRounds: number;
}

export interface BalanceHistoryPoint {
  round: number;
  balance: number;
  date: Date;
  won: boolean;
  game: "Roulette" | "Blackjack";
}

export interface DailySeriesPoint {
  date: string;
  wagered: number;
  won: number;
  profit: number;
  rounds: number;
  winRate: number;
}

export interface HourlySeriesPoint {
  hour: number;
  label: string;
  rounds: number;
  profit: number;
  winRate: number;
}

export interface GameBreakdownEntry {
  game: string;
  rounds: number;
  wagered: number;
  won: number;
  profit: number;
  winRate: number;
}

export interface RecentRound {
  id: string;
  game: "Roulette" | "Blackjack";
  number: number;
  color: string;
  bet: number;
  win: number;
  profit: number;
  handResults: string[];
  createdAt: string;
}

// Pure aggregation functions (no I/O) — keeps logic testable and side-effect free

const EMPTY_OVERVIEW: OverviewResult = {
  totalRounds: 0,
  totalWagered: 0,
  totalWon: 0,
  netProfit: 0,
  winRate: 0,
  biggestWin: 0,
  biggestLoss: 0,
  currentStreak: 0,
  longestWinStreak: 0,
  longestLossStreak: 0,
  avgBet: 0,
  avgWin: 0,
  roiPct: 0,
  rouletteRounds: 0,
  blackjackRounds: 0,
};

// Compute lifetime overview stats from raw round data.
// This is a pure function with no side effects.
export function computeOverview(
  spins: RoundRecord[],
  bjRounds: RoundRecord[],
): OverviewResult {
  // Normalize and de-duplicate rounds coming from both sources. In some
  // edge-cases the same round can be returned twice (e.g. duplicate DB
  // rows or an upstream bug). Dedupe by timestamp+bet+win which is a very
  // low risk heuristic and prevents double-counting in the aggregates.
  const enrich = (r: RoundRecord, game: "Roulette" | "Blackjack") => ({
    ...r,
    game,
    key: `${r.createdAt.getTime()}|${r.totalBet}|${r.totalWin}`,
  });

  const merged = [...spins.map((s) => enrich(s, "Roulette")), ...bjRounds.map((r) => enrich(r, "Blackjack"))];

  const seen = new Set<string>();
  const all = merged
    .filter((r) => {
      if (seen.has(r.key)) return false;
      seen.add(r.key);
      return true;
    })
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  if (all.length === 0) {
    return EMPTY_OVERVIEW;
  }

  let totalWagered = 0;
  let totalWon = 0;
  let wins = 0;
  let biggestWin = 0;
  let biggestLoss = 0;
  let currentStreak = 0;
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let runningWin = 0;
  let runningLoss = 0;

  for (const round of all) {
    const bet = Number(round.totalBet);
    const win = Number(round.totalWin);
    const profit = win - bet;

    totalWagered += bet;
    totalWon += win;

    if (win > 0) {
      wins++;
      if (win > biggestWin) biggestWin = win;
      runningWin++;
      runningLoss = 0;
      if (runningWin > longestWinStreak) longestWinStreak = runningWin;
    } else {
      if (bet > biggestLoss) biggestLoss = bet;
      runningLoss++;
      runningWin = 0;
      if (runningLoss > longestLossStreak) longestLossStreak = runningLoss;
    }

    currentStreak = profit > 0
      ? (currentStreak > 0 ? currentStreak + 1 : 1)
      : (currentStreak < 0 ? currentStreak - 1 : -1);
  }

  const netProfit = totalWon - totalWagered;
  const totalRounds = all.length;

  return {
    totalRounds,
    totalWagered: round2(totalWagered),
    totalWon: round2(totalWon),
    netProfit: round2(netProfit),
    winRate: Math.round((wins / totalRounds) * 100),
    biggestWin: round2(biggestWin),
    biggestLoss: round2(biggestLoss),
    currentStreak,
    longestWinStreak,
    longestLossStreak,
    avgBet: round2(totalWagered / totalRounds),
    avgWin: round2(totalWon / totalRounds),
    roiPct: totalWagered > 0 ? Math.round((netProfit / totalWagered) * 10000) / 100 : 0,
    rouletteRounds: spins.length,
    blackjackRounds: bjRounds.length,
  };
}

/**
 * Compute running balance history.
 * Pure function — no side effects.
 */
export function computeBalanceHistory(
  spins: RoundRecord[],
  bjRounds: RoundRecord[],
  limit: number,
): BalanceHistoryPoint[] {
  // Enrich rounds with a game tag and dedupe same-timestamp+bet+win duplicates
  const enrich = (r: RoundRecord, game: "Roulette" | "Blackjack") => ({
    ...r,
    game,
    key: `${r.createdAt.getTime()}|${r.totalBet}|${r.totalWin}`,
  });

  const merged = [...spins.map((s) => enrich(s, "Roulette")), ...bjRounds.map((r) => enrich(r, "Blackjack"))];
  const seen = new Set<string>();
  const ordered = merged
    .filter((r) => {
      if (seen.has(r.key)) return false;
      seen.add(r.key);
      return true;
    })
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .slice(-limit);

  let running = 0;
  return ordered.map((round, idx) => {
    const bet = Number(round.totalBet);
    const win = Number(round.totalWin);
    running += win - bet;
    return {
      round: idx + 1,
      balance: round2(running),
      date: round.createdAt,
      won: win > 0,
      game: round.game as "Roulette" | "Blackjack",
    };
  });
}

/**
 * Compute daily aggregation series.
 * Pure function — no side effects.
 */
export function computeDailySeries(
  spins: RoundRecord[],
  bjRounds: RoundRecord[],
  days: number,
): DailySeriesPoint[] {
  type DayBucket = { wagered: number; won: number; rounds: number; wins: number };
  const byDay = new Map<string, DayBucket>();

  const addToBucket = (createdAt: Date, totalBet: string, totalWin: string) => {
    const d = createdAt.toISOString().slice(0, 10);
    const existing = byDay.get(d) ?? { wagered: 0, won: 0, rounds: 0, wins: 0 };
    existing.wagered += Number(totalBet);
    existing.won += Number(totalWin);
    existing.rounds++;
    if (Number(totalWin) > 0) existing.wins++;
    byDay.set(d, existing);
  };

  for (const s of spins) addToBucket(s.createdAt, s.totalBet, s.totalWin);
  for (const r of bjRounds) addToBucket(r.createdAt, r.totalBet, r.totalWin);

  const series: DailySeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const entry = byDay.get(key);

    series.push({
      date: key,
      wagered: entry ? round2(entry.wagered) : 0,
      won: entry ? round2(entry.won) : 0,
      profit: entry ? round2(entry.won - entry.wagered) : 0,
      rounds: entry?.rounds ?? 0,
      winRate: entry && entry.rounds > 0 ? Math.round((entry.wins / entry.rounds) * 100) : 0,
    });
  }

  return series;
}

/**
 * Compute hourly heatmap.
 * Pure function — no side effects.
 */
export function computeHourlyHeatmap(
  spins: RoundRecord[],
  bjRounds: RoundRecord[],
): HourlySeriesPoint[] {
  const hours = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    rounds: 0,
    wagered: 0,
    won: 0,
    wins: 0,
  }));

  const addToHour = (createdAt: Date, totalBet: string, totalWin: string) => {
    const h = createdAt.getHours();
    hours[h].rounds++;
    hours[h].wagered += Number(totalBet);
    hours[h].won += Number(totalWin);
    if (Number(totalWin) > 0) hours[h].wins++;
  };

  for (const s of spins) addToHour(s.createdAt, s.totalBet, s.totalWin);
  for (const r of bjRounds) addToHour(r.createdAt, r.totalBet, r.totalWin);

  return hours.map((h) => ({
    hour: h.hour,
    label: `${String(h.hour).padStart(2, "0")}:00`,
    rounds: h.rounds,
    profit: round2(h.won - h.wagered),
    winRate: h.rounds > 0 ? Math.round((h.wins / h.rounds) * 100) : 0,
  }));
}

/**
 * Compute per-game-type breakdown.
 * Pure function — no side effects.
 */
export function computeGameBreakdown(
  spins: StatsRepo.BetWinRecord[],
  bjRounds: StatsRepo.BetWinRecord[],
): GameBreakdownEntry[] {
  const summarise = (
    rounds: StatsRepo.BetWinRecord[],
    gameName: string,
  ): GameBreakdownEntry => {
    let wagered = 0;
    let won = 0;
    let wins = 0;
    for (const r of rounds) {
      wagered += Number(r.totalBet);
      won += Number(r.totalWin);
      if (Number(r.totalWin) > 0) wins++;
    }
    return {
      game: gameName,
      rounds: rounds.length,
      wagered: round2(wagered),
      won: round2(won),
      profit: round2(won - wagered),
      winRate: rounds.length > 0 ? Math.round((wins / rounds.length) * 100) : 0,
    };
  };

  return [
    summarise(spins, "Roulette"),
    summarise(bjRounds, "Blackjack"),
  ].filter((g) => g.rounds > 0);
}

/**
 * Build recent rounds list from raw query results.
 * Pure function — no side effects.
 */
export function buildRecentRounds(
  spins: StatsRepo.RecentSpinRecord[],
  bjRounds: StatsRepo.RecentBlackjackRecord[],
  limit: number,
): RecentRound[] {
  const rouletteRounds: RecentRound[] = spins.map((s) => ({
    id: s.id,
    game: "Roulette",
    number: s.number,
    color: s.color,
    bet: Number(s.totalBet),
    win: Number(s.totalWin),
    profit: Number(s.totalWin) - Number(s.totalBet),
    handResults: [],
    createdAt: s.createdAt.toISOString(),
  }));

  const blackjackResults: RecentRound[] = bjRounds.map((r) => {
    const snapshot = r.handsSnapshot as Array<{ result: string; bet: number }>;
    return {
      id: r.id,
      game: "Blackjack",
      number: -1,
      color: "blackjack",
      bet: Number(r.totalBet),
      win: Number(r.totalWin),
      profit: Number(r.totalWin) - Number(r.totalBet),
      handResults: snapshot.map((h) => h.result),
      createdAt: r.createdAt.toISOString(),
    };
  });

  return [...rouletteRounds, ...blackjackResults]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

/* ============================================================================
   Orchestration — fetch data + compute
   ============================================================================ */

export async function getOverview(userId: string): Promise<Result<OverviewResult>> {
  const { spins, bjRounds } = await StatsRepo.findAllRounds(userId);
  return ok(computeOverview(spins, bjRounds));
}

export async function getBalanceHistory(
  userId: string,
  limit: number,
): Promise<Result<{ series: BalanceHistoryPoint[] }>> {
  const { spins, bjRounds } = await StatsRepo.findAllRounds(userId);
  return ok({ series: computeBalanceHistory(spins, bjRounds, limit) });
}

export async function getDaily(
  userId: string,
  days: number,
): Promise<Result<{ series: DailySeriesPoint[] }>> {
  const { spins, bjRounds } = await StatsRepo.findAllRounds(userId);
  return ok({ series: computeDailySeries(spins, bjRounds, days) });
}

export async function getHourlyHeatmap(
  userId: string,
): Promise<Result<{ series: HourlySeriesPoint[] }>> {
  const [spins, bjRounds] = await Promise.all([
    StatsRepo.findRouletteRoundsUnordered(userId),
    StatsRepo.findBlackjackRoundsUnordered(userId),
  ]);
  return ok({ series: computeHourlyHeatmap(spins, bjRounds) });
}

export async function getGameBreakdown(
  userId: string,
): Promise<Result<{ games: GameBreakdownEntry[] }>> {
  const [spins, bjRounds] = await Promise.all([
    StatsRepo.findRouletteBetWins(userId),
    StatsRepo.findBlackjackBetWins(userId),
  ]);
  return ok({ games: computeGameBreakdown(spins, bjRounds) });
}

export async function getRecent(
  userId: string,
  limit: number,
): Promise<Result<{ rounds: RecentRound[] }>> {
  const [spins, bjRounds] = await Promise.all([
    StatsRepo.findRecentSpins(userId, limit),
    StatsRepo.findRecentBlackjackRounds(userId, limit),
  ]);
  return ok({ rounds: buildRecentRounds(spins, bjRounds, limit) });
}

/* ============================================================================
   Utility
   ============================================================================ */

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
