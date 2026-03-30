/* ============================================================================
   Blackjack WebSocket Handler
   Dispatches incoming WS messages to service functions and sends back
   typed responses. Each connection is bound to a single authenticated userId.
   ============================================================================ */

import * as BlackjackService from "./service";
import { balanceQueries } from "../../db/queries";

/* ============================================================================
   Protocol Types
   ============================================================================ */

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

/* ============================================================================
   Handler
   ============================================================================ */

export async function handleMessage(
  userId: string,
  raw: string,
  send: (msg: ServerMessage) => void,
): Promise<void> {
  let msg: ClientMessage;
  try {
    msg = JSON.parse(raw) as ClientMessage;
  } catch {
    send({ type: "error", payload: { code: "invalid_json" } });
    return;
  }

  switch (msg.type) {
    case "ping":
      send({ type: "pong" });
      return;

    case "deal": {
      const bet = msg.payload?.bet;
      if (typeof bet !== "number" || !Number.isInteger(bet) || bet < 10 || bet > 1_000_000) {
        send({ type: "error", payload: { code: "validation_error", message: "bet must be integer 10–1000000" } });
        return;
      }
      const result = await BlackjackService.deal(userId, bet);
      await sendGameResult(userId, result, send);
      return;
    }

    case "insurance": {
      const decision = msg.payload?.decision;
      if (decision !== "take" && decision !== "skip") {
        send({ type: "error", payload: { code: "validation_error", message: "decision must be take or skip" } });
        return;
      }
      const result = await BlackjackService.handleInsurance(userId, decision);
      await sendGameResult(userId, result, send);
      return;
    }

    case "action": {
      const action = msg.payload?.action;
      if (!["hit", "stand", "double", "split"].includes(action)) {
        send({ type: "error", payload: { code: "validation_error", message: "invalid action" } });
        return;
      }
      const result = await BlackjackService.handleAction(userId, action as "hit" | "stand" | "double" | "split");
      await sendGameResult(userId, result, send);
      return;
    }

    case "clear": {
      await BlackjackService.clearFinishedGame(userId);
      const balance = await getCurrentBalance(userId);
      send({ type: "state", payload: { game: null, balance } });
      return;
    }

    case "shoe_info": {
      const result = await BlackjackService.getShoeInfoForUser(userId);
      if (result.ok) {
        send({ type: "shoe_info", payload: result.data });
      } else {
        send({ type: "error", payload: { code: result.error.code } });
      }
      return;
    }

    default:
      send({ type: "error", payload: { code: "unknown_message_type" } });
  }
}

/* ============================================================================
   Internal helpers
   ============================================================================ */

async function sendGameResult(
  userId: string,
  result: Awaited<ReturnType<typeof BlackjackService.deal>>,
  send: (msg: ServerMessage) => void,
): Promise<void> {
  if (!result.ok) {
    send({ type: "error", payload: { code: result.error.code, message: result.error.message } });
    return;
  }
  const balance = await getCurrentBalance(userId);
  send({ type: "state", payload: { game: result.data.game, balance } });
}

async function getCurrentBalance(userId: string): Promise<number> {
  const row = await balanceQueries.getBalanceAmount(userId);
  return row ? Number(row.balance) : 0;
}
