import { Info, Shield, ShieldOff } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface BlackjackInsuranceProps {
	/** Original bet — insurance costs half of this */
	originalBet: number;
	/** Max insurance bet (floor(originalBet / 2)) */
	maxInsuranceBet: number;
	/** Current balance available */
	balance: number;
	/** Whether the UI is in a loading/disabled state */
	isLoading: boolean;
	onTake: () => void;
	onSkip: () => void;
}

export function BlackjackInsurance({
	originalBet,
	maxInsuranceBet,
	balance,
	isLoading,
	onTake,
	onSkip,
}: BlackjackInsuranceProps) {
	const canAfford = balance >= maxInsuranceBet;
	const canTake = canAfford && !isLoading;

	return (
		<div
			className={cn(
				"relative w-full max-w-sm rounded-2xl overflow-hidden",
				"border border-amber-500/40",
				"bg-card",
			)}
		>
			<div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-amber-400/10 pointer-events-none" />
			<div className="h-0.5 w-full bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />

			<div className="flex flex-col items-center gap-4 p-5">
				{/* Header */}
				<div className="flex items-center gap-2">
					<div className="flex items-center justify-center h-7 w-7 rounded-full bg-amber-500/20 border border-amber-400/30">
						<Shield className="h-3.5 w-3.5 text-amber-400" />
					</div>
					<h3 className="text-sm font-bold text-amber-200 tracking-tight">
						Ubezpieczenie?
					</h3>
					<p className="text-xs text-amber-300/60">Dealer pokazuje Asa</p>
				</div>

				{/* Breakdown */}
				<div className="w-full rounded-xl border border-amber-500/20 bg-amber-950/40 px-3 py-2.5 flex flex-col gap-2">
					<div className="flex items-start gap-2">
						<Info className="h-3.5 w-3.5 text-amber-400/60 shrink-0 mt-0.5" />
						<p className="text-[11px] text-amber-200/60 leading-relaxed">
							Koszt:{" "}
							<span className="font-semibold text-amber-300">
								{formatCurrency(maxInsuranceBet)}
							</span>{" "}
							· Wypłata:{" "}
							<span className="font-semibold text-amber-300">2:1</span> jeśli
							dealer ma BJ
						</p>
					</div>
					<div className="grid grid-cols-3 gap-1.5">
						<StatCell
							label="Stawka"
							value={formatCurrency(originalBet)}
							highlight={false}
						/>
						<StatCell
							label="Koszt"
							value={formatCurrency(maxInsuranceBet)}
							highlight={false}
						/>
						<StatCell
							label="Wypłata"
							value={formatCurrency(maxInsuranceBet * 3)}
							highlight
						/>
					</div>
				</div>

				{/* Buttons */}
				<div className="flex flex-row items-center gap-3 w-full">
					<button
						type="button"
						onClick={onSkip}
						disabled={isLoading}
						className={cn(
							"flex-1 flex items-center justify-center gap-2",
							"rounded-xl border px-4 py-2.5",
							"text-sm font-semibold tracking-wide",
							"bg-zinc-700/60 border-zinc-600/50 text-zinc-200",
							"transition-all duration-150",
							"hover:bg-zinc-600/70 hover:border-zinc-500/60",
							"active:scale-95",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
							isLoading && "opacity-40 cursor-not-allowed pointer-events-none",
						)}
					>
						<ShieldOff className="h-4 w-4 opacity-70" />
						Pomiń
					</button>

					<button
						type="button"
						onClick={onTake}
						disabled={!canTake}
						className={cn(
							"flex-1 flex items-center justify-center gap-2",
							"rounded-xl border px-4 py-2.5",
							"text-sm font-bold tracking-wide text-amber-900",
							"bg-amber-400 border-amber-300/60",
							"shadow-lg shadow-amber-900/30",
							"transition-all duration-150",
							"hover:bg-amber-300 hover:border-amber-200/70",
							"active:scale-95 active:shadow-sm",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
							!canTake &&
								"opacity-40 cursor-not-allowed pointer-events-none shadow-none",
						)}
					>
						<Shield className="h-4 w-4" />
						{canAfford
							? `Kup −${formatCurrency(maxInsuranceBet)}`
							: "Brak środków"}
					</button>
				</div>

				{isLoading && (
					<div className="flex items-center gap-2 text-xs text-amber-400/60">
						<span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
						Przetwarzanie...
					</div>
				)}
			</div>
		</div>
	);
}

function StatCell({
	label,
	value,
	highlight,
}: {
	label: string;
	value: string;
	highlight: boolean;
}) {
	return (
		<div
			className={cn(
				"flex flex-col items-center rounded-lg px-2 py-1.5",
				highlight
					? "bg-amber-500/15 border border-amber-400/20"
					: "bg-zinc-800/40 border border-zinc-700/30",
			)}
		>
			<span className="text-[9px] uppercase tracking-widest text-zinc-400 font-medium mb-0.5">
				{label}
			</span>
			<span
				className={cn(
					"text-xs font-bold font-mono",
					highlight ? "text-amber-300" : "text-zinc-200",
				)}
			>
				{value}
			</span>
		</div>
	);
}
