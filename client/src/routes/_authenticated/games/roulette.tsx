import { createFileRoute } from "@tanstack/react-router";
import {
	ChevronDown,
	Clock,
	Dices,
	Shield,
	TrendingUp,
	Zap,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/auth-context";
import { ProvablyFairInfo } from "@/components/roulette/ProvablyFairInfo";
import RouletteControls from "@/components/roulette/RouletteControls";
import AnimatedWheel from "@/components/roulette/RouletteWheel";
import { SpinHistory } from "@/components/roulette/SpinHistory";
import { Button } from "@/components/ui/button";
import { useRoulette } from "@/games/roulette/useRoulette";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/games/roulette")({
	component: Roulette,
});

/* ============================================================================
   TYPE ALIASES (local)
   ============================================================================ */

type SpinResult = { number: number; color: "red" | "black" | "green" } | null;
type SpinData = { totalWin: number; totalBet: number } | null;

/* ============================================================================
   PAGE COMPONENT
   ============================================================================ */

function Roulette() {
	const { user } = useAuth();

	const {
		balance,
		isLoading,
		result,
		spinData,
		showResult,
		isSpinning,
		placeBets,
		onSpinEnd,
	} = useRoulette(user?.balance || 0);

	const [showProvablyFair, setShowProvablyFair] = useState(false);
	const [showHistory, setShowHistory] = useState(true);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<div className="flex flex-col items-center gap-4 animate-fade-in">
					<div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
						<Dices className="h-8 w-8 text-primary animate-pulse" />
					</div>
					<div className="space-y-1 text-center">
						<p className="text-sm font-medium text-foreground">
							Loading game...
						</p>
						<p className="text-xs text-muted-foreground">Preparing the wheel</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-8 pb-8">
			{/* ── Page header ──────────────────────────────────────────────────── */}
			<div className="flex items-center justify-between animate-fade-in">
				<div className="space-y-1">
					<div className="flex items-center gap-2">
						<h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
							Roulette
						</h1>
						<div className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5">
							<div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
							<span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
								Live
							</span>
						</div>
					</div>
					<p className="text-sm text-muted-foreground">
						European single-zero · Provably fair
					</p>
				</div>

				{/* Quick stats */}
				<div className="hidden sm:flex items-center gap-3">
					<QuickStat
						icon={<Zap className="h-3.5 w-3.5" />}
						label="Max"
						value="36x"
					/>
					<QuickStat
						icon={<TrendingUp className="h-3.5 w-3.5" />}
						label="Pockets"
						value="37"
					/>
				</div>
			</div>

			{/* ── Wheel zone ───────────────────────────────────────────────────── */}
			{/*
        Layout strategy (no layout shift):
          Desktop (lg+):  [spacer 180px] [wheel 280px] [result panel 180px]
                          Three columns, fixed widths, always rendered.
          Mobile:         wheel centred + fixed-height result strip below.

        The result panel / strip are ALWAYS present in the DOM and occupy
        their reserved space even when there is no result yet. Only the
        content inside them animates in/out. This ensures zero layout shift.
      */}
			<div className="animate-slide-up" style={{ animationDelay: "40ms" }}>
				<div className="relative overflow-hidden rounded-2xl border border-border bg-card py-8">
					{/* "Spinning" pill — always in DOM, animated with CSS opacity/translate */}
					<div
						className={cn(
							"absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2",
							"rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5",
							"pointer-events-none transition-all duration-300",
							isSpinning
								? "opacity-100 translate-y-0"
								: "opacity-0 -translate-y-2",
						)}
					>
						<div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
						<span className="text-xs font-semibold text-primary uppercase tracking-wider">
							Spinning
						</span>
					</div>

					{/* ── Desktop: 3-column row ─────────────────────────────────────── */}
					<div className="relative z-10 px-4 py-8 sm:py-10">
						<div className="flex items-center justify-center gap-6">
							{/* Left spacer — mirrors result panel width to keep wheel centred */}
							<div
								className="hidden lg:block flex-shrink-0"
								style={{ width: 180 }}
							/>

							{/* Wheel */}
							<div className="flex-shrink-0">
								<AnimatedWheel
									fontSizeProp={11}
									size={280}
									targetNumber={result?.number}
									onSpinEnd={onSpinEnd}
								/>
							</div>

							{/* Result side panel (desktop only) */}
							<div
								className="hidden lg:flex flex-col gap-3 flex-shrink-0"
								style={{ width: 180 }}
							>
								<ResultSidePanel
									result={result}
									showResult={showResult}
									spinData={spinData}
								/>
							</div>
						</div>

						{/* ── Mobile: fixed-height result strip below wheel ─────────── */}
						<div className="lg:hidden mt-6">
							<ResultMobileStrip
								result={result}
								showResult={showResult}
								spinData={spinData}
							/>
						</div>
					</div>
				</div>
			</div>

			{/* ── Controls ─────────────────────────────────────────────────────── */}
			<div className="animate-slide-up" style={{ animationDelay: "80ms" }}>
				<RouletteControls
					onPlaceBets={placeBets}
					balance={balance}
					disableBet={isSpinning}
				/>
			</div>

			{/* ── Info panels ──────────────────────────────────────────────────── */}
			<div
				className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-slide-up"
				style={{ animationDelay: "120ms" }}
			>
				<CollapsiblePanel
					title="Spin History"
					icon={<Clock className="h-4 w-4" />}
					open={!showHistory}
					onToggle={() => setShowHistory((v) => !v)}
				>
					<SpinHistory />
				</CollapsiblePanel>

				<CollapsiblePanel
					title="Provably Fair"
					icon={<Shield className="h-4 w-4" />}
					open={showProvablyFair}
					onToggle={() => setShowProvablyFair((v) => !v)}
					badge="Verified"
				>
					<ProvablyFairInfo spinData={spinData} />
				</CollapsiblePanel>
			</div>
		</div>
	);
}

