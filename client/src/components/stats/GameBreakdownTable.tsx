/* ============================================================================
   GameBreakdownTable
   Per-game-type summary table: rounds played, wagered, won, profit, win rate.
   One responsibility: render the game breakdown data. No data fetching.
   ============================================================================ */

import { Dices, Layers } from "lucide-react";
import type { GameBreakdownEntry } from "@/games/stats/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface GameBreakdownTableProps {
	games: GameBreakdownEntry[];
}

const GAME_ICON: Record<string, React.ReactNode> = {
	Roulette: <Dices className="h-4 w-4" />,
	Blackjack: <Layers className="h-4 w-4" />,
};

const GAME_COLOR: Record<string, string> = {
	Roulette: "bg-blue-500/10 text-blue-400 border-blue-400/20",
	Blackjack: "bg-amber-500/10 text-amber-400 border-amber-400/20",
};

export function GameBreakdownTable({ games }: GameBreakdownTableProps) {
	if (games.length === 0) {
		return (
			<div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
				Brak danych — zagraj kilka rund w dowolną grę.
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{games.map((entry) => (
				<GameRow key={entry.game} entry={entry} />
			))}
		</div>
	);
}

/* ── Single game row ─────────────────────────────────────────────────────── */

function GameRow({ entry }: { entry: GameBreakdownEntry }) {
	const profitPositive = entry.profit >= 0;
	const iconClass =
		GAME_COLOR[entry.game] ?? "bg-muted text-muted-foreground border-border";

	return (
		<div className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/30">
			{/* Header row: icon + name + win-rate badge */}
			<div className="flex items-center justify-between gap-3 mb-4">
				<div className="flex items-center gap-3">
					<div
						className={cn(
							"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
							iconClass,
						)}
					>
						{GAME_ICON[entry.game] ?? <Dices className="h-4 w-4" />}
					</div>
					<div className="flex flex-col">
						<span className="text-sm font-semibold text-foreground">
							{entry.game}
						</span>
						<span className="text-[11px] text-muted-foreground">
							{entry.rounds} {entry.rounds === 1 ? "runda" : "rund"}
						</span>
					</div>
				</div>

				{/* Win rate pill */}
				<span
					className={cn(
						"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border",
						entry.winRate >= 50
							? "bg-emerald-500/10 text-emerald-400 border-emerald-400/20"
							: "bg-red-500/10 text-red-400 border-red-400/20",
					)}
				>
					{entry.winRate}% WR
				</span>
			</div>

			{/* Stats grid */}
			<div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
				<Metric label="Obstawione" value={formatCurrency(entry.wagered)} />
				<Metric
					label="Wygrane"
					value={formatCurrency(entry.won)}
					valueClass="text-emerald-400"
				/>
				<Metric
					label="Net profit"
					value={`${profitPositive ? "+" : ""}${formatCurrency(entry.profit)}`}
					valueClass={profitPositive ? "text-emerald-400" : "text-red-400"}
				/>
				{/* Win rate bar — visible on sm+ */}
				<div className="hidden sm:flex flex-col gap-1.5 justify-center">
					<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
						Win rate
					</span>
					<div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
						<div
							className={cn(
								"h-full rounded-full transition-all duration-700 ease-out",
								entry.winRate >= 50 ? "bg-emerald-500" : "bg-red-500",
							)}
							style={{ width: `${Math.min(entry.winRate, 100)}%` }}
						/>
					</div>
					<span
						className={cn(
							"text-[10px] font-mono font-semibold",
							entry.winRate >= 50 ? "text-emerald-400" : "text-red-400",
						)}
					>
						{entry.winRate}%
					</span>
				</div>
			</div>
		</div>
	);
}

/* ── Metric cell ─────────────────────────────────────────────────────────── */

function Metric({
	label,
	value,
	valueClass,
}: {
	label: string;
	value: string;
	valueClass?: string;
}) {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
				{label}
			</span>
			<span
				className={cn(
					"text-sm font-bold font-mono",
					valueClass ?? "text-foreground",
				)}
			>
				{value}
			</span>
		</div>
	);
}
