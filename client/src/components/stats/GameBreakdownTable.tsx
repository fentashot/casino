import { Dices, Layers, Rows3 } from "lucide-react";
import type { GameBreakdownEntry } from "@/games/stats/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface GameBreakdownTableProps {
	games: GameBreakdownEntry[];
}

const GAME_ICON: Record<string, React.ReactNode> = {
	Roulette: <Dices className="h-4 w-4" />,
	Blackjack: <Layers className="h-4 w-4" />,
	Plinko: <Rows3 className="h-4 w-4" />,
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
		<div className="overflow-x-auto">
			<table className="w-full text-sm">
				<thead>
					<tr className="text-xs text-muted-foreground border-b border-border">
						<th className="text-left font-medium py-2 pr-4">Gra</th>
						<th className="text-right font-medium py-2 px-3">Rundy</th>
						<th className="text-right font-medium py-2 px-3">Obstawione</th>
						<th className="text-right font-medium py-2 px-3">Wygrane</th>
						<th className="text-right font-medium py-2 px-3">Profit</th>
						<th className="text-right font-medium py-2 pl-3">Win rate</th>
					</tr>
				</thead>
				<tbody>
					{games.map((entry) => {
						const profitPositive = entry.profit >= 0;
						return (
							<tr
								key={entry.game}
								className="border-b border-border/50 last:border-0"
							>
								<td className="py-3 pr-4">
									<div className="flex items-center gap-2">
										<span className="text-muted-foreground">
											{GAME_ICON[entry.game] ?? <Dices className="h-4 w-4" />}
										</span>
										<span className="font-medium">{entry.game}</span>
									</div>
								</td>
								<td className="text-right font-mono py-3 px-3">
									{entry.rounds}
								</td>
								<td className="text-right font-mono py-3 px-3">
									{formatCurrency(entry.wagered)}
								</td>
								<td className="text-right font-mono py-3 px-3">
									{formatCurrency(entry.won)}
								</td>
								<td
									className={cn(
										"text-right font-mono font-semibold py-3 px-3",
										profitPositive ? "text-emerald-400" : "text-red-400",
									)}
								>
									{profitPositive ? "+" : ""}
									{formatCurrency(entry.profit)}
								</td>
								<td
									className={cn(
										"text-right font-mono py-3 pl-3",
										entry.winRate >= 50 ? "text-emerald-400" : "text-red-400",
									)}
								>
									{entry.winRate}%
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
