/* ============================================================================
   Blackjack – API Client
   All server communication in one place. Components and hooks import from
   here instead of using raw fetch() calls scattered across the codebase.
   ============================================================================ */

import { api } from "@/lib/api";
import type {
  BlackjackAction,
  BlackjackApiResult,
  BlackjackGameState,
  InsuranceDecision,
  ShoeInfo,
} from "./types";

/* ============================================================================
   Public API
   ============================================================================ */

/** Fetch current game state (may be null if no active game) */
export async function fetchState(): Promise<{
  game: BlackjackGameState | null;
}> {
  const res = await api.blackjack.state.$get();
  if (!res.ok) throw new Error(`GET /state failed: ${res.status}`);
  return res.json() as Promise<{ game: BlackjackGameState | null }>;
}

/** Start a new round with the given bet */
export async function deal(bet: number): Promise<BlackjackApiResult> {
  const res = await api.blackjack.deal.$post({ json: { bet } });
  return res.json() as Promise<BlackjackApiResult>;
}

/** Accept or decline insurance */
export async function submitInsurance(
  decision: InsuranceDecision,
): Promise<BlackjackApiResult> {
  const res = await api.blackjack.insurance.$post({ json: { decision } });
  return res.json() as Promise<BlackjackApiResult>;
}

/** Perform a player action (hit, stand, double, split) */
export async function submitAction(
  action: BlackjackAction,
): Promise<BlackjackApiResult> {
  const res = await api.blackjack.action.$post({ json: { action } });
  return res.json() as Promise<BlackjackApiResult>;
}

/** Clear a finished game so the UI can reset */
export async function clearGame(): Promise<void> {
  await api.blackjack.clear.$post();
}

/** Fetch shoe penetration info */
export async function fetchShoeInfo(): Promise<ShoeInfo> {
  try {
    const res = await api.blackjack["shoe-info"].$get();
    if (!res.ok) throw new Error(`GET /shoe-info failed: ${res.status}`);
    return res.json() as Promise<ShoeInfo>;
  } catch {
    return { cardsRemaining: null, penetration: null };
  }
}
