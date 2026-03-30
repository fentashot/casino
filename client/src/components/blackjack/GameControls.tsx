import { RotateCcw } from "lucide-react";
import type { BlackjackGameState } from "@/games/blackjack/types";
import { cn } from "@/lib/utils";
import { BlackjackActions } from "./BlackjackActions";
import { BlackjackBetControls } from "./BlackjackBetControls";
import { BlackjackInsurance } from "./BlackjackInsurance";
import { InsuranceResultNote, PayoutSummary } from "./PayoutSummary";

/** Fixed pixel height of the controls area */
export const CONTROLS_HEIGHT = 300;

interface GameControlsProps {
	phase: string;
	serverGame: BlackjackGameState | null;
	balance: number;
	isLoading: boolean;
	isAnimating: boolean;
	canHit: boolean;
	canStand: boolean;
	canDouble: boolean;
	canSplit: boolean;
	maxInsuranceBet: number;
	onDeal: (bet: number) => void;
	onHit: () => void;
	onStand: () => void;
	onDouble: () => void;
	onSplit: () => void;
	onInsurance: (decision: "take" | "skip") => void;
	onNewGame: () => void;
}

export function GameControls({
	phase,
	serverGame,
	balance,
	isLoading,
	isAnimating,
	canHit,
	canStand,
	canDouble,
	canSplit,
	maxInsuranceBet,
	onDeal,
	onHit,
	onStand,
	onDouble,
	onSplit,
	onInsurance,
	onNewGame,
}: GameControlsProps) {
	const isBetting = phase === "betting";
	const isInsurance = phase === "insurance";
	// Show playing controls only when it's truly the player's turn AND
	// the card reveal animation has finished — otherwise show the dealing panel.
	const isPlaying = phase === "playing" && !isAnimating;
	const isDealing = (phase === "playing" || phase === "dealer") && isAnimating;
	const isDealer = phase === "dealer" && !isAnimating;
	const isFinished = phase === "finished" && !isAnimating;

	return (
		<div
			className="rounded-2xl border border-border bg-card overflow-hidden"
			style={{ height: CONTROLS_HEIGHT }}
		>
			{/* ── BETTING ────────────────────────────────────────────────────── */}
			{isBetting && (
				<div className="h-full flex flex-col p-5 sm:p-6">
					<div className="flex items-center gap-2 mb-4 flex-none">
						<span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
						<span className="text-sm font-semibold">Postaw zakład</span>
					</div>
					<div className="flex-1 min-h-0">
						<BlackjackBetControls
							balance={balance}
							isLoading={isLoading}
							onDeal={onDeal}
						/>
					</div>
				</div>
			)}

			{/* ── INSURANCE ──────────────────────────────────────────────────── */}
			{isInsurance && serverGame && (
				<div className="h-full flex items-center justify-center p-5">
					<BlackjackInsurance
						originalBet={serverGame.playerHands[0]?.bet ?? 0}
						maxInsuranceBet={maxInsuranceBet}
						balance={balance}
						isLoading={isLoading}
						onTake={() => onInsurance("take")}
						onSkip={() => onInsurance("skip")}
					/>
				</div>
			)}

			{/* ── PLAYING ────────────────────────────────────────────────────── */}
			{isPlaying && (
				<div className="h-full flex flex-col items-center justify-center gap-4 p-5">
					<div className="flex items-center gap-2">
						<span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
						<span className="text-sm font-semibold">
							Twoja tura
							{serverGame && serverGame.playerHands.length > 1 && (
								<span className="text-muted-foreground font-normal">
									{" "}
									— Ręka {serverGame.activeHandIndex + 1} z{" "}
									{serverGame.playerHands.length}
								</span>
							)}
						</span>
						{isAnimating && (
							<span className="text-[11px] text-muted-foreground">
								(rozdawanie...)
							</span>
						)}
					</div>
					<BlackjackActions
						canHit={canHit}
						canStand={canStand}
						canDouble={canDouble}
						canSplit={canSplit}
						isLoading={isLoading || isAnimating}
						onHit={onHit}
						onStand={onStand}
						onDouble={onDouble}
						onSplit={onSplit}
					/>
				</div>
			)}

			{/* ── DEALING IN PROGRESS (covers both initial deal and dealer turn) ── */}
			{isDealing && (
				<div className="h-full flex items-center justify-center">
					<div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
						<div className="flex items-center gap-2">
							<span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
							<span>
								{phase === "dealer" ? "Dealer gra…" : "Rozdawanie kart…"}
							</span>
						</div>
						{/* Animated dots to indicate progress */}
						<div className="flex gap-1.5">
							{[0, 1, 2].map((i) => (
								<span
									key={i}
									className="h-1 w-1 rounded-full bg-muted-foreground/50 animate-pulse"
									style={{ animationDelay: `${i * 200}ms` }}
								/>
							))}
						</div>
					</div>
				</div>
			)}

			{/* ── DEALER PLAYING ─────────────────────────────────────────────── */}
			{isDealer && (
				<div className="h-full flex items-center justify-center">
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
						Dealer gra…
					</div>
				</div>
			)}

			{/* ── FINISHED ───────────────────────────────────────────────────── */}
			{isFinished && (
				<div className="h-full flex flex-col items-center justify-center gap-4 p-5 overflow-y-auto">
					{serverGame && <PayoutSummary hands={serverGame.playerHands} />}

					{(serverGame?.playerHands[0]?.insuranceBet ?? 0) > 0 && (
						<InsuranceResultNote
							bet={serverGame?.playerHands[0]?.insuranceBet ?? 0}
							result={serverGame?.playerHands[0]?.insuranceResult ?? null}
						/>
					)}

					<button
						type="button"
						onClick={onNewGame}
						className={cn(
							"flex items-center gap-2 rounded-xl px-8 py-3 flex-none",
							"text-sm font-bold tracking-wide text-white",
							"bg-emerald-600 border border-emerald-500/60",
							"shadow-lg shadow-emerald-900/30",
							"transition-all duration-150",
							"hover:bg-emerald-500 hover:border-emerald-400/80",
							"active:scale-95",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
						)}
					>
						<RotateCcw className="h-4 w-4" />
						Nowa gra
					</button>
				</div>
			)}
		</div>
	);
}
