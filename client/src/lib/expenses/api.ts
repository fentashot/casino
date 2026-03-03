/* ============================================================================
   Expenses – API Client & Query Options
   Single source of truth for all /api/expenses/* client-side communication.
   ============================================================================ */

import { api } from "@/lib/api";
import { queryOptions } from "@tanstack/react-query";

/* ============================================================================
   API Functions
   ============================================================================ */

/** Fetch all expenses for the current user */
export async function fetchAllExpenses() {
  const res = await api.expenses.$get();
  if (!res.ok) throw new Error("Failed to get expenses");
  return res.json();
}

/** Fetch the total spent across all expenses */
export async function fetchTotalSpent() {
  const res = await api.expenses.total.$get();
  return res.json();
}

/* ============================================================================
   Query Options (shared between hooks & route loaders)
   ============================================================================ */

export const allExpensesQueryOptions = queryOptions({
  queryKey: ["get-all-expenses"],
  queryFn: fetchAllExpenses,
  staleTime: 1000 * 60 * 5,
});

export const totalSpentQueryOptions = queryOptions({
  queryKey: ["get-total-spent"],
  queryFn: fetchTotalSpent,
  staleTime: 1000 * 60 * 5,
});
