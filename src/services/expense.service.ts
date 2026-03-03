/* ============================================================================
   Expense Service — expense business logic
   ============================================================================ */

import { type Result, ok, err, ErrorCode } from "../lib/errors";
import * as ExpenseRepo from "../repositories/expense.repository";

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
  const expenses = await ExpenseRepo.findByUserId(userId);
  return ok({ expenses });
}

export async function createExpense(
  userId: string,
  input: CreateExpenseInput,
): Promise<Result<unknown>> {
  const created = await ExpenseRepo.create({
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
  await ExpenseRepo.deleteById(id);
  return ok({ message: "Expense deleted" });
}

export async function getTotal(userId: string): Promise<Result<{ total: number }>> {
  const total = await ExpenseRepo.getTotalByUserId(userId);
  return ok({ total });
}
