import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Difficulty } from "./multipliers";

export interface PlinkoResult {
	multiplier: number;
	win: number;
	bucket: number;
}

export function usePlinkoGame(initialBalance: number) {
	const queryClient = useQueryClient();

	const [bet, setBet] = useState(100);
	const [rows, setRows] = useState(16);
	const [difficulty, setDifficulty] = useState<Difficulty>("expert");
	const [isPlaying, setIsPlaying] = useState(false);
	const [balance, setBalance] = useState(initialBalance);
	const [lastResult, setLastResult] = useState<PlinkoResult | null>(null);
	const [ballPath, setBallPath] = useState<number[] | null>(null);
	const [showResult, setShowResult] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Consumed by the canvas hook to trigger the highlight after animation
	const pendingResultRef = useRef<PlinkoResult | null>(null);

	const changeRows = (next: number) => {
		setRows(next);
		setBallPath(null);
		setLastResult(null);
		setShowResult(false);
		setError(null);
	};

	const onAnimationComplete = useCallback(() => {
		const result = pendingResultRef.current;
		if (!result) return;
		setLastResult(result);
		setShowResult(true);
		setIsPlaying(false);
	}, []);

	const play = async () => {
		if (isPlaying) return;
		setIsPlaying(true);
		setLastResult(null);
		setShowResult(false);
		setBallPath(null);
		setError(null);
		pendingResultRef.current = null;

		try {
			const res = await api.plinko.play.$post({
				json: { bet, rows, difficulty },
			});

			if (!res.ok) {
				const errorData = await res.json();
				const message =
					"error" in errorData
						? errorData.error
						: "Something went wrong. Please try again.";
				throw new Error(message);
			}

			const result = await res.json();
			setBalance(result.balance);
			queryClient.setQueryData(["casino-balance"], { balance: result.balance });

			pendingResultRef.current = {
				multiplier: result.multiplier,
				win: result.win,
				bucket: result.finalBucket,
			};
			setBallPath(result.path);
		} catch (e: unknown) {
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
