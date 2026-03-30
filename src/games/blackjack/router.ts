/* ============================================================================
   Blackjack Routes — Thin HTTP handlers
   All game logic lives in ./engine/.
   All orchestration lives in ./service.ts.
   ============================================================================ */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { User, Vars } from "../../types";
import { mapResultToResponse } from "../../lib/errors";
import * as BlackjackService from "./service";

/* ============================================================================
   Validation Schemas
   ============================================================================ */

const dealSchema = z.object({
  bet: z.number().int().min(10, "Minimum bet is 10").max(1_000_000),
});

const actionSchema = z.object({
  action: z.enum(["hit", "stand", "double", "split"]),
});

const insuranceSchema = z.object({
  decision: z.enum(["take", "skip"]),
});

/* ============================================================================
   Route Handlers
   ============================================================================ */

export const blackjackRouter = new Hono<Vars>()

  .get("/state", async (c) => {
    const { id: userId } = c.get("user") as User;
    const result = await BlackjackService.getState(userId);
    return mapResultToResponse(c, result);
  })

  .post("/deal", zValidator("json", dealSchema), async (c) => {
    const { id: userId } = c.get("user") as User;
    const { bet } = c.req.valid("json");
    const result = await BlackjackService.deal(userId, bet);
    return mapResultToResponse(c, result);
  })

  .post("/insurance", zValidator("json", insuranceSchema), async (c) => {
    const { id: userId } = c.get("user") as User;
    const { decision } = c.req.valid("json");
    const result = await BlackjackService.handleInsurance(userId, decision);
    return mapResultToResponse(c, result);
  })

  .post("/action", zValidator("json", actionSchema), async (c) => {
    const { id: userId } = c.get("user") as User;
    const { action } = c.req.valid("json");
    const result = await BlackjackService.handleAction(userId, action);
    return mapResultToResponse(c, result);
  })

  .post("/clear", async (c) => {
    const { id: userId } = c.get("user") as User;
    const result = await BlackjackService.clearFinishedGame(userId);
    return mapResultToResponse(c, result);
  })

  .get("/shoe-info", (c) => {
    const { id: userId } = c.get("user") as User;
    const result = BlackjackService.getShoeInfoForUser(userId);
    return mapResultToResponse(c, result);
  });
