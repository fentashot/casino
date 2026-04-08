import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
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

export interface ActiveBall {
	id: number;
	path: number[];
	result: PlinkoResult;
}

const DROP_COOLDOWN_MS = 0;

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
	const [activeBalls, setActiveBalls] = useState<ActiveBall[]>([]);
	const [lastResult, setLastResult] = useState<PlinkoResult | null>(null);
	const [showResult, setShowResult] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const nextBallId = useRef(0);
	const lastDropTime = useRef(0);
	const isRequesting = useRef(false);

	const changeRows = (next: number) => {
		setRows(next);
		setActiveBalls([]);
		setLastResult(null);
		setShowResult(false);
		setError(null);
	};

	const onBallComplete = useCallback((ballId: number, result: PlinkoResult) => {
		setActiveBalls((prev) => prev.filter((b) => b.id !== ballId));
		setLastResult(result);
		setShowResult(true);
	}, []);

	const play = async () => {
		const now = Date.now();
		if (now - lastDropTime.current < DROP_COOLDOWN_MS) return;
		if (isRequesting.current) return;
		if (bet <= 0 || bet > balance) return;

		lastDropTime.current = now;
		isRequesting.current = true;
		setError(null);

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

			queryClient.setQueryData(["casino-balance"], { balance: result.balance });

			const ballId = nextBallId.current++;
			const newBall: ActiveBall = {
				id: ballId,
				path: result.path,
				result: {
					multiplier: result.multiplier,
					win: result.win,
					bucket: result.finalBucket,
				},
			};

			setActiveBalls((prev) => [...prev, newBall]);
		} catch (e: unknown) {
			const message =
				e instanceof Error
					? e.message
					: "Something went wrong. Please try again.";
			setError(message);
		} finally {
			isRequesting.current = false;
		}
	};

	const hasActiveBalls = activeBalls.length > 0;
	const canPlay = bet > 0 && bet <= balance && !error;

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
		hasActiveBalls,
		canPlay,
		lastResult,
		showResult,
		error,
		clearError: () => setError(null),
		// multi-ball
		activeBalls,
		onBallComplete,
		play,
	};
}
