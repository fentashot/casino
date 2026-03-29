import type { ApiRoutes } from "@server/index";
import { hc } from "hono/client";

const client = hc<ApiRoutes>("/");

/**
 * Type-safe Hono RPC client instance.
 * Domain-specific API functions live in their own modules:
 *   - @/lib/roulette/api   (balance, nonce, spin, history, seeds)
 *   - @/lib/blackjack/api  (state, deal, insurance, action, clear, shoe-info)
 *   - @/lib/plinko/api     (play)
 *   - @/lib/stats/api      (overview, balance-history, daily, hourly, …)
 *   - @/lib/expenses/api   (list, total)
 */
export const api = client.api;
