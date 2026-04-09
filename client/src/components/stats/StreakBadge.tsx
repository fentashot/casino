import { Flame, Snowflake } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakBadgeProps {
	currentStreak: number;
	longestWinStreak: number;
	longestLossStreak: number;
}

export function StreakBadge({
	currentStreak,
	longestWinStreak,
	longestLossStreak,
}: StreakBadgeProps) {
	const isWin = currentStreak > 0;
	const isLoss = currentStreak < 0;
	const abs = Math.abs(currentStreak);

	return (
		<div className="flex flex-col gap-4">
			{/* Current */}
			<div className="flex items-center gap-3">
				<div
					className={cn(
						"flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
						isWin
							? "bg-emerald-500/10 text-emerald-400"
							: isLoss
								? "bg-red-500/10 text-red-400"
								: "bg-muted text-muted-foreground",
					)}
				>
					{isLoss ? (
						<Snowflake className="h-5 w-5" />
					) : (
						<Flame className="h-5 w-5" />
					)}
				</div>
				<div>
					<div className="text-xs text-muted-foreground">Aktualny streak</div>
					<div className="flex items-baseline gap-1.5">
						<span
							className={cn(
								"text-2xl font-bold font-mono",
								isWin
									? "text-emerald-400"
									: isLoss
										? "text-red-400"
										: "text-muted-foreground",
							)}
						>
							{abs}
						</span>
						<span className="text-xs text-muted-foreground">
							{isWin ? "wygrane z rzędu" : isLoss ? "przegrane z rzędu" : "—"}
						</span>
					</div>
				</div>
			</div>

			{/* Records */}
			<div className="grid grid-cols-2 gap-4 text-sm">
				<div>
					<div className="text-xs text-muted-foreground mb-0.5">
						Najlepszy streak
					</div>
					<span className="text-lg font-bold font-mono text-emerald-400">
						{longestWinStreak}
					</span>
					<span className="text-xs text-muted-foreground ml-1">wygranych</span>
				</div>
				<div>
					<div className="text-xs text-muted-foreground mb-0.5">
						Najgorszy streak
					</div>
					<span className="text-lg font-bold font-mono text-red-400">
						{longestLossStreak}
					</span>
					<span className="text-xs text-muted-foreground ml-1">
						przegranych
					</span>
				</div>
			</div>
		</div>
	);
}
