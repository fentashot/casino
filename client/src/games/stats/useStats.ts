/* ============================================================================
   useStats – Data hook for the stats dashboard
   One React Query query per endpoint. All components import from here so
   fetch logic is never duplicated in components.
   ============================================================================ */

import { useQuery } from "@tanstack/react-query";
import type {
	BalanceHistoryResponse,
	DailyResponse,
	GameBreakdownResponse,
	HourlyHeatmapResponse,
	RecentResponse,
	StatsOverview,
} from "@/games/stats/types";
import { api } from "@/lib/api";

/* ── Shared query options ────────────────────────────────────────────────── */

/** Stats data is not time-critical — 2-minute stale time is fine. */
const STALE_MS = 2 * 60 * 1000;

/* ============================================================================
   Individual hooks — each wraps exactly one endpoint
   ============================================================================ */

/** Lifetime aggregate numbers: win rate, profit, streaks, ROI … */
export function useStatsOverview() {
	return useQuery<StatsOverview>({
		queryKey: ["stats-overview"],
		queryFn: async () => {
			const res = await api.stats.overview.$get();
			if (!res.ok) throw new Error("Failed to fetch stats overview");
			return res.json();
		},
		staleTime: STALE_MS,
		// Always refetch when the stats page mounts so the dashboard shows fresh data
		refetchOnMount: "always",
	});
}

/**
 * Running profit/loss balance over the last `limit` rounds.
 * @param limit Max number of rounds to include (default 200).
 */
export function useBalanceHistory(limit = 200) {
	return useQuery<BalanceHistoryResponse>({
		queryKey: ["stats-balance-history", limit],
		queryFn: async () => {
			const res = await api.stats["balance-history"].$get({
				query: { limit: limit.toString() },
			});
			if (!res.ok) throw new Error("Failed to fetch balance history");
			return res.json();
		},
		staleTime: STALE_MS,
		// Ensure the chart refreshes whenever the user navigates to the stats page
		refetchOnMount: "always",
	});
}

/**
 * Per-day wagered / won / profit for the last `days` days.
 * @param days Number of calendar days to include (default 30).
 */
export function useDailyStats(days = 30) {
	return useQuery<DailyResponse>({
		queryKey: ["stats-daily", days],
		queryFn: async () => {
			const res = await api.stats.daily.$get({
				query: { days: days.toString() },
			});
			if (!res.ok) throw new Error("Failed to fetch daily stats");
			return res.json();
		},
		staleTime: STALE_MS,
		// Always refetch on mount so period changes / re-entry show latest data
		refetchOnMount: "always",
	});
}

/** Hour-of-day activity heatmap (0–23, all-time). */
export function useHourlyHeatmap() {
	return useQuery<HourlyHeatmapResponse>({
		queryKey: ["stats-hourly-heatmap"],
		queryFn: async () => {
			const res = await api.stats.hourly.$get();
			if (!res.ok) throw new Error("Failed to fetch hourly heatmap");
			return res.json();
		},
		staleTime: STALE_MS,
		refetchOnMount: "always",
	});
}

/** Per-game-type breakdown (rounds, wagered, won, profit, win rate). */
export function useGameBreakdown() {
	return useQuery<GameBreakdownResponse>({
		queryKey: ["stats-game-breakdown"],
		queryFn: async () => {
			const res = await api.stats["game-breakdown"].$get();
			if (!res.ok) throw new Error("Failed to fetch game breakdown");
			return res.json();
		},
		staleTime: STALE_MS,
		refetchOnMount: "always",
	});
}

/**
 * Most recent `limit` rounds with individual detail.
 * @param limit Number of rounds to return (default 20).
 */
export function useRecentRounds(limit = 20) {
	return useQuery<RecentResponse>({
		queryKey: ["stats-recent", limit],
		queryFn: async () => {
			const res = await api.stats.recent.$get({
				query: { limit: limit.toString() },
			});
			if (!res.ok) throw new Error("Failed to fetch recent rounds");
			return res.json();
		},
		staleTime: STALE_MS,
		// Recent rounds should be up-to-date whenever user opens the stats page
		refetchOnMount: "always",
	});
}

/* ============================================================================
   Composite hook — used by the summary cards on /games
   Fetches only overview + recent so the games index page stays lightweight.
   ============================================================================ */

export function useStatsSummary() {
	const overview = useStatsOverview();
	const recent = useRecentRounds(5);

	return {
		overview: overview.data ?? null,
		recentRounds: recent.data?.rounds ?? [],
		isLoading: overview.isLoading || recent.isLoading,
		isError: overview.isError || recent.isError,
	};
}
