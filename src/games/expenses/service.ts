/* ============================================================================
   Expense Service — expense business logic
   ============================================================================ */

import { type Result, ok, err, ErrorCode } from "../../lib/errors";
import { db } from "../../db/postgres";
import { expenseTable } from "../../db/schema";
import { eq, sql } from "drizzle-orm";

/* ============================================================================
   Types
   ============================================================================ */

export interface CreateExpenseInput {
  title: string;
  amount: number;
  date: string;
}

/* ============================================================================
   Operations
   ============================================================================ */

export async function listExpenses(userId: string): Promise<Result<{ expenses: unknown[] }>> {
  const expenses = await findByUserId(userId);
  return ok({ expenses });
}

export async function createExpense(
  userId: string,
  input: CreateExpenseInput,
): Promise<Result<unknown>> {
  const created = await create({
    title: input.title,
    amount: input.amount.toString(),
    date: input.date,
    userId,
  });

  if (!created?.id) {
    return err(ErrorCode.EXPENSE_CREATE_FAILED, "Failed to create expense");
  }

  return ok(created);
}

export async function deleteExpense(id: number): Promise<Result<{ message: string }>> {
  await deleteById(id);
  return ok({ message: "Expense deleted" });
}

export async function getTotal(userId: string): Promise<Result<{ total: number }>> {
  const total = await getTotalByUserId(userId);
  return ok({ total });
}

/* ============================================================================
   Internal Helpers — Data Fetching (inlined)
   ============================================================================ */

async function findByUserId(userId: string) {
  return db.query.expenseTable.findMany({
    where: eq(expenseTable.userId, userId),
  });
}

async function getTotalByUserId(userId: string): Promise<number> {
  const result = await db
    .select({ sum: sql`SUM(amount)` })
    .from(expenseTable)
    .where(eq(expenseTable.userId, userId));
  return (result[0].sum as number) ?? 0;
}

async function create(data: {
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

async function deleteById(id: number): Promise<void> {
  await db.delete(expenseTable).where(sql`id = ${id}`);
}
