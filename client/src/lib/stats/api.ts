/* ============================================================================
   Stats – API Client
   All /api/stats/* requests in one module. Components and hooks import from
   here — no raw fetch() calls scattered around the codebase.
   ============================================================================ */

import type {
  StatsOverview,
  BalanceHistoryResponse,
  DailyResponse,
  HourlyHeatmapResponse,
  GameBreakdownResponse,
  RecentResponse,
} from "./types";

const BASE = "/api/stats";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(`GET ${BASE}${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

/* ============================================================================
   Public API
   ============================================================================ */

/** Lifetime aggregate numbers (win rate, profit, streaks, ROI…) */
export async function fetchOverview(): Promise<StatsOverview> {
  return get<StatsOverview>("/overview");
}

/**
 * Running balance (profit/loss delta) over the last `limit` rounds.
 * Default: 200 rounds, max: 1000.
 */
export async function fetchBalanceHistory(
  limit = 200,
): Promise<BalanceHistoryResponse> {
  return get<BalanceHistoryResponse>(`/balance-history?limit=${limit}`);
}

/**
 * Per-day aggregates for the last `days` days.
 * Default: 30 days, max: 365.
 */
export async function fetchDaily(days = 30): Promise<DailyResponse> {
  return get<DailyResponse>(`/daily?days=${days}`);
}

/** Hour-of-day activity heatmap (0–23, all-time). */
export async function fetchHourlyHeatmap(): Promise<HourlyHeatmapResponse> {
  return get<HourlyHeatmapResponse>("/hourly-heatmap");
}

/** Per-game-type summary (rounds, wagered, won, profit, win rate). */
export async function fetchGameBreakdown(): Promise<GameBreakdownResponse> {
  return get<GameBreakdownResponse>("/game-breakdown");
}

/**
 * Most recent `limit` rounds with individual detail.
 * Default: 20, max: 100.
 */
export async function fetchRecent(limit = 20): Promise<RecentResponse> {
  return get<RecentResponse>(`/recent?limit=${limit}`);
}
