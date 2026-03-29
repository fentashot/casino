/* ============================================================================
   useBlackjack – Orchestrator
   Composes single-responsibility sub-hooks:
     • useBlackjackAnimation     — card reveal queue, display state
     • useBlackjackNotifications — toasts, confetti, error messages
   This hook is responsible only for wiring API calls to animation/notification
   sub-hooks and exposing a flat public API to the page component.
   ============================================================================ */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { playWinSound } from "@/lib/audio";
import {
	submitAction as apiAction,
	clearGame as apiClear,
	deal as apiDeal,
	fetchShoeInfo as apiFetchShoeInfo,
	fetchState as apiFetchState,
	submitInsurance as apiInsurance,
	type BlackjackAction,
	type BlackjackGameState,
	canSplitHand,
	type InsuranceDecision,
	isApiError,
	type ShoeInfo,
} from "@/lib/blackjack";
import { fetchBalance } from "@/lib/roulette/api";
import { useBlackjackAnimation } from "./blackjack/useBlackjackAnimation";
import {
	ACTION_ERRORS,
	DEAL_ERRORS,
	INSURANCE_ERRORS,
	useBlackjackNotifications,
} from "./blackjack/useBlackjackNotifications";

/* ── Re-exports for consumers ────────────────────────────────────────────── */

export type {
	BlackjackAction,
	BlackjackGameState,
	CardData,
	GamePhase,
	Hand,
	HandResult,
	InsuranceDecision,
	Rank,
	Suit,
} from "@/lib/blackjack";

export { canSplitHand, handTotal, isSoftHand } from "@/lib/blackjack";

/* ============================================================================
   Hook
   ============================================================================ */

