/* ============================================================================
   Blackjack – API Client
   All server communication in one place. Components and hooks import from
   here instead of using raw fetch() calls scattered across the codebase.
   ============================================================================ */

import type {
  BlackjackAction,
  BlackjackApiResult,
  BlackjackGameState,
  InsuranceDecision,
  ShoeInfo,
} from "./types";

const BASE = "/api/blackjack";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

/* ============================================================================
   Helpers
   ============================================================================ */

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: body !== undefined ? JSON_HEADERS : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

/* ============================================================================
   Public API
   ============================================================================ */

/** Fetch current game state (may be null if no active game) */
export async function fetchState(): Promise<{ game: BlackjackGameState | null }> {
  return get<{ game: BlackjackGameState | null }>("/state");
}

/** Start a new round with the given bet */
export async function deal(bet: number): Promise<BlackjackApiResult> {
  return post<BlackjackApiResult>("/deal", { bet });
}

/** Accept or decline insurance */
export async function submitInsurance(
  decision: InsuranceDecision,
): Promise<BlackjackApiResult> {
  return post<BlackjackApiResult>("/insurance", { decision });
}

/** Perform a player action (hit, stand, double, split) */
export async function submitAction(
  action: BlackjackAction,
): Promise<BlackjackApiResult> {
  return post<BlackjackApiResult>("/action", { action });
}

/** Clear a finished game so the UI can reset */
export async function clearGame(): Promise<void> {
  await fetch(`${BASE}/clear`, { method: "POST", credentials: "include" });
}

/** Fetch shoe penetration info */
export async function fetchShoeInfo(): Promise<ShoeInfo> {
  try {
    return await get<ShoeInfo>("/shoe-info");
  } catch {
    return { cardsRemaining: null, penetration: null };
  }
}
