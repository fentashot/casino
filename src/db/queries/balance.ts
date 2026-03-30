/* ============================================================================
   Balance Query Helpers
   Centralized DB operations for user balance management.
   All functions are pure data operations with no business logic.
   ============================================================================ */

import { db } from "../postgres";
import { userBalance } from "../schema";
import { eq } from "drizzle-orm";

const DEFAULT_BALANCE = "100000.00";
const DEFAULT_NONCE = 0;

/**
 * Get balance record for a user, or create with default if not exists.
 * @returns { balance: number } - balance in currency units
 */
export async function findOrCreateBalance(
  userId: string,
): Promise<{ balance: number }> {
  const existing = await db.query.userBalance.findFirst({
    where: eq(userBalance.userId, userId),
  });

  if (existing) {
    return { balance: Number(existing.balance) };
  }

  await db.insert(userBalance).values({
    userId,
    balance: DEFAULT_BALANCE,
    lastNonce: DEFAULT_NONCE,
  });

  return { balance: Number(DEFAULT_BALANCE) };
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