export function useBlackjack(initialBalance = 0) {
	const queryClient = useQueryClient();

	/* ── Sub-hooks ─────────────────────────────────────────────────────────── */

	const animation = useBlackjackAnimation();
	const {
		prepareForDeal,
		runAnimation,
		resetAnimation,
		restoreDisplayState,
		shownCountRef,
		isAnimating,
		displayGame,
	} = animation;
	const notify = useBlackjackNotifications();

	/* ── Server game state ─────────────────────────────────────────────────── */

	const [serverGame, setServerGame] = useState<BlackjackGameState | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	/* ── Balance query ─────────────────────────────────────────────────────── */

	const { data: balanceData, isLoading: isBalanceLoading } = useQuery({
		queryKey: ["casino-balance"],
		queryFn: fetchBalance,
		initialData: { balance: initialBalance },
		staleTime: 5000,
	});

	const balance = serverGame?.balance ?? balanceData?.balance ?? 0;

	const syncBalance = useCallback(
		(newBalance: number) => {
			queryClient.setQueryData(["casino-balance"], { balance: newBalance });
		},
		[queryClient],
	);

	/* ── Shared response handler ───────────────────────────────────────────── */

	const handleGameResponse = useCallback(
		(game: BlackjackGameState, prevShown: number, clearTable = false) => {
			setServerGame(game);
			syncBalance(game.balance);

			if (clearTable) {
				prepareForDeal(game);
			}

			runAnimation(game, clearTable ? 0 : prevShown, () => {
				if (game.phase === "finished") {
					const anyWin = game.playerHands.some(
						(h) => h.result === "win" || h.result === "blackjack",
					);
					if (anyWin) playWinSound();
					notify.showRoundResult(game);
					queryClient.invalidateQueries({ queryKey: ["casino-history"] });
				}
			});
		},
		[syncBalance, prepareForDeal, runAnimation, notify, queryClient],
	);

	/* ── Actions ───────────────────────────────────────────────────────────── */

	const deal = useCallback(
		async (bet: number) => {
			if (isLoading) return;
			setIsLoading(true);
			resetAnimation();
			setServerGame(null);

			try {
				const data = await apiDeal(bet);
				if (isApiError(data)) {
					notify.showError(data.error, DEAL_ERRORS);
					return;
				}
				handleGameResponse(data.game, 0, true);
			} catch {
				notify.showUnexpectedError();
			} finally {
				setIsLoading(false);
			}
		},
		[isLoading, resetAnimation, handleGameResponse, notify],
	);

	const takeInsurance = useCallback(
		async (decision: InsuranceDecision) => {
			if (isLoading || isAnimating) return;
			setIsLoading(true);

			try {
				const data = await apiInsurance(decision);
				if (isApiError(data)) {
					notify.showError(data.error, INSURANCE_ERRORS);
					return;
				}

				const prevShown = shownCountRef.current;
				handleGameResponse(data.game, prevShown);

				const hand = data.game.playerHands[0];
				if (hand.insuranceResult) {
					notify.showInsuranceResult(hand.insuranceResult, decision);
				}
			} catch {
				notify.showUnexpectedError();
			} finally {
				setIsLoading(false);
			}
		},
		[isLoading, isAnimating, shownCountRef, handleGameResponse, notify],
	);

	const performAction = useCallback(
		async (action: BlackjackAction) => {
			if (isLoading || isAnimating || !serverGame) return;
			setIsLoading(true);

			try {
				const data = await apiAction(action);
				if (isApiError(data)) {
					notify.showError(data.error, ACTION_ERRORS);
					return;
				}
				const prevShown = shownCountRef.current;
				handleGameResponse(data.game, prevShown);
			} catch {
				notify.showUnexpectedError();
			} finally {
				setIsLoading(false);
			}
		},
		[isLoading, isAnimating, shownCountRef, serverGame, handleGameResponse, notify],
	);

	const hit = useCallback(() => performAction("hit"), [performAction]);
	const stand = useCallback(() => performAction("stand"), [performAction]);
	const double = useCallback(() => performAction("double"), [performAction]);
	const split = useCallback(() => performAction("split"), [performAction]);

	const newGame = useCallback(async () => {
		resetAnimation();
		await apiClear();
		setServerGame(null);
		queryClient.invalidateQueries({ queryKey: ["casino-balance"] });
	}, [resetAnimation, queryClient]);

	const restoreGame = useCallback(async () => {
		try {
			const data = await apiFetchState();
			if (data.game) {
				setServerGame(data.game);
				restoreDisplayState(data.game);
				syncBalance(data.game.balance);
			}
		} catch {
			/* not critical */
		}
	}, [restoreDisplayState, syncBalance]);

	/* ── Shoe info query ───────────────────────────────────────────────────── */

	const { data: shoeInfo } = useQuery<ShoeInfo>({
		queryKey: ["blackjack-shoe"],
		queryFn: apiFetchShoeInfo,
		refetchInterval: 30_000,
		staleTime: 30_000,
		refetchOnWindowFocus: false,
	});

	/* ── Derived state ─────────────────────────────────────────────────────── */

	const phase = serverGame?.phase ?? "betting";
	const activeHand =
		serverGame?.playerHands[serverGame.activeHandIndex] ?? null;
	const isPlaying =
		phase === "playing" && activeHand !== null && !isAnimating;

	const canHit = isPlaying && !isLoading;
	const canStand = isPlaying && !isLoading;
	const canDouble =
		isPlaying &&
		!isLoading &&
		activeHand?.cards.length === 2 &&
		balance >= activeHand?.bet &&
		!activeHand?.splitAces;
	const canSplitLocal =
		isPlaying &&
		!isLoading &&
		canSplitHand(activeHand?.cards ?? []) &&
		balance >= activeHand?.bet;

	const insuranceAvailable =
		phase === "insurance" && !isLoading && !isAnimating;
	const maxInsuranceBet = activeHand ? Math.floor(activeHand.bet / 2) : 0;

	return {
		game: displayGame,
		serverGame,
		phase,
		balance,
		isLoading: isLoading || isBalanceLoading,
		isAnimating,
		canHit,
		canStand,
		canDouble,
		canSplit: canSplitLocal,
		insuranceAvailable,
		maxInsuranceBet,
		shoeInfo: shoeInfo ?? { cardsRemaining: null, penetration: null },
		deal,
		hit,
		stand,
		double,
		split,
		takeInsurance,
		newGame,
		restoreGame,
	};
}
