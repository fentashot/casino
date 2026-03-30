import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { spinRequestSchema } from "../../zodTypes";
import type { User, Vars } from "../../types";
import { requireAdminMiddleware } from "../../auth";
import { mapResultToResponse } from "../../lib/errors";
import * as RouletteService from "./service";

// ====== Validation Schemas ======

const revealSeedSchema = z.object({
  seedId: z.string().min(1, "Seed ID is required"),
});

// ====== Routes — thin handlers, all logic in RouletteService ======
export const rouletteRouter = new Hono<Vars>()

  .get("/seed", async (c) => {
    const result = await RouletteService.getActiveSeedHash();
    return mapResultToResponse(c, result);
  })

  .post("/rotate", requireAdminMiddleware, async (c) => {
    const result = await RouletteService.rotateSeed();
    return mapResultToResponse(c, result);
  })

  .get("/balance", async (c) => {
    const { id } = c.get("user") as User;
    const result = await RouletteService.getBalance(id);
    return mapResultToResponse(c, result);
  })

  .post("/reveal", requireAdminMiddleware, zValidator("json", revealSeedSchema), async (c) => {
    const { seedId } = c.req.valid("json");
    const result = await RouletteService.revealSeed(seedId);
    return mapResultToResponse(c, result);
  })

  .post("/spin", zValidator("json", spinRequestSchema), async (c) => {
    const { id: userId } = c.get("user") as User;
    const body = c.req.valid("json");
    const result = await RouletteService.executeSpin(userId, body);
    return mapResultToResponse(c, result);
  })

  .get("/history", async (c) => {
    const { id: userId } = c.get("user") as User;
    const limit = Number(c.req.query("limit") ?? "10");
    const offset = Number(c.req.query("offset") ?? "0");
    const result = await RouletteService.getSpinHistory(userId, limit, offset);
    return mapResultToResponse(c, result);
  })

  .get("/nonce", async (c) => {
    const { id: userId } = c.get("user") as User;
    const result = await RouletteService.getNonce(userId);
    return mapResultToResponse(c, result);
  })

  .get("/seeds", requireAdminMiddleware, async (c) => {
    const result = await RouletteService.listSeeds();
    return mapResultToResponse(c, result);
  });
