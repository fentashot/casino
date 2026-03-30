/* ============================================================================
   Seed Query Helpers (Roulette Provably-Fair)
   Centralized DB operations for server seed management.
   ============================================================================ */

import { db } from "../postgres";
import { casinoServerSeed } from "../schema";
import { eq } from "drizzle-orm";

/**
 * Get the active server seed, or null if none exists.
 */
export async function findActive() {
  return db.query.casinoServerSeed.findFirst({
    where: eq(casinoServerSeed.active, true),
  });
}

/**
 * Get only the hash of the active seed (for public display).
 */
export async function findActiveHash() {
  const record = await db.query.casinoServerSeed.findFirst({
    where: eq(casinoServerSeed.active, true),
    columns: { hash: true },
  });
  return record ?? null;
}

/**
 * Get a seed by ID, or null if not found.
 */
export async function findById(seedId: string) {
  return db.query.casinoServerSeed.findFirst({
    where: eq(casinoServerSeed.id, seedId),
  });
}

/**
 * Deactivate all seeds (when rotating to a new one).
 */
export async function deactivateAll(): Promise<void> {
  await db
    .update(casinoServerSeed)
    .set({ active: false })
    .where(eq(casinoServerSeed.active, true));
}

/**
 * Create a new seed with the given values.
 */
export async function create(
  id: string,
  seed: string,
  hash: string,
): Promise<void> {
  await db.insert(casinoServerSeed).values({
    id,
    seed,
    hash,
    active: true,
  });
}

/**
 * Mark a seed as revealed (after rotation).
 */
export async function markRevealed(seedId: string): Promise<void> {
  await db
    .update(casinoServerSeed)
    .set({ revealedAt: new Date() })
    .where(eq(casinoServerSeed.id, seedId));
}

/**
 * Get all seeds as summaries (for admin seed list).
 */
export async function findAllSummaries() {
  const { desc } = await import("drizzle-orm");
  return db.query.casinoServerSeed.findMany({
    orderBy: desc(casinoServerSeed.createdAt),
    columns: {
      id: true,
      hash: true,
      active: true,
      createdAt: true,
      revealedAt: true,
    },
  });
}
