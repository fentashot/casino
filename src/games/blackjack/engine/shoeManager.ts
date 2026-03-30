/* ============================================================================
   Blackjack – Shoe Manager
   Per-user shoe persistence, card drawing, and automatic reshuffling.
   ============================================================================ */

import * as crypto from "crypto";
import type { Card, UserShoe } from "./types";
import { DECK_COUNT, RESHUFFLE_PENETRATION } from "./types";
import { buildShoe, shuffleShoe } from "./cardEngine";

/** In-memory shoe store keyed by userId */
const shoeStore = new Map<string, UserShoe>();

/** Number of cards to burn after a fresh shuffle (standard casino procedure) */
const BURN_COUNT = 1;

/**
 * Get or create a shoe for the given user.
 * Automatically reshuffles when penetration exceeds the threshold.
 */
export function getOrBuildShoe(userId: string): UserShoe {
  const existing = shoeStore.get(userId);

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
  let shoe = shoeStore.get(userId);

  if (!shoe || shoe.index >= shoe.cards.length) {
    shoe = rebuildShoe(userId);
  }

  const card = shoe.cards[shoe.index++];
  return card;
}

/**
 * Get current shoe info for a user (for the penetration bar UI).
 * Returns null if no shoe exists yet.
 */
export function getShoeInfo(
  userId: string,
): { cardsRemaining: number; penetration: number } | null {
  const shoe = shoeStore.get(userId);
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

  shoeStore.set(userId, shoe);
  return shoe;
}
