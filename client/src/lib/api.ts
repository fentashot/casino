import { type ApiRoutes } from '@server/index'
import { hc } from 'hono/client'

const client = hc<ApiRoutes>("/")

/**
 * Type-safe Hono RPC client instance.
 * Domain-specific API functions live in their own modules:
 *   - @/lib/roulette/api   (balance, nonce, spin, history, seeds)
 *   - @/lib/blackjack/api  (deal, action, insurance, state, shoe)
 *   - @/lib/stats/api      (overview, balance-history, daily, hourly, …)
 *   - @/lib/expenses/api   (list, total)
 */
export const api = client.api
