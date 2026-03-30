import type { Difficulty } from "@server/games/plinko/engine";
import { ChevronDown } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { usePlinkoCanvas } from "@/games/plinko/usePlinkoCanvas";
import { usePlinkoGame } from "@/games/plinko/usePlinkoGame";
import { cn } from "@/lib/utils";

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
	{ value: "low", label: "Low" },
	{ value: "medium", label: "Medium" },
	{ value: "high", label: "High" },
	{ value: "expert", label: "Expert" },
];

const ROWS_OPTIONS = [8, 9, 10, 11, 12, 13, 14, 15, 16];

export function PlinkoGame() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const game = usePlinkoGame();

	usePlinkoCanvas({
		canvasRef,
		rows: game.rows,
		difficulty: game.difficulty,
		activeBucketIdx: game.activeBucketIdx,
		ballPath: game.ballPath,
		onAnimationComplete: game.onAnimationComplete,
	});

	return (
		<div className="flex flex-col lg:flex-row gap-4 items-start">
			{/* Controls panel */}
			<div className="w-full lg:w-64 shrink-0 space-y-4">
				{/* Bet Amount */}
				<div className="rounded-xl border border-border bg-card p-4 space-y-3">
					<div className="flex items-center justify-between">
						<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							Bet Amount
						</span>
						<span className="text-xs font-mono text-muted-foreground">
							{game.balance.toLocaleString("pl-PL")} PLN
						</span>
					</div>

					<input
						type="number"
						min={1}
						max={game.balance}
						value={game.bet}
						onChange={(e) => game.setBet(Math.max(1, Number(e.target.value)))}
						className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
					/>

					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							className="flex-1 text-xs font-semibold"
							onClick={() => game.setBet(Math.max(1, Math.floor(game.bet / 2)))}
						>
							&frac12;
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="flex-1 text-xs font-semibold"
							onClick={() => game.setBet(Math.min(game.balance, game.bet * 2))}
						>
							2&times;
						</Button>
					</div>
				</div>

				{/* Difficulty */}
				<div className="rounded-xl border border-border bg-card p-4 space-y-2">
					<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
						Difficulty
					</span>
					<div className="relative">
						<select
							value={game.difficulty}
							onChange={(e) => game.setDifficulty(e.target.value as Difficulty)}
							className="w-full appearance-none rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary pr-8"
						>
							{DIFFICULTY_OPTIONS.map((o) => (
								<option key={o.value} value={o.value}>
									{o.label}
								</option>
							))}
						</select>
						<ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					</div>
				</div>

				{/* Rows */}
				<div className="rounded-xl border border-border bg-card p-4 space-y-2">
					<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
						Rows
					</span>
					<div className="relative">
						<select
							value={game.rows}
							onChange={(e) => game.changeRows(Number(e.target.value))}
							className="w-full appearance-none rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary pr-8"
						>
							{ROWS_OPTIONS.map((r) => (
								<option key={r} value={r}>
									{r}
								</option>
							))}
						</select>
						<ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					</div>
				</div>

				{/* Bet button */}
				<Button
					className="w-full h-11 text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
					disabled={!game.canPlay}
					onClick={game.play}
				>
					{game.isPlaying || game.isAnimating ? "Dropping..." : "Bet"}
				</Button>

				{/* Error feedback */}
				{game.error && (
					<div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-center">
						<div className="text-xs font-semibold text-red-400">
							{game.error}
						</div>
						<button
							type="button"
							className="mt-1 text-xs text-muted-foreground underline"
							onClick={game.clearError}
						>
							Dismiss
						</button>
					</div>
				)}

				{/* Last result */}
				{game.lastResult && game.showResult && (
					<div
						className={cn(
							"rounded-xl border p-3 text-center animate-number-pop",
							game.lastResult.win > game.bet
								? "border-emerald-500/30 bg-emerald-500/5"
								: game.lastResult.win === 0
									? "border-red-500/20 bg-red-500/5"
									: "border-border bg-card",
						)}
					>
						<div className="text-xs text-muted-foreground mb-0.5">Result</div>
						<div
							className={cn(
								"text-xl font-bold font-mono",
								game.lastResult.win > game.bet
									? "text-emerald-400"
									: game.lastResult.win === 0
										? "text-red-400"
										: "text-foreground",
							)}
						>
							{game.lastResult.multiplier}&times;
						</div>
						<div className="text-xs font-mono text-muted-foreground">
							{game.lastResult.win > 0
								? `+${game.lastResult.win.toLocaleString("pl-PL")}`
								: `-${game.bet.toLocaleString("pl-PL")}`}{" "}
							PLN
						</div>
					</div>
				)}
			</div>

			{/* Board */}
			<div className="flex-1 w-full rounded-2xl border border-border bg-card p-2 sm:p-4 flex items-center justify-center min-h-[420px]">
				<canvas
					ref={canvasRef}
					width={680}
					height={480}
					className="w-full max-w-[680px] h-auto"
					style={{ imageRendering: "crisp-edges" }}
				/>
			</div>
		</div>
	);
}