/* ============================================================================
   RESULT SIDE PANEL
   Desktop — fixed 180 px wide column to the right of the wheel.
   Always rendered; content inside transitions on every new result.
   Uses `key={result?.number ?? "empty"}` on inner nodes to re-trigger
   the CSS animation on each new spin.
   ============================================================================ */

const COLOR_STYLES = {
	red: {
		bg: "bg-red-600",
		border: "border-red-500/40",
		shadow: "shadow-red-500/20",
		label: "Red",
		labelColor: "text-red-300",
	},
	black: {
		bg: "bg-zinc-800",
		border: "border-zinc-600/40",
		shadow: "shadow-zinc-500/10",
		label: "Black",
		labelColor: "text-zinc-300",
	},
	green: {
		bg: "bg-emerald-600",
		border: "border-emerald-500/40",
		shadow: "shadow-emerald-500/20",
		label: "Green",
		labelColor: "text-emerald-300",
	},
} as const;

function ResultSidePanel({
	result,
	showResult,
	spinData,
}: {
	result: SpinResult;
	showResult: boolean;
	spinData: SpinData;
}) {
	const style = result ? COLOR_STYLES[result.color] : null;
	const isWin = spinData ? spinData.totalWin > 0 : false;
	const profitLoss = spinData
		? isWin
			? spinData.totalWin
			: -spinData.totalBet
		: 0;

	/* key on the inner wrappers forces React to unmount → remount the node,
     which re-triggers the CSS @keyframes on every new result */
	const resultKey = showResult && result ? `r-${result.number}` : "empty";

	return (
		<div className="flex flex-col gap-3 w-full">
			{/* Number badge */}
			<div
				className={cn(
					"flex flex-col items-center justify-center rounded-2xl border shadow-lg w-full",
					"transition-colors duration-200",
					// Fixed height — never changes
					"min-h-[96px]",
					showResult && result && style
						? cn(style.bg, style.border, style.shadow)
						: "bg-muted/20 border-border/30",
				)}
			>
				{showResult && result && style ? (
					<div
						key={resultKey}
						className="animate-number-pop flex flex-col items-center gap-1"
					>
						<span className="text-5xl font-extrabold text-white font-mono tabular-nums leading-none drop-shadow-sm">
							{result.number}
						</span>
						<span
							className={cn(
								"text-xs font-semibold uppercase tracking-widest",
								style.labelColor,
							)}
						>
							{style.label}
						</span>
					</div>
				) : (
					<span className="text-4xl font-bold text-muted-foreground/25 font-mono select-none">
						—
					</span>
				)}
			</div>

			{/* Win / loss card */}
			<div
				className={cn(
					"rounded-xl border px-4 py-3",
					// Fixed height — never changes
					"min-h-[58px]",
					showResult && spinData
						? isWin
							? "bg-emerald-500/10 border-emerald-500/25"
							: "bg-red-500/10 border-red-500/20"
						: "bg-muted/10 border-border/20",
				)}
			>
				{showResult && spinData ? (
					<div
						key={resultKey}
						className="animate-slide-in-right flex flex-col gap-0.5"
					>
						<span
							className={cn(
								"text-lg font-bold font-mono tabular-nums",
								isWin ? "text-emerald-400" : "text-red-400",
							)}
						>
							{profitLoss > 0 ? "+" : ""}
							{profitLoss.toLocaleString("pl-PL")} zł
						</span>
						<span className="text-[11px] text-muted-foreground">
							Bet: {spinData.totalBet.toLocaleString("pl-PL")} zł
						</span>
					</div>
				) : (
					<div className="flex flex-col gap-0.5">
						<span className="text-sm font-semibold text-muted-foreground/30 font-mono">
							— zł
						</span>
						<span className="text-[11px] text-muted-foreground/30">
							Place bets to play
						</span>
					</div>
				)}
			</div>
		</div>
	);
}

