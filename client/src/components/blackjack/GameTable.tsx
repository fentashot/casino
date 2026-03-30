import { handTotal, isSoftHand } from "@/games/blackjack/cardHelpers";
import type { BlackjackGameState } from "@/games/blackjack/types";
import { cn } from "@/lib/utils";
import { BlackjackHand } from "./BlackjackHand";
import { ResultBanner, type ResultVariant } from "./ResultBanner";

/** Fixed pixel height of the felt table — enough room for both hand rows */
export const TABLE_HEIGHT = 500;

interface GameTableProps {
	/** Animated display state (card-by-card reveal) */
	renderGame: BlackjackGameState | null;
	/** Authoritative server state — used for final results */
	serverGame: BlackjackGameState | null;
	phase: string;
	isPlaying: boolean;
	isFinished: boolean;
	isAnimating: boolean;
	resultBanner: { label: string; variant: ResultVariant } | null;
}

export function GameTable({
	renderGame,
	serverGame,
	phase,
	isPlaying,
	isFinished,
	isAnimating,
	resultBanner,
}: GameTableProps) {
	const dealerCards = renderGame?.dealerHand.cards ?? [];
	const dealerTotal = handTotal(dealerCards);
	const dealerSoft = isSoftHand(dealerCards);

	return (
		<div
			className="relative overflow-hidden rounded-2xl border border-border/50 bg-[#0a3d1a] dark:bg-[#072910] shadow-2xl shadow-black/40"
			style={{ height: TABLE_HEIGHT }}
		>
			{/* Felt grid texture */}
			<div
				className="absolute inset-0 pointer-events-none opacity-[0.04]"
				style={{
					backgroundImage:
						"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,1) 2px,rgba(255,255,255,1) 3px)," +
						"repeating-linear-gradient(90deg,transparent,transparent 2px,rgba(255,255,255,1) 2px,rgba(255,255,255,1) 3px)",
				}}
			/>

			{/* Inner highlight ring */}
			<div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5 pointer-events-none" />

			{/* Arc decoration */}
			<div
				className="absolute left-1/2 -translate-x-1/2 pointer-events-none opacity-50"
				style={{
					width: "160%",
					paddingBottom: "36%",
					borderRadius: "50% 50% 0 0 / 100% 100% 0 0",
					border: "1.5px solid rgba(255,255,255,0.06)",
					bottom: "-8%",
				}}
			/>

			{/*
        Inner layout — flex column filling the fixed TABLE_HEIGHT.
        Heights are fixed so adding cards never shifts the layout.
          • Dealer slot: 130 px
          • Divider:     100 px  (deliberately generous so "vs" sits in the centre)
          • Player slot: fills remaining height, overflow hidden
      */}
			<div className="relative z-10 flex flex-col h-full px-6 sm:px-8 pt-6 sm:pt-7 pb-6">
				{/* ── Dealer row ─────────────────────────────────────────────── */}
				<div className="flex justify-center" style={{ height: 130 }}>
					<BlackjackHand
						key={`dealer-${serverGame?.id ?? "empty"}`}
						cards={dealerCards}
						total={dealerTotal}
						isSoft={dealerSoft}
						label="Dealer"
						gameId={renderGame?.id}
						handSlot="dealer"
						cardIndexOffset={1}
					/>
				</div>

				{/* ── vs divider ─────────────────────────────────────────────── */}
				<div
					className="flex-none flex items-center gap-4 opacity-25"
					style={{ height: 100 }}
				>
					<div className="flex-1 h-px bg-white/30" />
					<span className="text-white/40 text-xs font-mono tracking-widest uppercase select-none">
						vs
					</span>
					<div className="flex-1 h-px bg-white/30" />
				</div>

				{/* ── Player row — horizontal scroll if multiple hands ── */}
				<div className="flex-1 overflow-hidden flex items-start justify-center">
					{renderGame && renderGame.playerHands.length > 0 ? (
						<div className="flex flex-row flex-wrap gap-6 justify-center w-full items-start">
							{renderGame.playerHands.map((hand, i) => {
								const total = handTotal(hand.cards);
								const soft = isSoftHand(hand.cards);
								const active =
									i === (serverGame?.activeHandIndex ?? 0) && isPlaying;
								const label =
									renderGame.playerHands.length > 1 ? `Ręka ${i + 1}` : "Ty";
								const serverHand = serverGame?.playerHands[i];
								// Only show result badges after ALL animations finish.
								// displayGame (hand.result) may already carry the final result
								// from the server state, so we must gate on isFinished here.
								const result =
									isFinished && serverHand ? serverHand.result : undefined;

								return (
									<BlackjackHand
										key={`player-${i}-${serverGame?.id ?? "empty"}`}
										cards={hand.cards}
										total={total}
										isSoft={soft}
										result={result}
										label={label}
										isActive={active}
										small={renderGame.playerHands.length > 1}
										gameId={renderGame.id}
										handSlot={i}
										cardIndexOffset={i * 10}
									/>
								);
							})}
						</div>
					) : (
						<BlackjackHand cards={[]} total={0} label="Ty" />
					)}
				</div>
			</div>

			{/* ── Result banner — absolute overlay, zero impact on flow ──── */}
			{isFinished && resultBanner && (
				<div className="absolute inset-x-0 bottom-3 sm:bottom-4 flex justify-center pointer-events-none z-20 px-2">
					<ResultBanner
						key={`result-${serverGame?.id}`}
						variant={resultBanner.variant}
						label={resultBanner.label}
					/>
				</div>
			)}

			{/* ── Status pill — dealer playing / dealing in progress ───────── */}
			{(phase === "dealer" || isAnimating) && !isFinished && (
				<div className="absolute inset-x-0 bottom-3 sm:bottom-4 flex justify-center z-20 px-2">
					<div
						className={cn(
							"flex items-center gap-2 rounded-full px-3 py-1.5",
							"text-white/70 text-xs bg-black/35 backdrop-blur-sm",
						)}
					>
						<span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-pulse" />
						<span>{phase === "dealer" ? "Dealer gra…" : "Rozdawanie…"}</span>
					</div>
				</div>
			)}
		</div>
	);
}
