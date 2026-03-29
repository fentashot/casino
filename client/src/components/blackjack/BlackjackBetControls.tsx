import { Coins, PlayCircle, RotateCcw } from "lucide-react";
import { useState } from "react";
import { formatCompact, formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface BlackjackBetControlsProps {
	balance: number;
	minBet?: number;
	maxBet?: number;
	isLoading: boolean;
	onDeal: (bet: number) => void;
}

const CHIP_VALUES = [10, 50, 100, 500, 1000, 5000];

const CHIP_STYLES: Record<number, string> = {
	10: "bg-zinc-600  border-zinc-400  text-zinc-100  shadow-zinc-900/40",
	50: "bg-blue-700  border-blue-400  text-blue-100  shadow-blue-900/40",
	100: "bg-red-700   border-red-400   text-red-100   shadow-red-900/40",
	500: "bg-emerald-700 border-emerald-400 text-emerald-100 shadow-emerald-900/40",
	1000: "bg-violet-700 border-violet-400 text-violet-100 shadow-violet-900/40",
	5000: "bg-amber-600  border-amber-400  text-amber-100  shadow-amber-900/40",
};

function Chip({
	value,
	disabled,
	onClick,
	onRightClick,
}: {
	value: number;
	disabled: boolean;
	onClick: () => void;
	onRightClick?: () => void;
}) {
	const styles = CHIP_STYLES[value] ?? CHIP_STYLES[10];

	const handleContextMenu = (e: React.MouseEvent) => {
		e.preventDefault();
		onRightClick?.();
	};

	return (
		<button
			type="button"
			onClick={onClick}
			onContextMenu={handleContextMenu}
			disabled={disabled}
			className={cn(
				// Base circle chip shape
				"relative flex items-center justify-center",
				"h-12 w-12 sm:h-14 sm:w-14 rounded-full",
				"border-2 font-bold text-xs sm:text-sm font-mono",
				// Depth / 3-D look
				"shadow-lg",
				// Interaction
				"transition-all duration-150 ease-out",
				"active:scale-95 active:shadow-sm",
				"hover:brightness-110 hover:scale-105",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
				// Inner dashed ring (casino chip detail)
				"before:absolute before:inset-[3px] before:rounded-full before:border before:border-dashed before:border-white/20 before:pointer-events-none",
				styles,
				disabled &&
					"opacity-30 cursor-not-allowed pointer-events-none shadow-none",
			)}
			title="Left-click to add, right-click to subtract"
		>
			{formatCompact(value)}
		</button>
	);
}

export function BlackjackBetControls({
	balance,
	minBet = 10,
	maxBet = 1_000_000,
	isLoading,
	onDeal,
}: BlackjackBetControlsProps) {
	const [bet, setBet] = useState(minBet);
	const [isFirstChip, setIsFirstChip] = useState(true);

	// Handler for manual numeric input. Accepts only digits, clamps to min/max/balance.
	const handleManualBetChange = (valueStr: string) => {
		const raw = valueStr.replace(/[^0-9]/g, "");
		if (raw === "") {
			// If the user empties the field, don't explode — set to minBet
			setBet(minBet);
			setIsFirstChip(false);
			return;
		}
		const n = parseInt(raw, 10) || minBet;
		const clamped = Math.max(minBet, Math.min(Math.min(maxBet, balance), n));
		setBet(clamped);
		setIsFirstChip(false);
	};

	const handleManualBetBlur = () => {
		setBet((prev) =>
			Math.max(minBet, Math.min(prev, Math.min(maxBet, balance))),
		);
	};

	const addChip = (value: number) => {
		setBet((prev) => {
			// If this is the very first chip click (bet hasn't been manually changed yet),
			// replace the minBet instead of adding to it.
			if (isFirstChip) {
				setIsFirstChip(false);
				return Math.min(value, Math.min(maxBet, balance));
			}
			return Math.min(prev + value, Math.min(maxBet, balance));
		});
	};

	const subtractChip = (value: number) => {
		setBet((prev) => Math.max(prev - value, minBet));
	};

	const clearBet = () => {
		setBet(minBet);
		setIsFirstChip(true);
	};

	const canDeal = bet >= minBet && bet <= balance && !isLoading;
	const effectiveBet = Math.min(bet, balance);

	return (
		<div className="flex flex-col items-center gap-4 h-full justify-between">
			{/* Current bet display with manual numeric input */}
			<div className="flex flex-col items-center gap-1">
				<span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
					Bet
				</span>
				<div
					className={cn(
						"flex items-center gap-2 rounded-2xl border px-4 py-2.5",
						"bg-card border-border",
						"min-w-[140px] justify-center",
					)}
				>
					<Coins className="h-4 w-4 text-amber-400 shrink-0" />
					<input
						type="text"
						inputMode="numeric"
						pattern="[0-9]*"
						value={String(bet)}
						onChange={(e) => handleManualBetChange(e.target.value)}
						onBlur={handleManualBetBlur}
						className="text-xl font-bold font-mono tracking-tight text-foreground bg-transparent text-center outline-none w-36"
						aria-label="Bet amount"
					/>
				</div>
				{bet > balance && (
					<span className="text-[11px] text-red-400 font-medium">
						Exceeds balance — capped at {formatCurrency(balance)}
					</span>
				)}
			</div>

			{/* Chip grid */}
			<div className="flex flex-row flex-wrap items-center justify-center gap-2 sm:gap-3">
				{CHIP_VALUES.map((value) => (
					<Chip
						key={value}
						value={value}
						disabled={isLoading || balance < minBet}
						onClick={() => addChip(value)}
						onRightClick={() => subtractChip(value)}
					/>
				))}
			</div>

			{/* Action row — Clear + Deal */}
			<div className="flex flex-row items-center gap-3">
				{/* Clear / reset bet */}
				<button
					type="button"
					onClick={clearBet}
					disabled={isLoading || bet === minBet}
					className={cn(
						"flex items-center gap-1.5 rounded-xl border px-4 py-2.5",
						"text-sm font-semibold text-muted-foreground",
						"bg-muted/40 border-border/40",
						"transition-all duration-150 hover:bg-muted/60 hover:text-foreground",
						"active:scale-95",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
						(isLoading || bet === minBet) &&
							"opacity-30 cursor-not-allowed pointer-events-none",
					)}
				>
					<RotateCcw className="h-3.5 w-3.5" />
					Clear
				</button>

				{/* Deal button */}
				<button
					type="button"
					onClick={() => onDeal(effectiveBet)}
					disabled={!canDeal}
					className={cn(
						"flex items-center gap-2 rounded-xl px-6 py-2.5",
						"text-sm font-bold tracking-wide text-white",
						"bg-emerald-600 border border-emerald-500/60",
						"shadow-lg shadow-emerald-900/30",
						"transition-all duration-150",
						"hover:bg-emerald-500 hover:border-emerald-400/80",
						"active:scale-95 active:shadow-sm",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
						!canDeal &&
							"opacity-40 cursor-not-allowed pointer-events-none shadow-none",
					)}
				>
					{isLoading ? (
						<>
							<span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
							Dealing...
						</>
					) : (
						<>
							<PlayCircle className="h-4 w-4" />
							Deal
						</>
					)}
				</button>
			</div>

			{/* Balance hint */}
			<p className="text-[11px] text-muted-foreground/70 font-medium">
				Balance: {formatCurrency(balance)} · Min: {formatCurrency(minBet)} ·
				Max: {formatCurrency(Math.min(maxBet, balance))}
			</p>
		</div>
	);
}
