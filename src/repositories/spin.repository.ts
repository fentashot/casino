/* ============================================================================
   Spin Repository — casino spin & bet DB operations
   ============================================================================ */

import { db } from "../db/postgres";
import { casinoSpin, casinoBet, userBalance } from "../db/schema";
import { eq, desc } from "drizzle-orm";

/* ============================================================================
   Types
   ============================================================================ */

export interface SpinInsert {
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

export interface BetInsert {
  id: string;
  spinId: string;
  type: string;
  numbers: string;
  amount: string;
  color?: string;
  choice?: string;
  win: string;
}

export interface SpinWithBets {
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
  bets: Array<{
    id: string;
    spinId: string;
    type: string;
    numbers: string;
    amount: string;
    color: string | null;
    choice: string | null;
    win: string;
  }>;
}

/* ============================================================================
   Queries
   ============================================================================ */

export async function findByIdempotencyKey(
  key: string,
): Promise<SpinWithBets | null> {
  const record = await db.query.casinoSpin.findFirst({
    where: eq(casinoSpin.idempotencyKey, key),
    with: { bets: true },
  });
  return (record as SpinWithBets | undefined) ?? null;
}

export async function findHistory(
  userId: string,
  limit: number,
  offset: number,
) {
  return db.query.casinoSpin.findMany({
    where: eq(casinoSpin.userId, userId),
    orderBy: desc(casinoSpin.createdAt),
    limit,
    offset,
    with: { bets: true },
  });
}

/* ============================================================================
   Commands
   ============================================================================ */

/**
 * Create a complete spin record with all bets in a single transaction.
 * Also updates user balance and nonce atomically.
 */
export async function createSpinWithBets(
  spin: SpinInsert,
  bets: BetInsert[],
  userId: string,
  newBalance: string,
  nonce: number,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.insert(casinoSpin).values(spin);

    for (const bet of bets) {
      await tx.insert(casinoBet).values(bet);
    }

    await tx
      .update(userBalance)
      .set({ balance: newBalance, lastNonce: nonce })
      .where(eq(userBalance.userId, userId));
  });
}
