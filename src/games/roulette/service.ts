/* ============================================================================
   Roulette Service — orchestrates seed management, spin execution,
   balance updates, and provably-fair verification.

   No HTTP/framework concerns. Returns Result<T> for all operations.
   ============================================================================ */

import * as crypto from "crypto";
import { z } from "zod";
import { type Result, ok, err, ErrorCode } from "../../lib/errors";
import { db } from "../../db/postgres";
import { casinoServerSeed, casinoSpin, casinoBet, userBalance } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { betSchema } from "../../zodTypes";
import { calculateWinnings, computeHmac, hashToNumber, redNumbers } from "../../lib/casinoHelpers";
import type { SpinResponse } from "../../types";
import type {
  SeedHashResult,
  RotateSeedResult,
  BalanceResult,
  RevealSeedResult,
  NonceResult,
  SpinInput,
  SeedSummary,
} from "./types";

/* ============================================================================
   Private inline DB functions — Seed
   ============================================================================ */

async function findActiveSeed() {
  const record = await db.query.casinoServerSeed.findFirst({
    where: eq(casinoServerSeed.active, true),
  });
  return record ?? null;
}

async function findActiveSeedHash() {
  const record = await db.query.casinoServerSeed.findFirst({
    where: eq(casinoServerSeed.active, true),
    columns: { hash: true },
  });
  return record ?? null;
}

async function findSeedById(seedId: string) {
  const record = await db.query.casinoServerSeed.findFirst({
    where: eq(casinoServerSeed.id, seedId),
  });
  return record ?? null;
}

