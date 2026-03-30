/* ============================================================================
   Plinko Routes — Thin HTTP handlers
   All game logic lives in ./engine.ts.
   All orchestration lives in ./service.ts.
   ============================================================================ */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { User, Vars } from "../../types";
import { mapResultToResponse } from "../../lib/errors";
import * as PlinkoService from "./service";

/* ============================================================================
   Validation Schemas
   ============================================================================ */

const playSchema = z.object({
  bet: z.number().int().min(1).max(1_000_000),
  rows: z.number().int().min(8).max(16),
  difficulty: z.enum(["low", "medium", "high", "expert"]),
});

/* ============================================================================
   Route Handlers
   ============================================================================ */

export const plinkoRouter = new Hono<Vars>().post(
  "/play",
  zValidator("json", playSchema),
  async (c) => {
    const { id: userId } = c.get("user") as User;
    const { bet, rows, difficulty } = c.req.valid("json");
    const result = await PlinkoService.play(userId, bet, rows, difficulty);
    return mapResultToResponse(c, result);
  },
);
