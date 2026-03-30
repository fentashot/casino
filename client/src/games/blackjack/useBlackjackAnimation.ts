/* ============================================================================
   useBlackjackAnimation — Card reveal queue & display state management
   Owns all timer-based animation logic (sequential card reveal, hole-card
   flip, display-state construction). No API calls, no toasts.
   ============================================================================ */

import { useCallback, useRef, useState } from "react";
import { playDealCardSound } from "@/lib/audio";
import { buildDisplayState, countAllCards } from "./cardHelpers";
import type { BlackjackGameState } from "./types";

/* ── Constants ───────────────────────────────────────────────────────────── */

const CARD_INTERVAL_MS = 300;
const FLIP_DURATION_MS = 300;
/** Short gap after hole-card flip before the next card appears */
const POST_FLIP_GAP_MS = 120;

/* ── Reveal sequence builder (pure) ──────────────────────────────────────── */

type AnimStep = { type: "card"; count: number } | { type: "flip" };

function buildRevealSequence(
	server: BlackjackGameState,
	alreadyShown: number,
): AnimStep[] {
	const steps: AnimStep[] = [];
	const total = countAllCards(server);

	const holeCard = server.dealerHand.cards[0];
	const holeCardNeedsFlip =
		alreadyShown >= 4 && holeCard !== undefined && !holeCard.hidden;

	const dealerHitCount = Math.max(0, server.dealerHand.cards.length - 2);
	const newCardCount = total - alreadyShown;
	const playerNewCount = newCardCount - dealerHitCount;

	for (let i = 0; i < playerNewCount; i++) {
		steps.push({ type: "card", count: alreadyShown + 1 + i });
	}
	if (holeCardNeedsFlip) {
		steps.push({ type: "flip" });
	}
	for (let i = 0; i < dealerHitCount; i++) {
		steps.push({ type: "card", count: alreadyShown + playerNewCount + 1 + i });
	}

	return steps;
}

/* ── Hook ────────────────────────────────────────────────────────────────── */

export function useBlackjackAnimation() {
	const [displayGame, setDisplayGame] = useState<BlackjackGameState | null>(
		null,
	);
	const [isAnimating, setIsAnimating] = useState(false);

	const shownCountRef = useRef(0);
	const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
	const flipFinishedRef = useRef(false);

	/* ── Timer helpers ───────────────────────────────────────────────────── */

	const cancelTimers = useCallback(() => {
		for (const t of timersRef.current) clearTimeout(t);
		timersRef.current = [];
	}, []);

	const schedule = useCallback((fn: () => void, delay: number) => {
		const t = setTimeout(fn, delay);
		timersRef.current.push(t);
	}, []);

	/* ── Display state finalizer ─────────────────────────────────────────── */

	const finalizeDisplayState = useCallback(
		(state: BlackjackGameState): BlackjackGameState => {
			if (flipFinishedRef.current && state.dealerHand.cards.length > 0) {
				return {
					...state,
					dealerHand: {
						...state.dealerHand,
						cards: state.dealerHand.cards.map((c, i) =>
							i === 0 ? { ...c, flipping: true } : c,
						),
					},
				};
			}
			return state;
		},
		[],
	);

	/* ── Main animation runner ───────────────────────────────────────────── */

	const runAnimation = useCallback(
		(
			server: BlackjackGameState,
			alreadyShown: number,
			onComplete: () => void,
		) => {
			cancelTimers();
			const steps = buildRevealSequence(server, alreadyShown);

			if (steps.length === 0) {
				shownCountRef.current = countAllCards(server);
				setDisplayGame(finalizeDisplayState(server));
				setIsAnimating(false);
				onComplete();
				return;
			}

			setIsAnimating(true);
			let timeOffset = 0;
			let prevWasFlip = false;

			steps.forEach((step, idx) => {
				const isLast = idx === steps.length - 1;

				if (step.type === "card") {
					timeOffset += prevWasFlip ? POST_FLIP_GAP_MS : CARD_INTERVAL_MS;
					prevWasFlip = false;
					const t = timeOffset;
					const count = step.count;

					schedule(() => {
						shownCountRef.current = count;
						setDisplayGame(
							finalizeDisplayState(buildDisplayState(server, count)),
						);
						playDealCardSound();

						if (isLast) {
							shownCountRef.current = countAllCards(server);
							setDisplayGame(finalizeDisplayState(server));
							setIsAnimating(false);
							onComplete();
						}
					}, t);
				} else {
					// flip step
					timeOffset += CARD_INTERVAL_MS;
					prevWasFlip = true;
					const flipStart = timeOffset;

					schedule(() => {
						flipFinishedRef.current = true;
						playDealCardSound();
						setDisplayGame(
							finalizeDisplayState(
								buildDisplayState(server, shownCountRef.current),
							),
						);
					}, flipStart);

					timeOffset += FLIP_DURATION_MS;
					const flipEnd = timeOffset;

					schedule(() => {
						setDisplayGame(
							finalizeDisplayState(
								buildDisplayState(server, shownCountRef.current),
							),
						);

						if (isLast) {
							shownCountRef.current = countAllCards(server);
							setDisplayGame(finalizeDisplayState(server));
							setIsAnimating(false);
							onComplete();
						}
					}, flipEnd);
				}
			});
		},
		[cancelTimers, schedule, finalizeDisplayState],
	);

	/* ── Imperative reset (for new game / restore) ─────────────────────── */

	const resetAnimation = useCallback(() => {
		cancelTimers();
		setIsAnimating(false);
		setDisplayGame(null);
		shownCountRef.current = 0;
		flipFinishedRef.current = false;
	}, [cancelTimers]);

	/** Restore display state from a server snapshot (no animation) */
	const restoreDisplayState = useCallback(
		(game: BlackjackGameState) => {
			const total = countAllCards(game);
			shownCountRef.current = total;

			const holeCard = game.dealerHand.cards[0];
			if (holeCard && !holeCard.hidden && total >= 4) {
				flipFinishedRef.current = true;
			}

			setDisplayGame(finalizeDisplayState(game));
		},
		[finalizeDisplayState],
	);

	/** Prepare for a new deal animation — clear table, reset refs */
	const prepareForDeal = useCallback(
		(game: BlackjackGameState) => {
			cancelTimers();
			setIsAnimating(false);
			shownCountRef.current = 0;
			flipFinishedRef.current = false;
			setDisplayGame({
				...game,
				dealerHand: { ...game.dealerHand, cards: [] },
				playerHands: game.playerHands.map((h) => ({ ...h, cards: [] })),
			});
		},
		[cancelTimers],
	);

	return {
		displayGame,
		isAnimating,
		shownCountRef,
		cancelTimers,
		runAnimation,
		resetAnimation,
		restoreDisplayState,
		prepareForDeal,
		finalizeDisplayState,
	};
}
