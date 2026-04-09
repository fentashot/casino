import { createFileRoute, Link } from "@tanstack/react-router";
import { Dices, Layers, Rows3, TrendingUp } from "lucide-react";
import { useAuth } from "@/auth-context";
import { useStatsSummary } from "@/games/stats/useStats";
import { formatProfit } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/games/")({
	component: GamesIndex,
});

function GamesIndex() {
	const { user } = useAuth();
	const { overview, isLoading } = useStatsSummary();
	const ov = overview;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl font-bold tracking-tight">
					{getGreeting()},{" "}
					<span className="text-primary">
						{user?.name?.split(" ")[0] ?? "Player"}
					</span>
				</h1>
				<p className="text-sm text-muted-foreground mt-1">
					Wybierz grę. Wszystkie wyniki są weryfikowalne kryptograficznie.
				</p>
			</div>

			{/* Quick stats — inline, not cards */}
			{!isLoading && ov && ov.totalRounds > 0 && (
				<Link
					to="/games/stats"
					className="flex items-center gap-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
				>
					<span>
						<span className="font-mono font-semibold text-foreground">
							{ov.totalRounds}
						</span>{" "}
						rund
					</span>
					<span>
						Net{" "}
						<span
							className={`font-mono font-semibold ${ov.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}
						>
							{formatProfit(ov.netProfit)}
						</span>
					</span>
					<span>
						Win rate{" "}
						<span className="font-mono font-semibold text-foreground">
							{ov.winRate}%
						</span>
					</span>
					<span className="ml-auto text-xs text-primary font-medium">
						Statystyki →
					</span>
				</Link>
			)}

			{/* Games */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				<GameCard
					title="Roulette"
					description="Europejska ruletka z jednym zerem. Stawki proste, splity, streety i więcej."
					detail="Do 36× wypłaty"
					icon={<Dices className="h-5 w-5" />}
					to="/games/roulette"
				/>
				<GameCard
					title="Blackjack"
					description="Klasyczne 21 — pokonaj krupiera. Split, double down, insurance."
					detail="3:2 za blackjacka"
					icon={<Layers className="h-5 w-5" />}
					to="/games/blackjack"
				/>
				<GameCard
					title="Plinko"
					description="Upuść piłkę przez kołki. Wybierz liczbę rzędów i poziom ryzyka."
					detail="Do 1000× wypłaty"
					icon={<Rows3 className="h-5 w-5" />}
					to="/games/plinko"
				/>
			</div>
		</div>
	);
}

function GameCard({
	title,
	description,
	detail,
	icon,
	to,
}: {
	title: string;
	description: string;
	detail: string;
	icon: React.ReactNode;
	to: string;
}) {
	return (
		<Link to={to} className="block group">
			<div className="rounded-xl border border-border bg-card p-5 transition-colors duration-150 hover:border-primary/40 hover:bg-muted/30">
				<div className="flex items-center gap-3 mb-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors duration-150">
						{icon}
					</div>
					<h3 className="text-base font-semibold">{title}</h3>
				</div>
				<p className="text-sm text-muted-foreground leading-relaxed mb-3">
					{description}
				</p>
				<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
					<TrendingUp className="h-3 w-3" />
					<span>{detail}</span>
				</div>
			</div>
		</Link>
	);
}

function getGreeting(): string {
	const hour = new Date().getHours();
	if (hour < 6) return "Dobranoc";
	if (hour < 12) return "Dzień dobry";
	if (hour < 18) return "Cześć";
	return "Dobry wieczór";
}