/* ============================================================================
   RESULT MOBILE STRIP
   Always rendered below the wheel on mobile.
   Fixed height (h-16) — content animates in, container never shifts layout.
   ============================================================================ */

function ResultMobileStrip({
	result,
	showResult,
	spinData,
}: {
	result: SpinResult;
	showResult: boolean;
	spinData: SpinData;
}) {
	const colorBg: Record<string, string> = {
		red: "bg-red-600",
		black: "bg-zinc-800",
		green: "bg-emerald-600",
	};
	const colorLabel: Record<string, string> = {
		red: "Czerwony",
		black: "Czarny",
		green: "Zielony",
	};

	const isWin = spinData ? spinData.totalWin > 0 : false;
	const profitLoss = spinData
		? isWin
			? spinData.totalWin
			: -spinData.totalBet
		: 0;

	const resultKey = showResult && result ? `m-${result.number}` : "empty";

	return (
		/* Fixed height wrapper — layout never shifts */
		<div className="flex items-center gap-4 h-16 px-2">
			{/* Number circle */}
			<div
				className={cn(
					"flex items-center justify-center rounded-2xl flex-shrink-0",
					"w-14 h-14 border",
					// Always same size; only colour + content change
					showResult && result
						? cn(colorBg[result.color], "border-white/10 shadow-md")
						: "bg-muted/20 border-border/30",
				)}
			>
				{showResult && result ? (
					<span
						key={resultKey}
						className="animate-number-pop text-xl font-extrabold text-white font-mono tabular-nums"
					>
						{result.number}
					</span>
				) : (
					<span className="text-xl font-bold text-muted-foreground/25 font-mono">
						—
					</span>
				)}
			</div>

			{/* Label + P&L */}
			<div className="flex flex-col justify-center min-w-0">
				{showResult && result ? (
					<div key={resultKey} className="animate-fade-in">
						<p className="text-sm font-semibold text-foreground">
							{colorLabel[result.color]}
						</p>
						{spinData && (
							<p
								className={cn(
									"text-xs font-mono font-semibold",
									isWin ? "text-emerald-400" : "text-red-400",
								)}
							>
								{profitLoss > 0 ? "+" : ""}
								{profitLoss.toLocaleString("pl-PL")} zł
							</p>
						)}
					</div>
				) : (
					<p className="text-xs text-muted-foreground/40">Czekam na wynik…</p>
				)}
			</div>
		</div>
	);
}

/* ============================================================================
   QUICK STAT (header badge)
   ============================================================================ */

function QuickStat({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
}) {
	return (
		<div className="flex items-center gap-2 rounded-lg border border-border/40 bg-card/40 px-3 py-2">
			<div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted/50 text-muted-foreground">
				{icon}
			</div>
			<div className="flex flex-col">
				<span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
					{label}
				</span>
				<span className="text-xs font-bold font-mono text-foreground">
					{value}
				</span>
			</div>
		</div>
	);
}

/* ============================================================================
   COLLAPSIBLE PANEL
   ============================================================================ */

function CollapsiblePanel({
	title,
	icon,
	open,
	onToggle,
	badge,
	children,
}: {
	title: string;
	icon: React.ReactNode;
	open: boolean;
	onToggle: () => void;
	badge?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-2xl border border-border bg-card overflow-hidden">
			<Button
				variant="ghost"
				onClick={onToggle}
				className="w-full flex items-center justify-between px-5 py-4 h-auto rounded-none hover:bg-muted/20 transition-colors"
			>
				<div className="flex items-center gap-2.5">
					<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
						{icon}
					</div>
					<span className="text-sm font-semibold text-foreground">{title}</span>
					{badge && (
						<span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wider">
							{badge}
						</span>
					)}
				</div>
				<ChevronDown
					className={cn(
						"h-4 w-4 text-muted-foreground transition-transform duration-300",
						open && "rotate-180",
					)}
				/>
			</Button>

			{/* Content — CSS max-height collapsible, no JS height measurement */}
			<div
				className={cn(
					"overflow-hidden transition-all duration-300 ease-out",
					open ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0",
				)}
			>
				<div className="px-5 pb-5">{children}</div>
			</div>
		</div>
	);
}
