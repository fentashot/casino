/* ============================================================================
   Blackjack – Client Types
   Single source of truth for all blackjack-related types on the frontend.
   Imported by hooks, components, and API layer.
   ============================================================================ */

export type Suit = "♠" | "♥" | "♦" | "♣";

export type Rank =
	| "A"
	| "2"
	| "3"
	| "4"
	| "5"
	| "6"
	| "7"
	| "8"
	| "9"
	| "10"
	| "J"
	| "Q"
	| "K"
	| "?";

export interface CardData {
	suit: Suit;
	rank: Rank;
	hidden?: boolean;
	/** Transient UI flag — true while the hole-card flip animation is playing */
	flipping?: boolean;
}

export type HandResult =
	| "bust"
	| "blackjack"
	| "win"
	| "loss"
	| "push"
	| "playing";

export interface Hand {
	cards: CardData[];
	bet: number;
	result?: HandResult;
	doubled?: boolean;
	splitAces?: boolean;
	insuranceBet?: number;
	insuranceResult?: "win" | "loss" | null;
}

export type GamePhase =
	| "betting"
	| "insurance"
	| "playing"
	| "dealer"
	| "finished";

export interface BlackjackGameState {
	id: string;
	userId: string;
	dealerHand: Hand;
	playerHands: Hand[];
	activeHandIndex: number;
	phase: GamePhase;
	balance: number;
	insuranceOffered: boolean;
	createdAt: string;
	updatedAt: string;
}

export type BlackjackAction = "hit" | "stand" | "double" | "split";
export type InsuranceDecision = "take" | "skip";

/** Shape of the /api/blackjack/shoe-info response */
export interface ShoeInfo {
	cardsRemaining: number | null;
	penetration: number | null;
}

/** Successful game response from any blackjack API endpoint */
export interface GameResponse {
	game: BlackjackGameState;
}

/** Error response from any blackjack API endpoint */
export interface ErrorResponse {
	error: string;
}

/** Union type for API responses that return a game or an error */
export type BlackjackApiResult = GameResponse | ErrorResponse;

/** Type guard to check if an API result is an error */
export function isApiError(
	result: BlackjackApiResult,
): result is ErrorResponse {
	return "error" in result;
}
