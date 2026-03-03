/* ============================================================================
   Roulette Service — orchestrates seed management, spin execution,
   balance updates, and provably-fair verification.
   
   No HTTP/framework concerns. Returns Result<T> for all operations.
   ============================================================================ */

import * as crypto from "crypto";
import { z } from "zod";
import { type Result, ok, err, ErrorCode } from "../lib/errors";
import * as BalanceRepo from "../repositories/balance.repository";
import * as SeedRepo from "../repositories/seed.repository";
import * as SpinRepo from "../repositories/spin.repository";
import { betSchema } from "../zodTypes";
import { calculateWinnings, computeHmac, hashToNumber, redNumbers } from "../lib/casinoHelpers";
import type { SpinResponse } from "../types";

/* ============================================================================
   Types
   ============================================================================ */

export interface SeedHashResult {
  serverSeedHash: string;
}

export interface RotateSeedResult {
  ok: true;
  newSeedHash: string;
}

export interface BalanceResult {
  balance: number;
}

export interface RevealSeedResult {
  seed: string;
}

export interface NonceResult {
  nextNonce: number;
}

export interface SpinInput {
  bets: z.infer<typeof betSchema>[];
  clientSeed: string;
  nonce: number;
  idempotencyKey?: string;
}

/* ============================================================================
   Seed Operations
   ============================================================================ */

export async function getActiveSeedHash(): Promise<Result<SeedHashResult>> {
  const activeSeed = await SeedRepo.findActiveSeedHash();
  if (!activeSeed) {
    return err(ErrorCode.NO_ACTIVE_SEED);
  }
  return ok({ serverSeedHash: activeSeed.hash });
}

export async function rotateSeed(): Promise<Result<RotateSeedResult>> {
  await SeedRepo.deactivateAll();

  const newSeed = crypto.randomBytes(32).toString("hex");
  const newHash = crypto.createHash("sha256").update(newSeed).digest("hex");
  const newId = crypto.randomBytes(16).toString("hex");

  await SeedRepo.create(newId, newSeed, newHash);
  return ok({ ok: true, newSeedHash: newHash });
}

export async function revealSeed(
  seedId: string | undefined,
): Promise<Result<RevealSeedResult>> {
  if (!seedId) {
    return err(ErrorCode.MISSING_SEED_ID);
  }

  const seedRecord = await SeedRepo.findById(seedId);
  if (!seedRecord) {
    return err(ErrorCode.SEED_NOT_FOUND);
  }

  if (seedRecord.active) {
    return err(ErrorCode.SEED_STILL_ACTIVE);
  }

  await SeedRepo.markRevealed(seedId);
  return ok({ seed: seedRecord.seed });
}

export async function listSeeds(): Promise<Result<{ seeds: SeedRepo.SeedSummary[] }>> {
  const seeds = await SeedRepo.findAllSummaries();
  return ok({ seeds });
}

/* ============================================================================
   Balance Operations
   ============================================================================ */

export async function getBalance(userId: string): Promise<Result<BalanceResult>> {
  const { balance } = await BalanceRepo.findOrCreate(userId);
  return ok({ balance });
}

export async function getNonce(userId: string): Promise<Result<NonceResult>> {
  const record = await BalanceRepo.getNonce(userId);
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
  const serverSeedRecord = await SeedRepo.findActiveSeed();
  if (!serverSeedRecord) {
    return err(ErrorCode.NO_ACTIVE_SEED);
  }

  // 3. Calculate total bet
  const totalBet = input.bets.reduce((sum, bet) => sum + bet.amount, 0);

  // 4. Check user balance
  const balanceRecord = await BalanceRepo.findByUserId(userId);
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
  const betInserts: SpinRepo.BetInsert[] = input.bets.map((bet) => ({
    id: crypto.randomBytes(16).toString("hex"),
    spinId,
    type: bet.type,
    numbers: JSON.stringify(bet.numbers),
    amount: bet.amount.toString(),
    color: bet.color,
    choice: bet.choice as string | undefined,
    win: calculateWinnings(bet, { number, color }).toString(),
  }));

  await SpinRepo.createSpinWithBets(
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
  const spins = await SpinRepo.findHistory(userId, limit, offset);
  return ok({ spins });
}

/* ============================================================================
   Internal Helpers
   ============================================================================ */

async function checkIdempotency(
  userId: string,
  key: string,
): Promise<(SpinResponse & { cached: boolean }) | null> {
  const existingSpin = await SpinRepo.findByIdempotencyKey(key);
  if (!existingSpin) return null;

  const currentBalance = await BalanceRepo.getBalanceAmount(userId);
  const serverSeed = await SeedRepo.findById(existingSpin.serverSeedId);

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
