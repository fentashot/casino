/* ============================================================================
   Balance Query Helpers
   Centralized DB operations for user balance management.
   All functions are pure data operations with no business logic.
   ============================================================================ */

import { db } from "../postgres";
import { userBalance } from "../schema";
import { eq, sql } from "drizzle-orm";

const DEFAULT_BALANCE = "100000.00";
const DEFAULT_NONCE = 0;

/**
 * Get balance record for a user, or create with default if not exists.
 * @returns { balance: number } - balance in currency units
 */
export async function findOrCreateBalance(
  userId: string,
): Promise<{ balance: number }> {
  await db
    .insert(userBalance)
    .values({ userId, balance: DEFAULT_BALANCE, lastNonce: DEFAULT_NONCE })
    .onConflictDoNothing();

  const row = await db.query.userBalance.findFirst({
    where: eq(userBalance.userId, userId),
  });

  return { balance: Number(row!.balance) };
}

/**
 * Get full balance record for a user, or null if not found.
 */
export async function findByUserId(userId: string) {
  return db.query.userBalance.findFirst({
    where: eq(userBalance.userId, userId),
  });
}

/**
 * Get only the balance amount for a user.
 */
export async function getBalanceAmount(userId: string) {
  const record = await db.query.userBalance.findFirst({
    where: eq(userBalance.userId, userId),
    columns: { balance: true },
  });
  return record ?? null;
}

/**
 * Get the last nonce for a user (for provably-fair spin ordering).
 */
export async function getLastNonce(userId: string) {
  const record = await db.query.userBalance.findFirst({
    where: eq(userBalance.userId, userId),
    columns: { lastNonce: true },
  });
  return record ?? null;
}

/**
 * Update a user's balance to a new amount.
 */
export async function updateBalance(
  userId: string,
  newBalance: number,
): Promise<void> {
  await db
    .update(userBalance)
    .set({ balance: newBalance.toString() })
    .where(eq(userBalance.userId, userId));
}

/**
 * Update both balance and nonce atomically (after a spin).
 */
export async function updateBalanceAndNonce(
  userId: string,
  newBalance: string,
  newNonce: number,
): Promise<void> {
  await db
    .update(userBalance)
    .set({ balance: newBalance, lastNonce: newNonce })
    .where(eq(userBalance.userId, userId));
}

/**
 * Atomically deduct `amount` from the user's balance.
 * Returns new balance on success, or null if insufficient funds.
 * Single UPDATE eliminates the TOCTOU gap between read-check-write.
 */
export async function deductBalanceAtomic(
  userId: string,
  amount: number,
): Promise<{ newBalance: number } | null> {
  const rows = await db.execute(
    sql`UPDATE user_balance
        SET balance = balance - ${amount}
        WHERE user_id = ${userId}
          AND balance >= ${amount}
        RETURNING balance`,
  );
  if (rows.length === 0) return null;
  return { newBalance: Number((rows[0] as any).balance) };
}

/**
 * Atomically apply a signed delta to the user's balance.
 * For positive delta (win/refund): balance += delta.
 * For negative delta (extra bet like double/split): balance -= |delta|, fails if insufficient.
 * Returns new balance, or null if balance would go negative.
 */
export async function applyBalanceDelta(
  userId: string,
  delta: number,
): Promise<{ newBalance: number } | null> {
  const rows = await db.execute(
    sql`UPDATE user_balance
        SET balance = balance + ${delta}
        WHERE user_id = ${userId}
          AND balance + ${delta} >= 0
        RETURNING balance`,
  );
  if (rows.length === 0) return null;
  return { newBalance: Number((rows[0] as any).balance) };
}
