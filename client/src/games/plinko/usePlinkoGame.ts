import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { generateIdempotencyKey } from "@/games/roulette/utils";
import { api, apiRequest } from "@/lib/api";
import type { PlinkoPlayResult } from "@/lib/plinko/api";
import { fetchBalance } from "@/lib/roulette/api";
import type { Difficulty } from "./multipliers";

export interface PlinkoResult {
	multiplier: number;
	win: number;
	bucket: number;
}

export function usePlinkoGame() {
	const queryClient = useQueryClient();

	const { data: balanceData } = useQuery({
		queryKey: ["casino-balance"],
		queryFn: fetchBalance,
		staleTime: 5000,
	});
	const balance = balanceData?.balance ?? 0;

	const [bet, setBet] = useState(100);
	const [rows, setRows] = useState(16);
	const [difficulty, setDifficulty] = useState<Difficulty>("expert");
	const [isPlaying, setIsPlaying] = useState(false);
	const [lastResult, setLastResult] = useState<PlinkoResult | null>(null);
	const [ballPath, setBallPath] = useState<number[] | null>(null);
	const [showResult, setShowResult] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Consumed by the canvas hook to trigger the highlight after animation
	const pendingResultRef = useRef<PlinkoResult | null>(null);
	const pendingBalanceRef = useRef<number | null>(null);
	const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const changeRows = (next: number) => {
		setRows(next);
		setBallPath(null);
		setLastResult(null);
		setShowResult(false);
		setError(null);
	};

	const applyResult = useCallback(() => {
		const result = pendingResultRef.current;
		if (!result) return;

		if (safetyTimeoutRef.current) {
			clearTimeout(safetyTimeoutRef.current);
			safetyTimeoutRef.current = null;
		}

		if (pendingBalanceRef.current !== null) {
			queryClient.setQueryData(["casino-balance"], {
				balance: pendingBalanceRef.current,
			});
			pendingBalanceRef.current = null;
		}

		pendingResultRef.current = null;
		setLastResult(result);
		setShowResult(true);
		setIsPlaying(false);
	}, [queryClient]);

	const onAnimationComplete = useCallback(() => {
		applyResult();
	}, [applyResult]);

	// Cleanup safety timeout on unmount
	useEffect(() => {
		return () => {
			if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
		};
	}, []);

	const play = async () => {
		if (isPlaying) return;
		setIsPlaying(true);
		setLastResult(null);
		setShowResult(false);
		setBallPath(null);
		setError(null);
		pendingResultRef.current = null;

		// Optimistically deduct bet immediately
		queryClient.setQueryData(["casino-balance"], { balance: balance - bet });

		try {
			const result = await apiRequest<PlinkoPlayResult>(
				api.plinko.play.$post({
					json: {
						bet,
						rows,
						difficulty,
						idempotencyKey: generateIdempotencyKey(),
					},
				}),
				"Something went wrong. Please try again.",
			);

			pendingBalanceRef.current = result.balance;

			pendingResultRef.current = {
				multiplier: result.multiplier,
				win: result.win,
				bucket: result.finalBucket,
			};
			setBallPath(result.path);

			// Safety timeout — force-apply result if animation never fires
			if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
			safetyTimeoutRef.current = setTimeout(applyResult, 10_000);
		} catch (e: unknown) {
			// Rollback optimistic balance deduction
			queryClient.setQueryData(["casino-balance"], { balance });
			const message =
				e instanceof Error
					? e.message
					: "Something went wrong. Please try again.";
			setError(message);
			setIsPlaying(false);
		}
	};

	const isAnimating = ballPath !== null && !showResult;
	const canPlay =
		!isPlaying && !isAnimating && bet > 0 && bet <= balance && !error;
	const activeBucketIdx = lastResult?.bucket ?? null;

	return {
		// config
		bet,
		setBet,
		rows,
		changeRows,
		difficulty,
		setDifficulty,
		// state
		balance,
		isPlaying,
		isAnimating,
		canPlay,
		lastResult,
		showResult,
		activeBucketIdx,
		error,
		clearError: () => setError(null),
		// animation bridge
		ballPath,
		onAnimationComplete,
		play,
	};
}
