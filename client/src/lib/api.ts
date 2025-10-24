import { type ApiRoutes } from '@server/index'
import { betTypeSchema } from '@server/zodTypes'
import { queryOptions } from '@tanstack/react-query'
import { hc } from 'hono/client'
import z from 'zod'


const client = hc<ApiRoutes>("/")

export const api = client.api

// async function getCurrentUser() {
//   const res = await api.me.$get()
//   if (!res.ok) {
//     throw new Error('Failed to get current user')
//   }
//   const data = await res.json()
//   return data
//}

// export const getCurrentUserQueryOptions = queryOptions({
//   queryKey: ['get-current-user'],
//   queryFn: getCurrentUser,
//   staleTime: Infinity,
// })

export async function getAllExpenses() {
  const res = await api.expenses.$get()
  if (!res.ok) {
    throw new Error('Failed to get expenses')
  }
  const data = await res.json()
  return data
}

export const getAllExpensesQueryOptions = queryOptions({
  queryKey: ['get-all-expenses'],
  queryFn: getAllExpenses,
  staleTime: 1000 * 60 * 5,
})

export async function getTotalSpent() {
  const res = await api.expenses.total.$get();
  const data = await res.json();
  return data;
}

export const getTotalSpentQueryOptions = queryOptions({
  queryKey: ['get-total-spent'],
  queryFn: getTotalSpent,
  staleTime: 1000 * 60 * 5,
});


export async function placeBet(amount: number, color: 'red' | 'black' | undefined, numbers: number[] = [], type: z.infer<typeof betTypeSchema>) {
  const res = await api.casino.spin.$post({
    json: {
      clientSeed: 'client-seed-test',
      nonce: 1,
      bets: [
        {
          type: type,
          amount: amount,
          color: color,
          numbers: numbers,
        },
      ],
    },
  });
  if (!res.ok) {
    throw new Error('Failed to place bet');
  }
  const data = await res.json();
  return data;
}