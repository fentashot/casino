// Roulette — client API
// Central helpers for /api/casino/* requests related to roulette.
// Import these from hooks and components instead of using fetch() directly.

import type { SpinResponse } from "@server/types";
import type { RouletteSelection } from "@/components/roulette/RouletteControls";
import { api } from "@/lib/api";
import { apiRequest, readApiData } from "@/lib/api";

// Section: Balance & nonce

// Fetch current user balance
export async function fetchBalance(): Promise<{ balance: number }> {
  return apiRequest<{ balance: number }>(
    api.casino.balance.$get(),
    "Failed to fetch balance",
  );
}

// Fetch next nonce for provably fair
export async function fetchNonce(): Promise<{ nextNonce: number }> {
  return apiRequest<{ nextNonce: number }>(
    api.casino.nonce.$get(),
    "Failed to fetch nonce",
  );
}

// Section: Spin

export interface SpinRequest {
  clientSeed: string;
  nonce: number;
  idempotencyKey: string;
  bets: Array<{
    type: RouletteSelection["type"];
    amount: number;
    color?: RouletteSelection["color"];
    choice?: RouletteSelection["choice"];
    numbers: number[];
  }>;
}

export type SpinApiResult =
  | SpinResponse
  | { error: string; message?: string; details?: Record<string, unknown> };

// Place bets and spin the wheel.
// Returns the raw result; caller handles success or error.
export async function submitSpin(
  request: SpinRequest,
): Promise<{ data: SpinApiResult; status: number }> {
  const res = await api.casino.spin.$post({ json: request });
  const data = (await res.json()) as SpinApiResult;
  return { data, status: res.status };
}

// Section: History

export type Bet = {
  type: string;
  amount: string;
  win: string;
  numbers: string;
  color?: string | null;
  choice?: string | null;
};

export type Spin = {
  id: string;
  number: number;
  color: string;
  totalBet: string;
  totalWin: string;
  createdAt: string;
  bets: Bet[];
};

// Fetch recent spin history
export async function fetchHistory(limit = 10): Promise<{ spins: Spin[] }> {
  return apiRequest<{ spins: Spin[] }>(
    api.casino.history.$get({
      query: { limit: String(limit) },
    }),
    "Failed to fetch history",
  );
}

// Section: Seeds (admin)

interface Seed {
  id: string;
  hash: string;
  active: boolean;
  createdAt: string;
  revealedAt: string | null;
}

// Fetch all seeds (admin)
export async function fetchSeeds(): Promise<{ seeds: Seed[] }> {
  return apiRequest<{ seeds: Seed[] }>(
    api.casino.seeds.$get(),
    "Failed to fetch seeds",
  );
}

// Rotate the active server seed (admin)
export async function rotateSeed(): Promise<{ newSeedHash: string }> {
  return apiRequest<{ newSeedHash: string }>(
    api.casino.rotate.$post(),
    "Failed to rotate seed",
  );
}

// Reveal a past server seed (admin)
export async function revealSeed(
  seedId: string,
): Promise<{ seedId: string; seed: string }> {
  const res = await api.casino.reveal.$post({ json: { seedId } });
  const data = await readApiData<{ seed: string }>(
    res,
    "Failed to reveal seed",
  );
  return { seedId, ...data };
}
