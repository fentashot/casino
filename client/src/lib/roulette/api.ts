// Roulette — client API
// Central helpers for /api/casino/* requests related to roulette.
// Import these from hooks and components instead of using fetch() directly.

import type { SpinResponse } from "@server/types";
import type { RouletteSelection } from "@/components/RouletteControls";
import { api } from "@/lib/api";

// Section: Balance & nonce

// Fetch current user balance
export async function fetchBalance(): Promise<{ balance: number }> {
	const res = await api.casino.balance.$get();
	if (!res.ok) throw new Error("Failed to fetch balance");
	return res.json() as Promise<{ balance: number }>;
}

// Fetch next nonce for provably fair
export async function fetchNonce(): Promise<{ nextNonce: number }> {
	const res = await api.casino.nonce.$get();
	if (!res.ok) throw new Error("Failed to fetch nonce");
	return res.json() as Promise<{ nextNonce: number }>;
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
	| { error: string; expectedNonce?: number };

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
	const res = await api.casino.history.$get({
		query: { limit: String(limit) },
	});
	if (!res.ok) throw new Error("Failed to fetch history");
	return res.json() as Promise<{ spins: Spin[] }>;
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
	const res = await api.casino.seeds.$get();
	if (!res.ok) throw new Error("Failed to fetch seeds");
	return res.json() as Promise<{ seeds: Seed[] }>;
}

// Rotate the active server seed (admin)
export async function rotateSeed(): Promise<{ newSeedHash: string }> {
	const res = await api.casino.rotate.$post();
	if (!res.ok) {
		const error = await res.json();
		throw new Error(
			(error as { error?: string }).error || "Failed to rotate seed",
		);
	}
	return res.json() as Promise<{ newSeedHash: string }>;
}

// Reveal a past server seed (admin)
export async function revealSeed(
	seedId: string,
): Promise<{ seedId: string; seed: string }> {
	const res = await api.casino.reveal.$post({ json: { seedId } });
	if (!res.ok) {
		const error = await res.json();
		throw new Error(
			(error as { error?: string }).error || "Failed to reveal seed",
		);
	}
	const data = (await res.json()) as { seed: string };
	return { seedId, ...data };
}
