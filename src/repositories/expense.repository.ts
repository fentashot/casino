/* ============================================================================
   Expense Repository — expense CRUD operations
   ============================================================================ */

import { db } from "../db/postgres";
import { expenseTable } from "../db/schema";
import { eq, sql } from "drizzle-orm";

/* ============================================================================
   Queries
   ============================================================================ */

export async function findByUserId(userId: string) {
  return db.query.expenseTable.findMany({
    where: eq(expenseTable.userId, userId),
  });
}

export async function getTotalByUserId(userId: string): Promise<number> {
  const result = await db
    .select({ sum: sql`SUM(amount)` })
    .from(expenseTable)
    .where(eq(expenseTable.userId, userId));
  return (result[0].sum as number) ?? 0;
}

/* ============================================================================
   Commands
   ============================================================================ */

export async function create(data: {
  title: string;
  amount: string;
  date: string;
  userId: string;
}) {
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

export async function deleteById(id: number): Promise<void> {
  await db.delete(expenseTable).where(sql`id = ${id}`);
}
