/* ============================================================================
   Balance Repository — all user balance DB operations
   ============================================================================ */

import { db } from "../db/postgres";
import { userBalance } from "../db/schema";
import { eq } from "drizzle-orm";

const DEFAULT_BALANCE = "100000.00";
const DEFAULT_NONCE = 0;

export interface BalanceRecord {
  userId: string;
  balance: string;
  lastNonce: number;
}

/* ============================================================================
   Queries
   ============================================================================ */

export async function findByUserId(
  userId: string,
): Promise<BalanceRecord | null> {
  const record = await db.query.userBalance.findFirst({
    where: eq(userBalance.userId, userId),
  });
  return record ?? null;
}

export async function getBalanceAmount(
  userId: string,
): Promise<{ balance: string } | null> {
  const record = await db.query.userBalance.findFirst({
    where: eq(userBalance.userId, userId),
    columns: { balance: true },
  });
  return record ?? null;
}

export async function getNonce(
  userId: string,
): Promise<{ lastNonce: number } | null> {
  const record = await db.query.userBalance.findFirst({
    where: eq(userBalance.userId, userId),
    columns: { lastNonce: true },
  });
  return record ?? null;
}

/* ============================================================================
   Commands
   ============================================================================ */

export async function createDefault(userId: string): Promise<BalanceRecord> {
  await db.insert(userBalance).values({
    userId,
    balance: DEFAULT_BALANCE,
    lastNonce: DEFAULT_NONCE,
  });
  return { userId, balance: DEFAULT_BALANCE, lastNonce: DEFAULT_NONCE };
}

export async function updateBalance(
  userId: string,
  newBalance: string,
): Promise<void> {
  await db
    .update(userBalance)
    .set({ balance: newBalance })
    .where(eq(userBalance.userId, userId));
}

export async function updateBalanceAndNonce(
  userId: string,
  newBalance: string,
  nonce: number,
): Promise<void> {
  await db
    .update(userBalance)
    .set({ balance: newBalance, lastNonce: nonce })
    .where(eq(userBalance.userId, userId));
}

/**
 * Find balance or create default. Returns numeric balance.
 */
export async function findOrCreate(
  userId: string,
): Promise<{ balance: number }> {
  const existing = await findByUserId(userId);
  if (existing) {
    return { balance: Number(existing.balance) };
  }
  const created = await createDefault(userId);
  return { balance: Number(created.balance) };
}
