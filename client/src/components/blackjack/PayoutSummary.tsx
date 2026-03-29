import { Shield } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface HandResult {
	bet: number;
	result?: string;
	doubled?: boolean;
	insuranceBet?: number;
	insuranceResult?: "win" | "loss" | null;
}

interface PayoutSummaryProps {
	hands: HandResult[];
}

function getHandPayout(hand: HandResult): { payout: number; label: string } {
	switch (hand.result) {
		case "blackjack":
			return { payout: Math.floor(hand.bet * 2.5), label: "Blackjack 3:2" };
		case "win":
			return {
				payout: hand.bet * 2,
				label: hand.doubled ? "Wygrana (double)" : "Wygrana",
			};
		case "push":
			return { payout: hand.bet, label: "Remis (zwrot)" };
		case "bust":
			return { payout: 0, label: "Bust" };
		default:
			return { payout: 0, label: "Przegrana" };
	}
}

export function PayoutSummary({ hands }: PayoutSummaryProps) {
	if (hands.length === 0) return null;

	const rows = hands.map((hand, index) => {
		const { payout, label } = getHandPayout(hand);
		return { index, bet: hand.bet, payout, profit: payout - hand.bet, label };
	});

	const totalBet = rows.reduce((s, r) => s + r.bet, 0);
	const totalPayout = rows.reduce((s, r) => s + r.payout, 0);
	const totalProfit = totalPayout - totalBet;

	return (
		<div className="w-full max-w-sm rounded-xl border border-border bg-card overflow-hidden">
			{rows.map((row) => (
				<div
					key={row.index}
					className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 last:border-b-0"
				>
					<div className="flex flex-col">
						<span className="text-xs font-medium">
							{rows.length > 1 ? `Ręka ${row.index + 1}` : "Wynik"}
						</span>
						<span className="text-[11px] text-muted-foreground">
							{row.label}
						</span>
					</div>
					<span
						className={cn(
							"text-sm font-semibold font-mono",
							row.profit > 0
								? "text-emerald-400"
								: row.profit === 0
									? "text-zinc-400"
									: "text-red-400",
						)}
					>
						{row.profit >= 0 ? "+" : ""}
						{formatCurrency(row.profit)}
					</span>
				</div>
			))}

			{rows.length > 1 && (
				<div className="flex items-center justify-between px-4 py-2.5 bg-muted/20 border-t border-border/40">
					<span className="text-xs font-semibold uppercase tracking-wider">
						Razem
					</span>
					<span
						className={cn(
							"text-sm font-bold font-mono",
							totalProfit > 0
								? "text-emerald-400"
								: totalProfit === 0
									? "text-zinc-400"
									: "text-red-400",
						)}
					>
						{totalProfit >= 0 ? "+" : ""}
						{formatCurrency(totalProfit)}
					</span>
				</div>
			)}
		</div>
	);
}

interface InsuranceResultNoteProps {
	bet: number;
	result: "win" | "loss" | null;
}

export function InsuranceResultNote({ bet, result }: InsuranceResultNoteProps) {
	if (!result) return null;
	const won = result === "win";

	return (
		<div
			className={cn(
				"flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-medium",
				won
					? "bg-amber-500/10 border-amber-400/30 text-amber-300"
					: "bg-zinc-700/30 border-zinc-600/30 text-zinc-400",
			)}
		>
			<Shield className="h-3.5 w-3.5 shrink-0" />
			<span>
				{won
					? `Ubezpieczenie wygrało: +${formatCurrency(bet * 2)} (wypłata 2:1)`
					: `Ubezpieczenie przegrane: −${formatCurrency(bet)}`}
			</span>
		</div>
	);
}
