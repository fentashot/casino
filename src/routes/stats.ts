/* ============================================================================
   Stats Routes — Thin HTTP handlers
   All aggregation logic lives in src/services/stats.service.ts.
   ============================================================================ */

import { Hono } from "hono";
import type { User, Vars } from "../types";
import { mapResultToResponse } from "../lib/errors";
import * as StatsService from "../services/stats.service";

export const statsRoutes = new Hono<Vars>()

  .get("/overview", async (c) => {
    const { id: userId } = c.get("user") as User;
    const result = await StatsService.getOverview(userId);
    return mapResultToResponse(c, result);
  })

  .get("/balance-history", async (c) => {
    const { id: userId } = c.get("user") as User;
    const rawLimit = Number(c.req.query("limit") ?? "200");
    const limit = Math.min(Math.max(1, rawLimit), 1000);
    const result = await StatsService.getBalanceHistory(userId, limit);
    return mapResultToResponse(c, result);
  })

  .get("/daily", async (c) => {
    const { id: userId } = c.get("user") as User;
    const rawDays = Number(c.req.query("days") ?? "30");
    const days = Math.min(Math.max(1, rawDays), 365);
    const result = await StatsService.getDaily(userId, days);
    return mapResultToResponse(c, result);
  })

  .get("/hourly-heatmap", async (c) => {
    const { id: userId } = c.get("user") as User;
    const result = await StatsService.getHourlyHeatmap(userId);
    return mapResultToResponse(c, result);
  })

  .get("/game-breakdown", async (c) => {
    const { id: userId } = c.get("user") as User;
    const result = await StatsService.getGameBreakdown(userId);
    return mapResultToResponse(c, result);
  })

  .get("/recent", async (c) => {
    const { id: userId } = c.get("user") as User;
    const rawLimit = Number(c.req.query("limit") ?? "20");
    const limit = Math.min(Math.max(1, rawLimit), 100);
    const result = await StatsService.getRecent(userId, limit);
    return mapResultToResponse(c, result);
  });
