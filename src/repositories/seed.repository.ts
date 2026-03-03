/* ============================================================================
   Seed Repository — casino server seed DB operations
   ============================================================================ */

import { db } from "../db/postgres";
import { casinoServerSeed } from "../db/schema";
import { eq, desc } from "drizzle-orm";

export interface SeedRecord {
  id: string;
  seed: string;
  hash: string;
  active: boolean;
  createdAt: Date;
  revealedAt: Date | null;
}

export interface SeedSummary {
  id: string;
  hash: string;
  active: boolean;
  createdAt: Date;
  revealedAt: Date | null;
}

/* ============================================================================
   Queries
   ============================================================================ */

export async function findActiveSeed(): Promise<SeedRecord | null> {
  const record = await db.query.casinoServerSeed.findFirst({
    where: eq(casinoServerSeed.active, true),
  });
  return record ?? null;
}

export async function findActiveSeedHash(): Promise<{ hash: string } | null> {
  const record = await db.query.casinoServerSeed.findFirst({
    where: eq(casinoServerSeed.active, true),
    columns: { hash: true },
  });
  return record ?? null;
}

export async function findById(seedId: string): Promise<SeedRecord | null> {
  const record = await db.query.casinoServerSeed.findFirst({
    where: eq(casinoServerSeed.id, seedId),
  });
  return record ?? null;
}

export async function findAllSummaries(): Promise<SeedSummary[]> {
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

/* ============================================================================
   Commands
   ============================================================================ */

export async function deactivateAll(): Promise<void> {
  await db
    .update(casinoServerSeed)
    .set({ active: false })
    .where(eq(casinoServerSeed.active, true));
}

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

export async function markRevealed(seedId: string): Promise<void> {
  await db
    .update(casinoServerSeed)
    .set({ revealedAt: new Date() })
    .where(eq(casinoServerSeed.id, seedId));
}
