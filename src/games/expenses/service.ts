/* ============================================================================
   Expense Service — expense business logic
   ============================================================================ */

import { type Result, ok, err, ErrorCode } from "../../lib/errors";
import { expenseQueries } from "../../db/queries";

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
  const expenses = await expenseQueries.findByUserId(userId);
  return ok({ expenses });
}

export async function createExpense(
  userId: string,
  input: CreateExpenseInput,
): Promise<Result<unknown>> {
  const created = await expenseQueries.create({
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

export async function deleteExpense(userId: string, id: number): Promise<Result<{ message: string }>> {
  const deleted = await expenseQueries.deleteByIdAndUser(id, userId);
  if (!deleted) {
    return err(ErrorCode.NOT_FOUND, "Expense not found");
  }
  return ok({ message: "Expense deleted" });
}

export async function getTotal(userId: string): Promise<Result<{ total: number }>> {
  const total = await expenseQueries.getTotalByUserId(userId);
  return ok({ total });
}

