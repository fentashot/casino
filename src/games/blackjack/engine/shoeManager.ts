/* ============================================================================
   Blackjack – Shoe Manager
   Per-user shoe persistence via Redis (primary) + Postgres (backup).
   ============================================================================ */

import * as crypto from "crypto";
import type { Card, UserShoe } from "./types";
import { DECK_COUNT, RESHUFFLE_PENETRATION } from "./types";
import { buildShoe, shuffleShoe } from "./cardEngine";
import { db } from "../../../db/postgres";
import { blackjackShoe } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { getRedis } from "../../../lib/redis";

const BURN_COUNT = 1;
const SHOE_TTL_S = 24 * 60 * 60; // 24h

function shoeKey(userId: string): string {
  return `blackjack:shoe:${userId}`;
}

async function getCachedShoe(userId: string): Promise<UserShoe | null> {
  const raw = await getRedis().get(shoeKey(userId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserShoe;
  } catch {
    return null;
  }
}

async function saveShoe(userId: string, shoe: UserShoe): Promise<void> {
  await getRedis().set(shoeKey(userId), JSON.stringify(shoe), "EX", SHOE_TTL_S);
}

function parsePersistedShoe(raw: unknown): UserShoe | null {
  if (typeof raw !== "object" || raw === null) return null;
  const candidate = raw as {
    cards?: unknown;
    index?: unknown;
    totalSize?: unknown;
    seedHex?: unknown;
  };
  if (!Array.isArray(candidate.cards)) return null;
  if (typeof candidate.index !== "number") return null;
  if (typeof candidate.totalSize !== "number") return null;
  if (typeof candidate.seedHex !== "string") return null;
  return {
    cards: candidate.cards as Card[],
    index: candidate.index,
    totalSize: candidate.totalSize,
    seedHex: candidate.seedHex,
  };
}

export async function hydrateShoe(userId: string): Promise<void> {
  if (await getCachedShoe(userId)) return;

  const persisted = await db.query.blackjackShoe.findFirst({
    where: eq(blackjackShoe.userId, userId),
  });
  if (!persisted) return;

  const shoe = parsePersistedShoe(persisted.shoe);
  if (!shoe) return;
  await saveShoe(userId, shoe);
}

export async function persistShoe(userId: string): Promise<void> {
  const shoe = await getCachedShoe(userId);
  if (!shoe) return;

  await db
    .insert(blackjackShoe)
    .values({ userId, shoe })
    .onConflictDoUpdate({
      target: blackjackShoe.userId,
      set: {
        shoe,
        updatedAt: new Date(),
      },
    });
}

/**
 * Get or create a shoe for the given user.
 * Automatically reshuffles when penetration exceeds the threshold.
 */
export async function getOrBuildShoe(userId: string): Promise<UserShoe> {
  const existing = await getCachedShoe(userId);

  if (existing) {
    const penetration = existing.index / existing.totalSize;
    if (penetration < RESHUFFLE_PENETRATION) {
      return existing;
    }
  }

  return rebuildShoe(userId);
}

/**
 * Draw a single card from the user's shoe.
 * Rebuilds the shoe if exhausted (safety net — shouldn't normally happen).
 */
export async function drawFromShoe(userId: string): Promise<Card> {
  let shoe = await getCachedShoe(userId);

  if (!shoe || shoe.index >= shoe.cards.length) {
    shoe = await rebuildShoe(userId);
  }

  const card = shoe.cards[shoe.index++];
  await saveShoe(userId, shoe);
  return card;
}

/**
 * Get current shoe info for a user (for the penetration bar UI).
 * Returns null if no shoe exists yet.
 */
export async function getShoeInfo(
  userId: string,
): Promise<{ cardsRemaining: number; penetration: number } | null> {
  await hydrateShoe(userId);
  const shoe = await getCachedShoe(userId);
  if (!shoe) return null;

  const cardsRemaining = shoe.totalSize - shoe.index;
  const penetration = Math.round((shoe.index / shoe.totalSize) * 100);

  return { cardsRemaining, penetration };
}

/**
 * Explicitly clear a user's shoe (e.g. on logout or admin reset).
 */
export async function clearShoe(userId: string): Promise<void> {
  await getRedis().del(shoeKey(userId));
}

/* ============================================================================
   Internal helpers
   ============================================================================ */

async function rebuildShoe(userId: string): Promise<UserShoe> {
  const seedHex = crypto.randomBytes(32).toString("hex");
  const raw = buildShoe(DECK_COUNT);
  const shuffled = shuffleShoe(raw, seedHex);

  const shoe: UserShoe = {
    cards: shuffled,
    index: BURN_COUNT,
    totalSize: shuffled.length,
    seedHex,
  };

  await saveShoe(userId, shoe);
  return shoe;
}
