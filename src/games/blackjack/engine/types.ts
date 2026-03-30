/* ============================================================================
   Blackjack – Shared Types
   Used by both server engine and client UI.
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
  | "K";

/** Rank including the placeholder "?" used by the client for hidden cards */
export type DisplayRank = Rank | "?";

export interface Card {
  suit: Suit;
  rank: Rank;
  hidden?: boolean;
}

/** Client-side card that may have rank "?" when hidden */
export interface DisplayCard {
  suit: Suit;
  rank: DisplayRank;
  hidden?: boolean;
}

export type HandResult =
  | "bust"
  | "blackjack"
  | "win"
  | "loss"
  | "push"
  | "playing";

export interface Hand {
  cards: Card[];
  bet: number;
  result?: HandResult;
  doubled?: boolean;
  /** True when this was a split-aces hand — receives only one card */
  splitAces?: boolean;
  /** Insurance side-bet amount (only on first hand, only when dealer shows Ace) */
  insuranceBet?: number;
  /** Whether insurance was already resolved */
  insuranceResult?: "win" | "loss" | null;
}

/** Client-side hand using DisplayCard */
export interface DisplayHand {
  cards: DisplayCard[];
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
  /** Whether insurance has been offered this round */
  insuranceOffered: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Client-side game state with potentially masked dealer cards */
export interface DisplayGameState {
  id: string;
  userId: string;
  dealerHand: DisplayHand;
  playerHands: DisplayHand[];
  activeHandIndex: number;
  phase: GamePhase;
  balance: number;
  insuranceOffered: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Persisted shoe shared across rounds for the same user session */
export interface UserShoe {
  cards: Card[];
  index: number;
  /** Total original size (for 75% reshuffle check) */
  totalSize: number;
  /** Server seed used to shuffle this shoe */
  seedHex: string;
}

export type BlackjackAction = "hit" | "stand" | "double" | "split";
export type InsuranceDecision = "take" | "skip";

/* ============================================================================
   Constants
   ============================================================================ */

export const SUITS: readonly Suit[] = ["♠", "♥", "♦", "♣"];

export const RANKS: readonly Rank[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

/** Standard casino shoe: 6 decks = 312 cards */
export const DECK_COUNT = 6;

/** Reshuffle when this percentage of the shoe has been dealt */
export const RESHUFFLE_PENETRATION = 0.75;
