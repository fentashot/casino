/* ============================================================================
   /games/stats — Detailed Statistics Dashboard
   Composed from single-responsibility components. This page only handles
   layout, state (period selectors) and wiring data hooks to components.
   ============================================================================ */

import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	BarChart3,
	Dices,
	Flame,
	Hash,
	Layers,
	Percent,
	Target,
	TrendingDown,
	TrendingUp,
	Trophy,
	Wallet,
} from "lucide-react";
import { useState } from "react";
import type { PeriodOption } from "@/components/stats";
import {
	BalanceChart,
	ChartSection,
	DailyBarChart,
	GameBreakdownTable,
	HourlyHeatmapChart,
	PeriodSelector,
	RecentRoundsFeed,
	StatCard,
	StreakBadge,
	WinLossPieChart,
} from "@/components/stats";
import {
	useBalanceHistory,
	useDailyStats,
	useGameBreakdown,
	useHourlyHeatmap,
	useRecentRounds,
	useStatsOverview,
} from "@/games/stats/useStats";
import { formatCurrency, formatProfit } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/games/stats")({
	component: StatsPage,
});

/* ── Period options ──────────────────────────────────────────────────────── */

const DAILY_PERIOD_OPTIONS: PeriodOption<number>[] = [
	{ label: "7d", value: 7 },
	{ label: "30d", value: 30 },
	{ label: "90d", value: 90 },
];

const BALANCE_PERIOD_OPTIONS: PeriodOption<number>[] = [
	{ label: "50", value: 50 },
	{ label: "200", value: 200 },
	{ label: "500", value: 500 },
];

const RECENT_LIMIT_OPTIONS: PeriodOption<number>[] = [
	{ label: "20", value: 20 },
	{ label: "50", value: 50 },
	{ label: "100", value: 100 },
];

/* ============================================================================
   Page
   ============================================================================ */

