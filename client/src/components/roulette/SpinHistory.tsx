import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Clock, TrendingDown, Trophy } from "lucide-react";
import { useState } from "react";
import { ROULETTE_COLORS } from "@/games/roulette/utils";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type Bet = {
	type: string;
	amount: string;
	win: string;
	numbers: string;
	color?: string | null;
	choice?: string | null;
};

type Spin = {
	id: string;
	number: number;
	color: string;
	totalBet: string;
	totalWin: string;
	createdAt: string;
	bets: Bet[];
};

export function SpinHistory() {
	const [expandedSpinId, setExpandedSpinId] = useState<string | null>(null);

	const { data, isLoading, error } = useQuery({
		queryKey: ["casino-history"],
		queryFn: async () => {
			const res = await api.casino.history.$get({
				query: { limit: "10" },
			});
			if (!res.ok) throw new Error("Failed to fetch history");
			return res.json() as Promise<{ spins: Spin[] }>;
		},
		staleTime: 10000,
	});

	if (isLoading) {
		return (
			<div className="space-y-2">
				{[...Array(4)].map((_, i) => (
					<div
						key={i}
						className="shimmer rounded-xl h-14"
						style={{ animationDelay: `${i * 100}ms` }}
					/>
				))}
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center py-8 gap-2">
				<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 border border-destructive/20">
					<TrendingDown className="h-5 w-5 text-destructive/60" />
				</div>
				<p className="text-sm text-destructive/80 font-medium">
					Failed to load history
				</p>
			</div>
		);
	}

	if (!data?.spins?.length) {
		return (
			<div className="flex flex-col items-center justify-center py-8 gap-3">
				<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/30 border border-border/30">
					<Clock className="h-6 w-6 text-muted-foreground/40" />
				</div>
				<div className="text-center space-y-1">
					<p className="text-sm font-medium text-muted-foreground/60">
						No history yet
					</p>
					<p className="text-xs text-muted-foreground/40">
						Your spin results will appear here
					</p>
				</div>
			</div>
		);
	}

	const toggleExpand = (spinId: string) => {
		setExpandedSpinId(expandedSpinId === spinId ? null : spinId);
	};

	const formatBetType = (bet: Bet): string => {
		try {
			const numbers = JSON.parse(bet.numbers) as number[];
			if (numbers && numbers.length > 0) {
				return `Nr: ${numbers.join(", ")}`;
			}
		} catch {
			// continue
		}

		if (bet.color) return bet.color === "red" ? "Red" : "Black";

		if (bet.choice) {
			const choiceMap: Record<string, string> = {
				even: "Even",
				odd: "Odd",
				low: "1–18",
				high: "19–36",
				"1st12": "1st Dozen",
				"2nd12": "2nd Dozen",
				"3rd12": "3rd Dozen",
				col1: "Column 1",
				col2: "Column 2",
				col3: "Column 3",
			};
			return choiceMap[bet.choice] || bet.choice;
		}

		return bet.type;
	};

	return (
		<div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
			{data.spins.map((spin, index) => {
				const totalBet = Number(spin.totalBet);
				const totalWin = Number(spin.totalWin);
				const profit = totalWin - totalBet;
				const isWin = totalWin > 0;
				const colorHex =
					ROULETTE_COLORS[spin.color as keyof typeof ROULETTE_COLORS] || "#333";
				const isExpanded = expandedSpinId === spin.id;

				return (
					<div
						key={spin.id}
						className={cn(
							"rounded-xl border overflow-hidden transition-all duration-200",
							isWin
								? "border-emerald-500/15 bg-emerald-500/[0.03]"
								: "border-border/30 bg-card/20",
							isExpanded && "border-border/50 bg-card/40",
						)}
						style={{ animationDelay: `${index * 40}ms` }}
					>
						{/* Main row — clickable */}
						<button
							type="button"
							className="w-full flex items-center justify-between px-3.5 py-3 cursor-pointer hover:bg-muted/10 transition-colors text-left"
							onClick={() => toggleExpand(spin.id)}
						>
							<div className="flex items-center gap-3">
								{/* Number badge */}
								<div
									className={cn(
										"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white transition-transform duration-200",
										isExpanded && "scale-110",
									)}
									style={{ backgroundColor: colorHex }}
								>
									{spin.number}
								</div>

								{/* Info */}
								<div className="flex flex-col min-w-0">
									<div className="flex items-center gap-2">
										<span className="text-sm font-medium text-foreground">
											{isWin ? (
												<span className="inline-flex items-center gap-1">
													<Trophy className="h-3 w-3 text-emerald-400" />
													Win
												</span>
											) : (
												"Loss"
											)}
										</span>
										<span className="text-[10px] text-muted-foreground/60">
											·
										</span>
										<span className="text-[10px] text-muted-foreground capitalize">
											{spin.color}
										</span>
									</div>
									<span className="text-[11px] text-muted-foreground">
										{new Date(spin.createdAt).toLocaleString("pl-PL", {
											day: "2-digit",
											month: "2-digit",
											hour: "2-digit",
											minute: "2-digit",
										})}
									</span>
								</div>
							</div>

							<div className="flex items-center gap-3">
								{/* Profit/loss amount */}
								<div className="text-right">
									<span
										className={cn(
											"text-sm font-bold font-mono tabular-nums",
											isWin ? "text-emerald-400" : "text-red-400",
										)}
									>
										{isWin ? "+" : ""}
										{profit.toLocaleString("pl-PL")} zł
									</span>
									<p className="text-[10px] text-muted-foreground font-mono">
										Bet: {totalBet.toLocaleString("pl-PL")} zł
									</p>
								</div>

								{/* Expand chevron */}
								<ChevronDown
									className={cn(
										"h-4 w-4 text-muted-foreground/40 transition-transform duration-200 shrink-0",
										isExpanded && "rotate-180 text-muted-foreground",
									)}
								/>
							</div>
						</button>

						{/* Expanded details */}
						<div
							className={cn(
								"overflow-hidden transition-all duration-300 ease-out",
								isExpanded ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0",
							)}
						>
							<div className="px-3.5 pb-3.5 pt-1 border-t border-border/20">
								<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
									Bets ({spin.bets.length})
								</p>

								<div className="space-y-1.5">
									{spin.bets.map((bet, idx) => {
										const betAmount = Number(bet.amount);
										const betWin = Number(bet.win);
										const betProfit = betWin - betAmount;
										const betIsWin = betWin > 0;

										return (
											<div
												key={idx}
												className={cn(
													"flex items-center justify-between rounded-lg px-3 py-2 text-xs",
													betIsWin
														? "bg-emerald-500/[0.06] border border-emerald-500/10"
														: "bg-muted/10 border border-border/20",
												)}
											>
												<div className="flex items-center gap-2">
													{/* Bet type indicator dot */}
													<div
														className={cn(
															"h-1.5 w-1.5 rounded-full shrink-0",
															betIsWin
																? "bg-emerald-400"
																: "bg-muted-foreground/30",
														)}
													/>
													<span className="font-medium text-foreground/80">
														{formatBetType(bet)}
													</span>
												</div>

												<div className="flex items-center gap-3">
													<span className="text-muted-foreground font-mono tabular-nums">
														{betAmount.toLocaleString("pl-PL")} zł
													</span>
													<span
														className={cn(
															"font-semibold font-mono tabular-nums min-w-[4rem] text-right",
															betIsWin
																? "text-emerald-400"
																: "text-muted-foreground/40",
														)}
													>
														{betIsWin
															? `+${betProfit.toLocaleString("pl-PL")} zł`
															: "—"}
													</span>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}