async function findAllSeedSummaries(): Promise<SeedSummary[]> {
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

async function deactivateAllSeeds() {
  await db
    .update(casinoServerSeed)
    .set({ active: false })
    .where(eq(casinoServerSeed.active, true));
}

async function createSeed(id: string, seed: string, hash: string) {
  await db.insert(casinoServerSeed).values({ id, seed, hash, active: true });
}

async function markSeedRevealed(seedId: string) {
  await db
    .update(casinoServerSeed)
    .set({ revealedAt: new Date() })
    .where(eq(casinoServerSeed.id, seedId));
}

/* ============================================================================
   Private inline DB functions — Spin
   ============================================================================ */

interface SpinInsert {
  id: string;
  userId: string;
  clientSeed: string;
  nonce: number;
  hmac: string;
  serverSeedId: string;
  number: number;
  color: string;
  totalBet: string;
  totalWin: string;
  idempotencyKey: string | null;
}

interface BetInsert {
  id: string;
  spinId: string;
  type: string;
  numbers: string;
  amount: string;
  color?: string;
  choice?: string;
  win: string;
}

async function findSpinByIdempotencyKey(key: string) {
  const record = await db.query.casinoSpin.findFirst({
    where: eq(casinoSpin.idempotencyKey, key),
    with: { bets: true },
  });
  return (record as any) ?? null;
}

async function findSpinHistory(userId: string, limit: number, offset: number) {
  return db.query.casinoSpin.findMany({
    where: eq(casinoSpin.userId, userId),
    orderBy: desc(casinoSpin.createdAt),
    limit,
    offset,
    with: { bets: true },
  });
}

async function createSpinWithBets(
  spin: SpinInsert,
  bets: BetInsert[],
  userId: string,
  newBalance: string,
  nonce: number,
) {
  await db.transaction(async (tx) => {
    await tx.insert(casinoSpin).values(spin);
    for (const bet of bets) await tx.insert(casinoBet).values(bet);
    await tx
      .update(userBalance)
      .set({ balance: newBalance, lastNonce: nonce })
      .where(eq(userBalance.userId, userId));
  });
}

/* ============================================================================
   Private inline DB functions — Balance
   ============================================================================ */

async function findBalanceByUserId(userId: string) {
  const record = await db.query.userBalance.findFirst({
    where: eq(userBalance.userId, userId),
  });
  return record ?? null;
}

async function getBalanceAmountOnly(userId: string) {
  const record = await db.query.userBalance.findFirst({
    where: eq(userBalance.userId, userId),
    columns: { balance: true },
  });
  return record ?? null;
}

async function getBalanceNonce(userId: string) {
  const record = await db.query.userBalance.findFirst({
    where: eq(userBalance.userId, userId),
    columns: { lastNonce: true },
  });
  return record ?? null;
}

async function createDefaultBalance(userId: string) {
  await db.insert(userBalance).values({ userId, balance: "100000.00", lastNonce: 0 });
  return { userId, balance: "100000.00", lastNonce: 0 };
}

async function findOrCreateBalance(userId: string): Promise<{ balance: number }> {
  const existing = await findBalanceByUserId(userId);
  if (existing) return { balance: Number(existing.balance) };
  await createDefaultBalance(userId);
  return { balance: 100000 };
}

/* ============================================================================
   Seed Operations
   ============================================================================ */

export async function getActiveSeedHash(): Promise<Result<SeedHashResult>> {
  const activeSeed = await findActiveSeedHash();
  if (!activeSeed) {
    return err(ErrorCode.NO_ACTIVE_SEED);
  }
  return ok({ serverSeedHash: activeSeed.hash });
}

export async function rotateSeed(): Promise<Result<RotateSeedResult>> {
  await deactivateAllSeeds();

  const newSeed = crypto.randomBytes(32).toString("hex");
  const newHash = crypto.createHash("sha256").update(newSeed).digest("hex");
  const newId = crypto.randomBytes(16).toString("hex");

  await createSeed(newId, newSeed, newHash);
  return ok({ ok: true, newSeedHash: newHash });
}

export async function revealSeed(
  seedId: string | undefined,
): Promise<Result<RevealSeedResult>> {
  if (!seedId) {
    return err(ErrorCode.MISSING_SEED_ID);
  }

  const seedRecord = await findSeedById(seedId);
  if (!seedRecord) {
    return err(ErrorCode.SEED_NOT_FOUND);
  }

  if (seedRecord.active) {
    return err(ErrorCode.SEED_STILL_ACTIVE);
  }

  await markSeedRevealed(seedId);
  return ok({ seed: seedRecord.seed });
}

export async function listSeeds(): Promise<Result<{ seeds: SeedSummary[] }>> {
  const seeds = await findAllSeedSummaries();
  return ok({ seeds });
}

/* ============================================================================
   Balance Operations
   ============================================================================ */

export async function getBalance(userId: string): Promise<Result<BalanceResult>> {
  const { balance } = await findOrCreateBalance(userId);
  return ok({ balance });
}

export async function getNonce(userId: string): Promise<Result<NonceResult>> {
  const record = await getBalanceNonce(userId);
  return ok({ nextNonce: (record?.lastNonce || 0) + 1 });
}

/* ============================================================================
   Spin — main game action
   ============================================================================ */

export async function executeSpin(
  userId: string,
  input: SpinInput,
): Promise<Result<SpinResponse & { cached?: boolean }>> {
  // 1. Check idempotency — return cached result if spin already executed
  if (input.idempotencyKey) {
    const cached = await checkIdempotency(userId, input.idempotencyKey);
    if (cached) return ok(cached);
  }

  // 2. Get active server seed
  const serverSeedRecord = await findActiveSeed();
  if (!serverSeedRecord) {
    return err(ErrorCode.NO_ACTIVE_SEED);
  }

  // 3. Calculate total bet
  const totalBet = input.bets.reduce((sum, bet) => sum + bet.amount, 0);

  // 4. Check user balance
  const balanceRecord = await findBalanceByUserId(userId);
  if (!balanceRecord || Number(balanceRecord.balance) < totalBet) {
    return err(ErrorCode.INSUFFICIENT_FUNDS);
  }

  // 5. Validate nonce
  const expectedNonce = balanceRecord.lastNonce + 1;
  if (input.nonce !== expectedNonce) {
    return err(ErrorCode.INVALID_NONCE, "invalid_nonce", {
      expectedNonce,
      receivedNonce: input.nonce,
    });
  }

  // 6. Generate spin result (pure computation)
  const hmac = computeHmac(serverSeedRecord.seed, input.clientSeed, input.nonce);
  const number = hashToNumber(hmac);
  const color = number === 0 ? "green" : redNumbers.has(number) ? "red" : "black";

  // 7. Calculate winnings (pure computation)
  let totalWin = 0;
  for (const bet of input.bets) {
    totalWin += calculateWinnings(bet, { number, color });
  }

  const newBalance = Number(balanceRecord.balance) - totalBet + totalWin;
  const spinId = crypto.randomBytes(16).toString("hex");

  // 8. Persist everything in a single transaction
  const betInserts: BetInsert[] = input.bets.map((bet) => ({
    id: crypto.randomBytes(16).toString("hex"),
    spinId,
    type: bet.type,
    numbers: JSON.stringify(bet.numbers),
    amount: bet.amount.toString(),
    color: bet.color,
    choice: bet.choice as string | undefined,
    win: calculateWinnings(bet, { number, color }).toString(),
  }));

  await createSpinWithBets(
    {
      id: spinId,
      userId,
      clientSeed: input.clientSeed,
      nonce: input.nonce,
      hmac,
      serverSeedId: serverSeedRecord.id,
      number,
      color,
      totalBet: totalBet.toString(),
      totalWin: totalWin.toString(),
      idempotencyKey: input.idempotencyKey || null,
    },
    betInserts,
    userId,
    newBalance.toString(),
    input.nonce,
  );

  // 9. Return result
  return ok({
    result: { number, color: color as "red" | "black" | "green" },
    totalWin,
    totalBet,
    newBalance,
    provablyFair: {
      clientSeed: input.clientSeed,
      serverSeedHash: serverSeedRecord.hash,
      nonce: input.nonce,
      hmac,
    },
  });
}

export async function getSpinHistory(
  userId: string,
  limit: number,
  offset: number,
): Promise<Result<{ spins: unknown[] }>> {
  const spins = await findSpinHistory(userId, limit, offset);
  return ok({ spins });
}

/* ============================================================================
   Internal Helpers
   ============================================================================ */

async function checkIdempotency(
  userId: string,
  key: string,
): Promise<(SpinResponse & { cached: boolean }) | null> {
  const existingSpin = await findSpinByIdempotencyKey(key);
  if (!existingSpin) return null;

  const currentBalance = await getBalanceAmountOnly(userId);
  const serverSeed = await findSeedById(existingSpin.serverSeedId);

  return {
    result: {
      number: existingSpin.number,
      color: existingSpin.color as "red" | "black" | "green",
    },
    totalWin: Number(existingSpin.totalWin),
    totalBet: Number(existingSpin.totalBet),
    newBalance: Number(currentBalance?.balance || 0),
    provablyFair: {
      clientSeed: existingSpin.clientSeed,
      serverSeedHash: serverSeed?.hash || "",
      nonce: existingSpin.nonce,
      hmac: existingSpin.hmac,
    },
    cached: true,
  };
}
