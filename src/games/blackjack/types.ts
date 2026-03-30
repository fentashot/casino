import type { BlackjackGameState } from "./engine";

export interface GameStateResult {
  game: BlackjackGameState | null;
}

export interface ShoeInfoResult {
  cardsRemaining: number | null;
  penetration: number | null;
}

export interface HandSnapshot {
  result: string;
  bet: number;
  doubled: boolean;
  splitAces: boolean;
}

export type InsuranceDecision = "take" | "skip";
export type PlayerAction = "hit" | "stand" | "double" | "split";
