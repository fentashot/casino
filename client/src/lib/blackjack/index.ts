/* ============================================================================
   Blackjack Client Module – Public API
   Single barrel export for all blackjack-related client code.
   ============================================================================ */

// API client — all server communication
export {
	clearGame,
	deal,
	fetchShoeInfo,
	fetchState,
	submitAction,
	submitInsurance,
} from "./api";
// Card helpers — pure functions for hand evaluation & display state
export {
	buildDisplayState,
	buildEmptyDisplayState,
	canSplitHand,
	cardValue,
	countAllCards,
	handTotal,
	isSoftHand,
} from "./cardHelpers";
// Types
export type {
	BlackjackAction,
	BlackjackApiResult,
	BlackjackGameState,
	CardData,
	ErrorResponse,
	GamePhase,
	GameResponse,
	Hand,
	HandResult,
	InsuranceDecision,
	Rank,
	ShoeInfo,
	Suit,
} from "./types";
export { isApiError } from "./types";
