/* ============================================================================
   Blackjack Client Module – Public API
   Single barrel export for all blackjack-related client code.
   ============================================================================ */

// Types
export type {
  Suit,
  Rank,
  CardData,
  HandResult,
  Hand,
  GamePhase,
  BlackjackGameState,
  BlackjackAction,
  InsuranceDecision,
  ShoeInfo,
  GameResponse,
  ErrorResponse,
  BlackjackApiResult,
} from "./types";

export { isApiError } from "./types";

// Card helpers — pure functions for hand evaluation & display state
export {
  cardValue,
  handTotal,
  isSoftHand,
  canSplitHand,
  countAllCards,
  buildEmptyDisplayState,
  buildDisplayState,
} from "./cardHelpers";

// API client — all server communication
export {
  fetchState,
  deal,
  submitInsurance,
  submitAction,
  clearGame,
  fetchShoeInfo,
} from "./api";
