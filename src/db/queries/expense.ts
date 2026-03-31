/* ============================================================================
   Expense Query Helpers
   Centralized DB operations for expense tracking.
   ============================================================================ */

import { db } from "../postgres";
import { expenseTable } from "../schema";
import { eq, and, sql } from "drizzle-orm";

export interface ExpenseInsert {
  title: string;
  amount: string;
  date: string;
  userId: string;
}

/**
 * Get all expenses for a user.
 */
export async function findByUserId(userId: string) {
  return db.query.expenseTable.findMany({
    where: eq(expenseTable.userId, userId),
  });
}

/**
 * Get the total amount spent by a user.
 */
export async function getTotalByUserId(userId: string): Promise<number> {
  const result = await db
    .select({ sum: sql`SUM(amount)` })
    .from(expenseTable)
    .where(eq(expenseTable.userId, userId));
  return (result[0].sum as number) ?? 0;
}

/**
 * Create a new expense record.
 */
export async function create(data: ExpenseInsert) {
  const result = await db
    .insert(expenseTable)
    .values({
      title: data.title,
      amount: data.amount,
      date: data.date,
      userId: data.userId,
    })
    .returning();
  return result[0] ?? null;
}

/**
 * Delete an expense by ID, only if it belongs to the given user.
 * Returns true if a row was deleted, false otherwise.
 */
export async function deleteByIdAndUser(id: number, userId: string): Promise<boolean> {
  const result = await db
    .delete(expenseTable)
    .where(and(eq(expenseTable.id, id), eq(expenseTable.userId, userId)))
    .returning({ id: expenseTable.id });
  return result.length > 0;
}
