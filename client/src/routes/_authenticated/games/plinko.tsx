import { createFileRoute } from "@tanstack/react-router";
import { Rows3, TrendingUp } from "lucide-react";
import { PlinkoGame } from "@/components/plinko/PlinkoGame";

export const Route = createFileRoute("/_authenticated/games/plinko")({
	component: PlinkoPage,
});

function PlinkoPage() {
	return (
		<div className="flex flex-col gap-5 pb-12">
			<div className="flex items-start sm:items-center justify-between gap-4 animate-fade-in">
				<div className="space-y-1">
					<div className="flex items-center gap-2 flex-wrap">
						<h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
							Plinko
						</h1>
						<div className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5">
							<div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
							<span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
								Live
							</span>
						</div>
					</div>
					<p className="text-sm text-muted-foreground">
						Drop the ball &middot; Choose rows &amp; difficulty &middot; Win up
						to 1000&times;
					</p>
				</div>

				<div className="hidden sm:flex items-center gap-2 flex-wrap justify-end">
					<StatPill
						icon={<TrendingUp className="h-3.5 w-3.5" />}
						label="Max payout"
						value="1000×"
					/>
					<StatPill
						icon={<Rows3 className="h-3.5 w-3.5" />}
						label="Rows"
						value="8–16"
					/>
				</div>
			</div>

			<div className="animate-slide-up" style={{ animationDelay: "60ms" }}>
				<PlinkoGame />
			</div>
		</div>
	);
}

function StatPill({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
}) {
	return (
		<div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5">
			<span className="text-muted-foreground">{icon}</span>
			<span className="text-[11px] text-muted-foreground">{label}:</span>
			<span className="text-[11px] font-semibold text-foreground font-mono">
				{value}
			</span>
		</div>
	);
}
