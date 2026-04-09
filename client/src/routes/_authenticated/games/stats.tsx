import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowLeft,
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/games/stats")({
	component: StatsPage,
});

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

function StatsPage() {
	const [dailyPeriod, setDailyPeriod] = useState(30);
	const [balanceLimit, setBalanceLimit] = useState(200);
	const [recentLimit, setRecentLimit] = useState(20);

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

	const ov = overview ?? null;
	const netProfit = ov?.netProfit ?? 0;

	return (
		<div className="space-y-8 pb-8">
			{/* Header */}
			<div>
				<Link
					to="/games"
					className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
				>
					<ArrowLeft className="h-3.5 w-3.5" />
					Gry
				</Link>
				<h1 className="text-2xl font-bold tracking-tight">Statystyki</h1>
			</div>

			{/* Key metrics — 6 items, flat row */}
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px rounded-xl border border-border bg-border overflow-hidden">
				<Metric
					label="Rundy"
					value={loadingOverview ? "—" : String(ov?.totalRounds ?? 0)}
					icon={<Target className="h-3.5 w-3.5" />}
				/>
				<Metric
					label="Obstawione"
					value={loadingOverview ? "—" : formatCurrency(ov?.totalWagered ?? 0)}
					icon={<Wallet className="h-3.5 w-3.5" />}
				/>
				<Metric
					label="Net profit"
					value={loadingOverview ? "—" : formatProfit(netProfit)}
					icon={
						netProfit >= 0 ? (
							<TrendingUp className="h-3.5 w-3.5" />
						) : (
							<TrendingDown className="h-3.5 w-3.5" />
						)
					}
					valueClass={netProfit >= 0 ? "text-emerald-400" : "text-red-400"}
				/>
				<Metric
					label="ROI"
					value={loadingOverview ? "—" : `${ov?.roiPct ?? 0}%`}
					icon={<Percent className="h-3.5 w-3.5" />}
					valueClass={
						(ov?.roiPct ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
					}
				/>
				<Metric
					label="Win rate"
					value={loadingOverview ? "—" : `${ov?.winRate ?? 0}%`}
					icon={<Target className="h-3.5 w-3.5" />}
				/>
				<Metric
					label="Największa wygrana"
					value={loadingOverview ? "—" : formatCurrency(ov?.biggestWin ?? 0)}
					icon={<Trophy className="h-3.5 w-3.5" />}
					valueClass={
						(ov?.biggestWin ?? 0) > 0 ? "text-emerald-400" : undefined
					}
				/>
			</div>

			{/* Balance chart */}
			<div className="rounded-xl border border-border bg-card p-5">
				<ChartSection
					title="Historia bilansu"
					description="Skumulowany zysk/strata w kolejnych rundach."
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

			{/* Per-game breakdown */}
			<div className="rounded-xl border border-border bg-card p-5">
				<ChartSection
					title="Per gra"
					description="Porównanie wyników dla każdej gry."
					isLoading={loadingBreakdown}
					skeletonHeight={160}
				>
					<GameBreakdownTable games={breakdownData?.games ?? []} />
				</ChartSection>
			</div>

			{/* Daily + Win/Loss side by side */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				<div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
					<ChartSection
						title="Aktywność dzienna"
						description="Obstawione vs wygrane per dzień."
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

				<div className="rounded-xl border border-border bg-card p-5">
					<ChartSection
						title="Win / Loss"
						isLoading={loadingOverview}
						skeletonHeight={260}
					>
						<WinLossPieChart
							winRate={ov?.winRate ?? 0}
							totalRounds={ov?.totalRounds ?? 0}
						/>
					</ChartSection>
				</div>
			</div>

			{/* Hourly + Streak side by side */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<div className="rounded-xl border border-border bg-card p-5">
					<ChartSection
						title="Aktywność godzinowa"
						description="Kiedy grasz i jaki masz wtedy win rate."
						isLoading={loadingHourly}
						skeletonHeight={220}
					>
						<HourlyHeatmapChart series={hourlyData?.series ?? []} />
					</ChartSection>
				</div>

				<div className="rounded-xl border border-border bg-card p-5">
					<ChartSection
						title="Streak"
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
			</div>

			{/* Recent rounds */}
			<div className="rounded-xl border border-border bg-card p-5">
				<ChartSection
					title="Ostatnie rundy"
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

/* ── Metric cell for the top grid ──────────────────────────────────────── */

function Metric({
	label,
	value,
	icon,
	valueClass,
}: {
	label: string;
	value: string;
	icon: React.ReactNode;
	valueClass?: string;
}) {
	return (
		<div className="flex flex-col gap-1.5 bg-card p-4">
			<div className="flex items-center gap-1.5 text-muted-foreground">
				{icon}
				<span className="text-xs font-medium">{label}</span>
			</div>
			<p
				className={cn(
					"text-lg font-bold font-mono tracking-tight",
					valueClass ?? "text-foreground",
				)}
			>
				{value}
			</p>
		</div>
	);
}
