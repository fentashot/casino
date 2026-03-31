/* ============================================================================
   Roulette Service — orchestrates seed management, spin execution,
   balance updates, and provably-fair verification.

   No HTTP/framework concerns. Returns Result<T> for all operations.
   ============================================================================ */

import * as crypto from "crypto";
import { type Result, ok, err, ErrorCode } from "../../lib/errors";
import { db } from "../../db/postgres";
import { casinoSpin, casinoBet, casinoServerSeed, userBalance } from "../../db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { balanceQueries, seedQueries } from "../../db/queries";
import { calculateWinnings, computeHmac, hashToNumber, redNumbers } from "../../lib/casinoHelpers";
import { hasActiveBlackjackGame } from "../blackjack/engine";
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
  return record ?? null;
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

type SpinTxResult =
  | { newBalance: number }
  | { insufficientFunds: true }
  | { invalidNonce: true };

async function createSpinWithBets(
  spin: SpinInsert,
  bets: BetInsert[],
  userId: string,
  totalBet: number,
  totalWin: number,
  nonce: number,
): Promise<SpinTxResult> {
  return db.transaction(async (tx) => {
    // Lock the row — prevents concurrent spins from reading stale balance
    const locked = await tx.execute(
      sql`SELECT balance, last_nonce FROM user_balance
          WHERE user_id = ${userId}
          FOR UPDATE`,
    );
    if (locked.length === 0) return { insufficientFunds: true };

    const row = locked[0] as { balance: string; last_nonce: string };
    const balance = Number(row.balance);
    const lastNonce = Number(row.last_nonce);

    if (balance < totalBet) return { insufficientFunds: true };
    if (nonce !== lastNonce + 1) return { invalidNonce: true };

    const newBalance = balance - totalBet + totalWin;

    await tx.insert(casinoSpin).values(spin);
    for (const bet of bets) await tx.insert(casinoBet).values(bet);
    await tx
      .update(userBalance)
      .set({ balance: newBalance.toString(), lastNonce: nonce })
      .where(eq(userBalance.userId, userId));

    return { newBalance };
  });
}


/* ============================================================================
   Seed Operations
   ============================================================================ */

export async function getActiveSeedHash(): Promise<Result<SeedHashResult>> {
  const activeSeed = await seedQueries.findActiveHash();
  if (!activeSeed) {
    return err(ErrorCode.NO_ACTIVE_SEED, "No active server seed — contact support");
  }
  return ok({ serverSeedHash: activeSeed.hash });
}

export async function rotateSeed(): Promise<Result<RotateSeedResult>> {
  const newSeed = crypto.randomBytes(32).toString("hex");
  const newHash = crypto.createHash("sha256").update(newSeed).digest("hex");
  const newId = crypto.randomBytes(16).toString("hex");

  await db.transaction(async (tx) => {
    await tx
      .update(casinoServerSeed)
      .set({ active: false })
      .where(eq(casinoServerSeed.active, true));

    await tx.insert(casinoServerSeed).values({
      id: newId,
      seed: newSeed,
      hash: newHash,
      active: true,
    });
  });
  return ok({ ok: true, newSeedHash: newHash });
}

export async function revealSeed(
  seedId: string,
): Promise<Result<RevealSeedResult>> {
  const seedRecord = await seedQueries.findById(seedId);
  if (!seedRecord) {
    return err(ErrorCode.SEED_NOT_FOUND, "Seed not found");
  }

  if (seedRecord.active) {
    return err(ErrorCode.SEED_STILL_ACTIVE, "Cannot reveal an active seed — rotate first");
  }

  await seedQueries.markRevealed(seedId);
  return ok({ seed: seedRecord.seed });
}

export async function listSeeds(): Promise<Result<{ seeds: SeedSummary[] }>> {
  const seeds = await seedQueries.findAllSummaries();
  return ok({ seeds });
}

/* ============================================================================
   Balance Operations
   ============================================================================ */

export async function getBalance(userId: string): Promise<Result<BalanceResult>> {
  const { balance } = await balanceQueries.findOrCreateBalance(userId);
  return ok({ balance });
}

export async function getNonce(userId: string): Promise<Result<NonceResult>> {
  const record = await balanceQueries.getLastNonce(userId);
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
  const cached = await checkIdempotency(userId, input.idempotencyKey);
  if (cached) return ok(cached);

  // 2. Block spin while a blackjack game is active
  if (await hasActiveBlackjackGame(userId)) {
    return err(ErrorCode.ACTIVE_GAME_EXISTS, "Finish your blackjack game first");
  }

  // 3. Get active server seed
  const serverSeedRecord = await seedQueries.findActive();
  if (!serverSeedRecord) {
    return err(ErrorCode.NO_ACTIVE_SEED, "No active server seed — contact support");
  }

  // 4. Calculate total bet
  const totalBet = input.bets.reduce((sum, bet) => sum + bet.amount, 0);

  // 5. Generate spin result (pure computation)
  const hmac = computeHmac(serverSeedRecord.seed, input.clientSeed, input.nonce);
  const number = hashToNumber(hmac);
  const color = number === 0 ? "green" : redNumbers.has(number) ? "red" : "black";

  // 6. Calculate winnings (pure computation)
  let totalWin = 0;
  for (const bet of input.bets) {
    totalWin += calculateWinnings(bet, { number, color });
  }

  const spinId = crypto.randomBytes(16).toString("hex");

  // 7. Persist everything in a single transaction
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

  const txResult = await createSpinWithBets(
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
      idempotencyKey: input.idempotencyKey,
    },
    betInserts,
    userId,
    totalBet,
    totalWin,
    input.nonce,
  );

  if ("insufficientFunds" in txResult) {
    return err(ErrorCode.INSUFFICIENT_FUNDS, "Insufficient funds");
  }
  if ("invalidNonce" in txResult) {
    return err(ErrorCode.INVALID_NONCE, "Invalid nonce. Try refreshing the page.");
  }

  // 7. Return result
  return ok({
    result: { number, color: color as "red" | "black" | "green" },
    totalWin,
    totalBet,
    newBalance: txResult.newBalance,
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

  const currentBalance = await balanceQueries.getBalanceAmount(userId);
  const serverSeed = await seedQueries.findById(existingSpin.serverSeedId);

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
