/* ============================================================================
   useBlackjack – Orchestrator (WebSocket-based)
   Composes single-responsibility sub-hooks:
     • useBlackjackAnimation     — card reveal queue, display state
     • useBlackjackNotifications — toasts, confetti, error messages
   Communicates via persistent WebSocket instead of HTTP mutations.
   Public API is identical to the previous HTTP-based version.
   ============================================================================ */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, apiRequest } from "@/lib/api";
import { playWinSound } from "@/lib/audio";
import {
	type ClientMessage,
	destroyBlackjackSocket,
	getBlackjackSocket,
	type ServerMessage,
} from "@/lib/blackjackWs";
import { canSplitHand } from "./cardHelpers";
import type {
	BlackjackAction,
	BlackjackGameState,
	InsuranceDecision,
	ShoeInfo,
} from "./types";
import { useBlackjackAnimation } from "./useBlackjackAnimation";
import {
	ACTION_ERRORS,
	DEAL_ERRORS,
	INSURANCE_ERRORS,
	useBlackjackNotifications,
} from "./useBlackjackNotifications";

/* ── Re-exports for consumers ────────────────────────────────────────────── */

export { canSplitHand, handTotal, isSoftHand } from "./cardHelpers";
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
} from "./types";

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

	const { data: balanceData, isLoading: isBalanceLoading } = useQuery<{
		balance: number;
	}>({
		queryKey: ["casino-balance"],
		queryFn: async (): Promise<{ balance: number }> => {
			return apiRequest<{ balance: number }>(
				api.casino.balance.$get(),
				"Failed to fetch balance",
			);
		},
		initialData: { balance: initialBalance },
		staleTime: 5000,
	});

	const balance = balanceData?.balance ?? 0;

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
		[prepareForDeal, runAnimation, notify, queryClient],
	);

	/* ── WebSocket message handler ─────────────────────────────────────────── */

	// Keep a ref to shownCountRef so the WS handler closure doesn't go stale
	const shownCountSnapshot = useRef(0);

	const handleWsMessage = useCallback(
		(msg: ServerMessage) => {
			setIsLoading(false);

			if (msg.type === "pong") return;

			if (msg.type === "error") {
				const code = msg.payload.code;
				// Route errors to appropriate notification handlers based on context
				notify.showError(code, {
					...DEAL_ERRORS,
					...ACTION_ERRORS,
					...INSURANCE_ERRORS,
				});
				return;
			}

			if (msg.type === "shoe_info") {
				queryClient.setQueryData(["blackjack-shoe"], msg.payload);
				return;
			}

			if (msg.type === "state") {
				syncBalance(msg.payload.balance);

				if (msg.payload.game === null) {
					setServerGame(null);
					resetAnimation();
					queryClient.invalidateQueries({ queryKey: ["casino-balance"] });
					return;
				}

				const game = msg.payload.game as BlackjackGameState;
				const prevShown = shownCountSnapshot.current;
				const isNewDeal = !serverGame || serverGame.id !== game.id;
				handleGameResponse(game, isNewDeal ? 0 : prevShown, isNewDeal);
			}
		},
		[
			notify,
			syncBalance,
			resetAnimation,
			handleGameResponse,
			queryClient,
			serverGame,
		],
	);

	/* ── WebSocket lifecycle ───────────────────────────────────────────────── */

	useEffect(() => {
		const socket = getBlackjackSocket();
		const unsub = socket.onMessage(handleWsMessage);
		return unsub;
	}, [handleWsMessage]);

	// Keep shownCountSnapshot in sync
	useEffect(() => {
		shownCountSnapshot.current = shownCountRef.current;
	});

	// Destroy socket when hook unmounts (page leave)
	useEffect(() => {
		return () => {
			destroyBlackjackSocket();
		};
	}, []);

	/* ── Actions ───────────────────────────────────────────────────────────── */

	const send = useCallback((msg: ClientMessage) => {
		setIsLoading(true);
		getBlackjackSocket().send(msg);
	}, []);

	const deal = useCallback(
		(bet: number) => {
			if (isLoading) return;
			resetAnimation();
			setServerGame(null);
			send({ type: "deal", payload: { bet } });
		},
		[isLoading, resetAnimation, send],
	);

	const takeInsurance = useCallback(
		(decision: InsuranceDecision) => {
			if (isLoading || isAnimating) return;
			send({ type: "insurance", payload: { decision } });
		},
		[isLoading, isAnimating, send],
	);

	const performAction = useCallback(
		(action: BlackjackAction) => {
			if (isLoading || isAnimating || !serverGame) return;
			send({ type: "action", payload: { action } });
		},
		[isLoading, isAnimating, serverGame, send],
	);

	const hit = useCallback(() => performAction("hit"), [performAction]);
	const stand = useCallback(() => performAction("stand"), [performAction]);
	const double = useCallback(() => performAction("double"), [performAction]);
	const split = useCallback(() => performAction("split"), [performAction]);

	const newGame = useCallback(() => {
		resetAnimation();
		send({ type: "clear" });
	}, [resetAnimation, send]);

	const restoreGame = useCallback(async () => {
		// Fetch state via HTTP fallback on mount / page restore
		try {
			const data = await apiRequest<{ game: BlackjackGameState | null }>(
				api.blackjack.state.$get(),
				"Failed to restore game",
			);
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
		queryFn: async (): Promise<ShoeInfo> => {
			return apiRequest<ShoeInfo>(
				api.blackjack["shoe-info"].$get(),
				"Failed to fetch shoe info",
			);
		},
		refetchInterval: 30_000,
		staleTime: 30_000,
		refetchOnWindowFocus: false,
	});

	/* ── Derived state ─────────────────────────────────────────────────────── */

	const resolvedShoeInfo: ShoeInfo = shoeInfo ?? {
		cardsRemaining: null,
		penetration: null,
	};

	const phase = serverGame?.phase ?? "betting";
	const activeHand =
		serverGame?.playerHands[serverGame.activeHandIndex] ?? null;
	const isPlaying = phase === "playing" && activeHand !== null && !isAnimating;

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
		shoeInfo: resolvedShoeInfo,
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
