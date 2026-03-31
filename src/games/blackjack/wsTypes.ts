/**
 * Shared WebSocket protocol types for blackjack.
 * Imported by both server (wsHandler.ts) and client (blackjackWs.ts via @server/).
 */

export type ClientMessage =
  | { type: "deal"; payload: { bet: number } }
  | { type: "insurance"; payload: { decision: "take" | "skip" } }
  | { type: "action"; payload: { action: "hit" | "stand" | "double" | "split" } }
  | { type: "clear" }
  | { type: "shoe_info" }
  | { type: "ping" };

export type ServerMessage =
  | { type: "state"; payload: { game: object | null; balance: number } }
  | { type: "shoe_info"; payload: { cardsRemaining: number | null; penetration: number | null } }
  | { type: "error"; payload: { code: string; message?: string } }
  | { type: "pong" };
