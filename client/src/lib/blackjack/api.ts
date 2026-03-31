/* ============================================================================
   Blackjack – API Client
   All server communication in one place. Components and hooks import from
   here instead of using raw fetch() calls scattered across the codebase.
   ============================================================================ */

import { api, apiRequest } from "@/lib/api";
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
	return apiRequest<{ game: BlackjackGameState | null }>(
		api.blackjack.state.$get(),
		"Failed to fetch game state",
	);
}

/** Start a new round with the given bet */
export async function deal(bet: number): Promise<BlackjackApiResult> {
	return apiRequest<BlackjackApiResult>(
		api.blackjack.deal.$post({ json: { bet } }),
		"Failed to deal",
	);
}

/** Accept or decline insurance */
export async function submitInsurance(
	decision: InsuranceDecision,
): Promise<BlackjackApiResult> {
	return apiRequest<BlackjackApiResult>(
		api.blackjack.insurance.$post({ json: { decision } }),
		"Failed to submit insurance",
	);
}

/** Perform a player action (hit, stand, double, split) */
export async function submitAction(
	action: BlackjackAction,
): Promise<BlackjackApiResult> {
	return apiRequest<BlackjackApiResult>(
		api.blackjack.action.$post({ json: { action } }),
		"Failed to perform action",
	);
}

/** Clear a finished game so the UI can reset */
export async function clearGame(): Promise<void> {
	await api.blackjack.clear.$post();
}

/** Fetch shoe penetration info */
export async function fetchShoeInfo(): Promise<ShoeInfo> {
	try {
		return await apiRequest<ShoeInfo>(
			api.blackjack["shoe-info"].$get(),
			"Failed to fetch shoe info",
		);
	} catch {
		return { cardsRemaining: null, penetration: null };
	}
}
