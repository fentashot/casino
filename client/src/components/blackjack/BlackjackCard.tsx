import type { CardData, Rank, Suit } from "@/lib/blackjack";
import { cn } from "@/lib/utils";

export type { CardData, Rank, Suit } from "@/lib/blackjack";

interface BlackjackCardProps {
	card: CardData;
	animate?: boolean;
	className?: string;
	small?: boolean;
}

const RED_SUITS = new Set(["♥", "♦"]);

function isRed(suit: string) {
	return RED_SUITS.has(suit);
}

function CornerLabel({
	rank,
	suit,
	red,
}: {
	rank: Rank;
	suit: Suit;
	red: boolean;
}) {
	return (
		<div
			className={cn(
				"flex flex-col items-center leading-none select-none",
				red ? "text-red-500" : "text-black",
			)}
		>
			<span className="font-bold font-mono">{rank}</span>
			<span>{suit}</span>
		</div>
	);
}

function CardBack() {
	return (
		<div className="absolute inset-0 rounded-xl overflow-hidden border border-zinc-700 shadow-md shadow-black/30">
			<div className="absolute inset-0 bg-gradient-to-br from-blue-800 via-blue-700 to-blue-900" />
			<div
				className="absolute inset-0 opacity-20"
				style={{
					backgroundImage:
						"repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.4) 4px, rgba(255,255,255,0.4) 5px)",
				}}
			/>
			<div className="absolute inset-0 flex items-center justify-center">
				<div className="h-6 w-6 rotate-45 bg-blue-500/40 border border-blue-300/40 rounded-sm" />
			</div>
		</div>
	);
}

function CardFace({ card, small }: { card: CardData; small?: boolean }) {
	const red = isRed(card.suit);
	return (
		<div className="absolute inset-0 bg-white dark:bg-zinc-50 rounded-xl border border-zinc-200 dark:border-zinc-300 shadow-md shadow-black/20">
			<div className="absolute top-1 left-1.5">
				<CornerLabel rank={card.rank} suit={card.suit} red={red} />
			</div>
			<div
				className={cn(
					"absolute inset-0 flex items-center justify-center",
					red ? "text-red-500" : "text-black",
				)}
			>
				<span
					className={cn(
						"select-none",
						small ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl",
					)}
				>
					{card.suit}
				</span>
			</div>
			<div className="absolute bottom-1 right-1.5 rotate-180">
				<CornerLabel rank={card.rank} suit={card.suit} red={red} />
			</div>
		</div>
	);
}

export function BlackjackCard({
	card,
	animate = true,
	className,
	small = false,
}: BlackjackCardProps) {
	// Jeśli karta nie jest ukryta, znaczy że ma być zwrócona awersem do góry
	const isFaceUp = !card.hidden;
	// Flaga isFlipping dodaje przejście CSS na czas obracania
	const isFlipping = !!card.flipping;

	const sizeClasses = small
		? "w-[52px] h-[74px] sm:w-[60px] sm:h-[84px]"
		: "w-[64px] h-[90px] sm:w-[76px] sm:h-[106px]";

	return (
		<div
			className={cn(
				"relative shrink-0 select-none",
				sizeClasses,
				// Animacja opadania wejścia (wyłączona podczas flipa żeby uniknąć konfliktów)
				animate && !isFlipping && "animate-card-deal",
				className,
			)}
			style={{ perspective: "800px" }}
		>
			<div
				className={cn(
					"absolute inset-0 w-full h-full",
					// Jeśli karta obraca się, dodajemy czyste przejście na własności transform
					isFlipping && "transition-transform duration-[460ms] ease-in-out",
				)}
				style={{
					transformStyle: "preserve-3d",
					// Dynamiczny obrót kontenera karty oparty czysto na wartości ukrycia
					transform: isFaceUp ? "rotateY(180deg)" : "rotateY(0deg)",
				}}
			>
				{/* Rewers (0deg) */}
				<div
					className="absolute inset-0"
					style={{
						WebkitBackfaceVisibility: "hidden",
						backfaceVisibility: "hidden",
					}}
				>
					<CardBack />
				</div>

				{/* Awers (180deg) */}
				<div
					className="absolute inset-0"
					style={{
						WebkitBackfaceVisibility: "hidden",
						backfaceVisibility: "hidden",
						transform: "rotateY(180deg)",
					}}
				>
					<CardFace card={card} small={small} />
				</div>
			</div>
		</div>
	);
}
