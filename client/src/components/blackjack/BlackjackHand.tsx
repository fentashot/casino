import type { CardData, HandResult } from "@/games/blackjack/types";
import { cn } from "@/lib/utils";
import { BlackjackCard } from "./BlackjackCard";

export type { HandResult } from "@/games/blackjack/types";

interface BlackjackHandProps {
	cards: CardData[];
	total: number;
	isSoft?: boolean;
	result?: HandResult;
	/** Label shown above the hand — e.g. "Dealer" or "You" */
	label: string;
	/** Highlight as active hand (during split) */
	isActive?: boolean;
	/** Smaller card size */
	small?: boolean;
	/** Extra class on wrapper */
	className?: string;
	/**
	 * Stable game ID — used as part of card keys so that cards from a
	 * previous round are never reused for a new round, and cards already
	 * revealed in the current round are not remounted when new cards arrive.
	 */
	gameId?: string;
	/**
	 * Which hand slot this is (0 = player hand 0, "dealer" = dealer).
	 * Combined with gameId + card index to form stable React keys.
	 */
	handSlot?: number | "dealer";
	/**
	 * Base card index offset — used to stagger animation delays across
	 * dealer + player hands so every card in the deal sequence arrives
	 * at a slightly different time.
	 *
	 * e.g. dealer hand starts at offset 1 (d0 arrives after p0),
	 *      player hand starts at offset 0.
	 * The component then adds the card's own index on top of this.
	 */
	cardIndexOffset?: number;
}

const RESULT_CONFIG: Record<
	Exclude<HandResult, "playing">,
	{ label: string; classes: string }
> = {
	blackjack: {
		label: "Blackjack! 🎉",
		classes: "bg-amber-500/20 border-amber-400/50 text-amber-300",
	},
	win: {
		label: "Win! ✓",
		classes: "bg-emerald-500/20 border-emerald-400/50 text-emerald-300",
	},
	push: {
		label: "Push",
		classes: "bg-zinc-500/20 border-zinc-400/50 text-zinc-300",
	},
	loss: {
		label: "Loss",
		classes: "bg-red-500/20 border-red-400/50 text-red-300",
	},
	bust: {
		label: "Bust",
		classes: "bg-red-600/20 border-red-500/50 text-red-400",
	},
};

function TotalBadge({
	total,
	isSoft,
	bust,
}: {
	total: number;
	isSoft?: boolean;
	bust: boolean;
}) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold font-mono border",
				bust
					? "bg-red-500/20 border-red-500/40 text-red-300"
					: total === 21
						? "bg-amber-500/20 border-amber-400/40 text-amber-300"
						: "bg-muted/60 border-border/40 text-muted-foreground",
			)}
		>
			{isSoft && !bust ? `${total - 10}/${total}` : total}
		</span>
	);
}

function ResultBadge({ result }: { result: Exclude<HandResult, "playing"> }) {
	const config = RESULT_CONFIG[result];
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold border animate-number-pop",
				config.classes,
			)}
		>
			{config.label}
		</span>
	);
}

export function BlackjackHand({
	cards,
	total,
	isSoft,
	result,
	label,
	isActive = false,
	small = false,
	className,
	gameId,
	handSlot,
	cardIndexOffset = 0,
}: BlackjackHandProps) {
	const bust = total > 21;
	const showResult = result && result !== "playing";

	return (
		<div className={cn("flex flex-col gap-3", className)}>
			{/* Header row — label + total + result */}
			<div className="flex items-center gap-2 flex-wrap min-h-[24px]">
				<span
					className={cn(
						"text-xs font-semibold uppercase tracking-wider",
						isActive ? "text-primary" : "text-muted-foreground",
					)}
				>
					{label}
				</span>

				{/* Active indicator */}
				{isActive && (
					<span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
				)}

				{/* Total */}
				{cards.length > 0 && (
					<TotalBadge total={total} isSoft={isSoft} bust={bust} />
				)}

				{/* Result badge — animates in on reveal */}
				{showResult && <ResultBadge result={result} />}
			</div>

			{/* Cards row — fixed min-height so layout doesn't jump when cards arrive */}
			{/*
        The ring is applied only to the inner cards wrapper (never to the
        placeholder row) so that the highlight box doesn't change size when
        the first real card replaces the placeholder slots.
      */}
			<div
				className={cn(
					"flex flex-row gap-2 flex-wrap",
					// Reserve enough vertical space for one card row so the layout
					// doesn't shift when the first card is placed
					small
						? "min-h-[74px] sm:min-h-[84px]"
						: "min-h-[90px] sm:min-h-[106px]",
				)}
			>
				{cards.length === 0 ? (
					/* Empty placeholder slots — rendered without the active ring so
             the highlight box size is always anchored to real cards only. */
					<>
						<CardPlaceholder small={small} />
						{/* Only show second placeholder when NOT active — once the hand
                is active (dealing started) we show one slot so the ring
                that wraps the real cards starts at single-card width. */}
						{!isActive && <CardPlaceholder small={small} />}
					</>
				) : (
					/* Wrap real cards in their own div that carries the active ring */
					<div
						className={cn(
							"flex flex-row gap-2 flex-wrap",
							isActive && "ring-1 ring-primary/30 rounded-xl p-1.5",
						)}
					>
						{cards.map((card, i) => {
							// Stable key: tied to the game round + hand slot + card position.
							// This ensures:
							//  1. Cards from a previous round are never reused (gameId changes).
							//  2. A card already on screen is NOT remounted when the next card
							//     in the reveal queue arrives — only the newly added card gets
							//     the entrance animation.
							const stableKey =
								gameId != null
									? `${gameId}-${String(handSlot)}-${i}`
									: `${card.rank}-${card.suit}-${cardIndexOffset}-${i}`;
							return (
								<BlackjackCard
									key={stableKey}
									card={card}
									animate
									small={small}
								/>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}

function CardPlaceholder({ small }: { small: boolean }) {
	return (
		<div
			className={cn(
				"rounded-xl border-2 border-dashed border-border/30",
				small
					? "w-[52px] h-[74px] sm:w-[60px] sm:h-[84px]"
					: "w-[64px] h-[90px] sm:w-[76px] sm:h-[106px]",
			)}
		/>
	);
}