function StatsPage() {
	/* ── Period selectors ──────────────────────────────────────────────────── */
	const [dailyPeriod, setDailyPeriod] = useState(30);
	const [balanceLimit, setBalanceLimit] = useState(200);
	const [recentLimit, setRecentLimit] = useState(20);

	/* ── Data hooks ────────────────────────────────────────────────────────── */
	const { data: overview, isLoading: loadingOverview } = useStatsOverview();
	const { data: balanceHistory, isLoading: loadingBalance } =
		useBalanceHistory(balanceLimit);
	const { data: dailyData, isLoading: loadingDaily } =
		useDailyStats(dailyPeriod);
	const { data: hourlyData, isLoading: loadingHourly } = useHourlyHeatmap();
	const { data: breakdownData, isLoading: loadingBreakdown } =
		useGameBreakdown();
	const { data: recentData, isLoading: loadingRecent } =
		useRecentRounds(recentLimit);

	/* ── Derived display values ────────────────────────────────────────────── */
	const ov = overview ?? null;
	const netProfitPositive = (ov?.netProfit ?? 0) >= 0;
	const roiPositive = (ov?.roiPct ?? 0) >= 0;

	return (
		<div className="space-y-8 pb-8">
			{/* ── Page header ──────────────────────────────────────────────────── */}
			<div className="flex items-start justify-between gap-4 animate-fade-in">
				<div className="space-y-1">
					<div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
						<Link
							to="/games"
							className="flex items-center gap-1.5 hover:text-foreground transition-colors"
						>
							<ArrowLeft className="h-3.5 w-3.5" />
							Gry
						</Link>
						<span>/</span>
						<span className="text-foreground font-medium">Statystyki</span>
					</div>
					<h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
						Twoje Statystyki
					</h1>
					<p className="text-sm text-muted-foreground">
						Szczegółowa analiza Twojej historii gier — wyniki, trendy i wzorce.
					</p>
				</div>
			</div>

			{/* ── KPI grid ─────────────────────────────────────────────────────── */}
			<section
				className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 animate-slide-up"
				style={{ animationDelay: "60ms" }}
			>
				<StatCard
					label="Łączne rundy"
					value={loadingOverview ? "—" : String(ov?.totalRounds ?? 0)}
					icon={<Hash className="h-4 w-4" />}
					variant="primary"
				/>
				<StatCard
					label="Łącznie obstawione"
					value={loadingOverview ? "—" : formatCurrency(ov?.totalWagered ?? 0)}
					icon={<Wallet className="h-4 w-4" />}
				/>
				<StatCard
					label="Net profit"
					value={loadingOverview ? "—" : formatProfit(ov?.netProfit ?? 0)}
					icon={
						netProfitPositive ? (
							<TrendingUp className="h-4 w-4" />
						) : (
							<TrendingDown className="h-4 w-4" />
						)
					}
					variant={netProfitPositive ? "win" : "loss"}
				/>
				<StatCard
					label="ROI"
					value={loadingOverview ? "—" : `${ov?.roiPct ?? 0}%`}
					icon={<Percent className="h-4 w-4" />}
					variant={roiPositive ? "win" : "loss"}
					delta={roiPositive ? "powyżej zera" : "poniżej zera"}
					deltaPositive={roiPositive}
				/>
				<StatCard
					label="Win rate"
					value={loadingOverview ? "—" : `${ov?.winRate ?? 0}%`}
					icon={<Target className="h-4 w-4" />}
					variant={(ov?.winRate ?? 0) >= 50 ? "win" : undefined}
				/>
				<StatCard
					label="Największa wygrana"
					value={loadingOverview ? "—" : formatCurrency(ov?.biggestWin ?? 0)}
					icon={<Trophy className="h-4 w-4" />}
					variant={(ov?.biggestWin ?? 0) > 0 ? "win" : undefined}
				/>
				<StatCard
					label="Śr. stawka"
					value={loadingOverview ? "—" : formatCurrency(ov?.avgBet ?? 0)}
					icon={<BarChart3 className="h-4 w-4" />}
				/>
				<StatCard
					label="Streak"
					value={
						loadingOverview
							? "—"
							: ov?.currentStreak === 0
								? "Brak"
								: ov?.currentStreak > 0
									? `🔥 ${ov?.currentStreak}`
									: `❄️ ${Math.abs(ov?.currentStreak)}`
					}
					icon={<Flame className="h-4 w-4" />}
					variant={
						(ov?.currentStreak ?? 0) > 2
							? "win"
							: (ov?.currentStreak ?? 0) < -2
								? "loss"
								: undefined
					}
				/>
				<StatCard
					label="Roulette"
					value={loadingOverview ? "—" : String(ov?.rouletteRounds ?? 0)}
					icon={<Dices className="h-4 w-4" />}
					variant="default"
				/>
				<StatCard
					label="Blackjack"
					value={loadingOverview ? "—" : String(ov?.blackjackRounds ?? 0)}
					icon={<Layers className="h-4 w-4" />}
					variant="default"
				/>
				<StatCard
					label="Plinko"
					value={loadingOverview ? "—" : String(ov?.plinkoRounds ?? 0)}
					icon={<Target className="h-4 w-4" />}
					variant="default"
				/>
			</section>

			{/* ── Per-game breakdown ───────────────────────────────────────────── */}
			<div className="animate-slide-up" style={{ animationDelay: "130ms" }}>
				<ChartSection
					title="Statystyki per gra"
					description="Porównanie wyników dla każdego typu gry — rouletka, blackjack i plinko."
					isLoading={loadingBreakdown}
					skeletonHeight={160}
				>
					<GameBreakdownTable games={breakdownData?.games ?? []} />
				</ChartSection>
			</div>

			{/* ── Balance history chart ─────────────────────────────────────────── */}
			<div className="animate-slide-up" style={{ animationDelay: "120ms" }}>
				<ChartSection
					title="Historia bilansu"
					description="Skumulowany zysk/strata w kolejnych rundach (punkt startowy = 0)."
					isLoading={loadingBalance}
					action={
						<PeriodSelector
							options={BALANCE_PERIOD_OPTIONS}
							value={balanceLimit}
							onChange={setBalanceLimit}
						/>
					}
				>
					<BalanceChart series={balanceHistory?.series ?? []} />
				</ChartSection>
			</div>

			{/* ── Daily activity + Win/Loss pie — side by side on wide screens ─── */}
			<div
				className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-slide-up"
				style={{ animationDelay: "180ms" }}
			>
				{/* Daily bars — takes 2/3 width */}
				<div className="lg:col-span-2">
					<ChartSection
						title="Aktywność dzienna"
						description="Obstawione vs wygrane per dzień w wybranym okresie."
						isLoading={loadingDaily}
						action={
							<PeriodSelector
								options={DAILY_PERIOD_OPTIONS}
								value={dailyPeriod}
								onChange={setDailyPeriod}
							/>
						}
					>
						<DailyBarChart series={dailyData?.series ?? []} />
					</ChartSection>
				</div>

				{/* Win/loss donut — takes 1/3 width */}
				<ChartSection
					title="Win / Loss"
					description="Stosunek wygranych do przegranych rund."
					isLoading={loadingOverview}
					skeletonHeight={260}
				>
					<WinLossPieChart
						winRate={ov?.winRate ?? 0}
						totalRounds={ov?.totalRounds ?? 0}
					/>
				</ChartSection>
			</div>

			{/* ── Hourly heatmap + Streak — side by side ───────────────────────── */}
			<div
				className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-slide-up"
				style={{ animationDelay: "240ms" }}
			>
				<ChartSection
					title="Aktywność godzinowa"
					description="O której godzinie grasz najczęściej i jaki masz wtedy win rate."
					isLoading={loadingHourly}
					skeletonHeight={220}
				>
					<HourlyHeatmapChart series={hourlyData?.series ?? []} />
				</ChartSection>

				<ChartSection
					title="Streak"
					description="Aktualny ciąg wygranych lub przegranych oraz rekordy wszech czasów."
					isLoading={loadingOverview}
					skeletonHeight={220}
				>
					<StreakBadge
						currentStreak={ov?.currentStreak ?? 0}
						longestWinStreak={ov?.longestWinStreak ?? 0}
						longestLossStreak={ov?.longestLossStreak ?? 0}
					/>
				</ChartSection>
			</div>

			{/* ── Recent rounds feed ───────────────────────────────────────────── */}
			<div className="animate-slide-up" style={{ animationDelay: "300ms" }}>
				<ChartSection
					title="Ostatnie rundy"
					description="Szczegółowy podgląd niedawnych rozgrywek."
					isLoading={loadingRecent}
					skeletonHeight={320}
					action={
						<PeriodSelector
							options={RECENT_LIMIT_OPTIONS}
							value={recentLimit}
							onChange={setRecentLimit}
						/>
					}
				>
					<RecentRoundsFeed rounds={recentData?.rounds ?? []} maxVisible={12} />
				</ChartSection>
			</div>
		</div>
	);
}
