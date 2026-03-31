/* ============================================================================
   Blackjack WebSocket Handler
   Dispatches incoming WS messages to service functions and sends back
   typed responses. Each connection is bound to a single authenticated userId.
   ============================================================================ */

import * as BlackjackService from "./service";
import { balanceQueries } from "../../db/queries";
import { z } from "zod";
import type { ClientMessage, ServerMessage } from "./wsTypes";

export type { ClientMessage, ServerMessage } from "./wsTypes";

/* ============================================================================
   Validation Schema
   ============================================================================ */

const clientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("deal"), payload: z.object({ bet: z.number().int().min(10).max(1_000_000) }) }),
  z.object({ type: z.literal("insurance"), payload: z.object({ decision: z.enum(["take", "skip"]) }) }),
  z.object({ type: z.literal("action"), payload: z.object({ action: z.enum(["hit", "stand", "double", "split"]) }) }),
  z.object({ type: z.literal("clear") }),
  z.object({ type: z.literal("shoe_info") }),
  z.object({ type: z.literal("ping") }),
]) satisfies z.ZodType<ClientMessage>;

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
    const parsed = JSON.parse(raw);
    const validated = clientMessageSchema.safeParse(parsed);
    if (!validated.success) {
      send({ type: "error", payload: { code: "validation_error", message: validated.error.issues[0]?.message } });
      return;
    }
    msg = validated.data;
  } catch {
    send({ type: "error", payload: { code: "invalid_json" } });
    return;
  }

  switch (msg.type) {
    case "ping":
      send({ type: "pong" });
      return;

    case "deal": {
      const result = await BlackjackService.deal(userId, msg.payload.bet);
      await sendGameResult(userId, result, send);
      return;
    }

    case "insurance": {
      const result = await BlackjackService.handleInsurance(userId, msg.payload.decision);
      await sendGameResult(userId, result, send);
      return;
    }

    case "action": {
      const result = await BlackjackService.handleAction(userId, msg.payload.action);
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
