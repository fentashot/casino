/* ============================================================================
   Blackjack Module – Public API
   ============================================================================ */

// Types
export type {
  Suit,
  Rank,
  DisplayRank,
  Card,
  DisplayCard,
  HandResult,
  Hand,
  DisplayHand,
  GamePhase,
  BlackjackGameState,
  DisplayGameState,
  UserShoe,
  BlackjackAction,
  InsuranceDecision,
} from "./types";

export {
  SUITS,
  RANKS,
  DECK_COUNT,
  RESHUFFLE_PENETRATION,
} from "./types";

// Card Engine — pure evaluation functions
export {
  cardValue,
  handTotal,
  isSoftHand,
  isBlackjack,
  canSplit,
  buildDeck,
  buildShoe,
  shuffleShoe,
  revealAllCards,
} from "./cardEngine";

// Game Logic — state transitions
export {
  dealGame,
  resolveInsurance,
  hitHand,
  standHand,
  doubleDown,
  splitHand,
  resolveDealerAndSettle,
  advanceHand,
  shouldTriggerDealer,
  sanitizeGame,
} from "./gameLogic";

// Shoe Manager — per-user shoe persistence
export {
  getOrBuildShoe,
  drawFromShoe,
  getShoeInfo,
  hydrateShoe,
  persistShoe,
  clearShoe,
  getShoeCount,
} from "./shoeManager";

// Game Store — DB-backed game state persistence
export {
  getActiveGame,
  getGameForUser,
  saveGame,
  clearGame,
  markPersisted,
} from "./gameStore";
