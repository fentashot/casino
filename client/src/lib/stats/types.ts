/* ============================================================================
   Stats – Shared Types
   Single source of truth for all shapes returned by /api/stats/*.
   No runtime code — types only.
   ============================================================================ */

/* ── Overview ────────────────────────────────────────────────────────────── */

export interface StatsOverview {
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
	/** Breakdown by game type */
	rouletteRounds: number;
	blackjackRounds: number;
	plinkoRounds: number;
}

/* ── Balance history ─────────────────────────────────────────────────────── */

export interface BalancePoint {
	/** Sequential round number (1-based) */
	round: number;
	/** Cumulative profit/loss relative to the start of the recorded period */
	balance: number;
	date: string;
	won: boolean;
	/** Which game produced this data point */
	game: "Roulette" | "Blackjack" | "Plinko";
}

export interface BalanceHistoryResponse {
	series: BalancePoint[];
}

/* ── Daily breakdown ─────────────────────────────────────────────────────── */

export interface DailyPoint {
	/** ISO date string YYYY-MM-DD */
	date: string;
	wagered: number;
	won: number;
	profit: number;
	rounds: number;
	winRate: number;
}

export interface DailyResponse {
	series: DailyPoint[];
}

/* ── Hourly heatmap ──────────────────────────────────────────────────────── */

export interface HourlyPoint {
	/** 0–23 */
	hour: number;
	/** Human-readable label, e.g. "14:00" */
	label: string;
	rounds: number;
	profit: number;
	winRate: number;
}

export interface HourlyHeatmapResponse {
	series: HourlyPoint[];
}

/* ── Game breakdown ──────────────────────────────────────────────────────── */

export interface GameBreakdownEntry {
	game: string;
	rounds: number;
	wagered: number;
	won: number;
	profit: number;
	winRate: number;
}

export interface GameBreakdownResponse {
	games: GameBreakdownEntry[];
}

/* ── Recent rounds ───────────────────────────────────────────────────────── */

export interface RecentRound {
	id: string;
	/** "Roulette" | "Blackjack" */
	game: string;
	/** Roulette pocket number, -1 for blackjack */
	number: number;
	/** "red" | "black" | "green" | "blackjack" */
	color: string;
	bet: number;
	win: number;
	profit: number;
	/** Hand results for blackjack rounds, e.g. ["win", "loss"] — empty for roulette */
	handResults: string[];
	createdAt: string;
}

export interface RecentResponse {
	rounds: RecentRound[];
}
