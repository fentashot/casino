/* ============================================================================
   Blackjack – Shoe Manager
   Per-user shoe persistence, card drawing, and automatic reshuffling.
   ============================================================================ */

import * as crypto from "crypto";
import type { Card, UserShoe } from "./types";
import { DECK_COUNT, RESHUFFLE_PENETRATION } from "./types";
import { buildShoe, shuffleShoe } from "./cardEngine";
import { db } from "../../../db/postgres";
import { blackjackShoe } from "../../../db/schema";
import { eq } from "drizzle-orm";

/** In-memory shoe store keyed by userId */
const shoeStore = new Map<string, { shoe: UserShoe; lastAccessedAt: number }>();

/** Number of cards to burn after a fresh shuffle (standard casino procedure) */
const BURN_COUNT = 1;
const SHOE_CACHE_TTL_MS = Number(process.env.BLACKJACK_SHOE_CACHE_TTL_MS ?? 30 * 60 * 1000);

function nowMs(): number {
  return Date.now();
}

function cleanupStaleShoes(): void {
  const cutoff = nowMs() - SHOE_CACHE_TTL_MS;
  for (const [userId, entry] of shoeStore.entries()) {
    if (entry.lastAccessedAt < cutoff) {
      shoeStore.delete(userId);
    }
  }
}

function touchShoe(userId: string, shoe: UserShoe): void {
  shoeStore.set(userId, { shoe, lastAccessedAt: nowMs() });
}

function getCachedShoe(userId: string): UserShoe | undefined {
  cleanupStaleShoes();
  const entry = shoeStore.get(userId);
  if (!entry) return undefined;
  touchShoe(userId, entry.shoe);
  return entry.shoe;
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
  if (getCachedShoe(userId)) return;

  const persisted = await db.query.blackjackShoe.findFirst({
    where: eq(blackjackShoe.userId, userId),
  });
  if (!persisted) return;

  const shoe = parsePersistedShoe(persisted.shoe);
  if (!shoe) return;
  touchShoe(userId, shoe);
}

export async function persistShoe(userId: string): Promise<void> {
  const shoe = getCachedShoe(userId);
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
export function getOrBuildShoe(userId: string): UserShoe {
  const existing = getCachedShoe(userId);

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
export function drawFromShoe(userId: string): Card {
  let shoe = getCachedShoe(userId);

  if (!shoe || shoe.index >= shoe.cards.length) {
    shoe = rebuildShoe(userId);
  }

  const card = shoe.cards[shoe.index++];
  touchShoe(userId, shoe);
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
  const shoe = getCachedShoe(userId);
  if (!shoe) return null;

  const cardsRemaining = shoe.totalSize - shoe.index;
  const penetration = Math.round((shoe.index / shoe.totalSize) * 100);

  return { cardsRemaining, penetration };
}

/**
 * Explicitly clear a user's shoe (e.g. on logout or admin reset).
 */
export function clearShoe(userId: string): void {
  shoeStore.delete(userId);
}

/**
 * Get the total number of shoes currently in memory (for monitoring).
 */
export function getShoeCount(): number {
  return shoeStore.size;
}

/* ============================================================================
   Internal helpers
   ============================================================================ */

function rebuildShoe(userId: string): UserShoe {
  const seedHex = crypto.randomBytes(32).toString("hex");
  const raw = buildShoe(DECK_COUNT);
  const shuffled = shuffleShoe(raw, seedHex);

  const shoe: UserShoe = {
    cards: shuffled,
    index: BURN_COUNT, // skip burn card(s)
    totalSize: shuffled.length,
    seedHex,
  };

  touchShoe(userId, shoe);
  return shoe;
}
