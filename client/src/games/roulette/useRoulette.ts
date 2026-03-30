import type { SpinResponse } from "@server/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { RouletteSelection } from "@/components/roulette/RouletteControls";
import {
	api,
	apiRequest,
	getApiErrorMessage,
	getApiErrorNumberDetail,
	isApiErrorResponse,
} from "@/lib/api";
import { useSpinNotifications } from "./useSpinNotifications";
import { useSpinResult } from "./useSpinResult";
import { generateClientSeed, generateIdempotencyKey } from "./utils";

export function useRoulette(initialBalance = 0) {
	const queryClient = useQueryClient();
	const notifications = useSpinNotifications();

	const { data: balanceData, isLoading: isBalanceLoading } = useQuery({
		queryKey: ["casino-balance"],
		queryFn: async () => {
			return apiRequest<{ balance: number }>(
				api.casino.balance.$get(),
				"Failed to fetch balance",
			);
		},
		initialData: { balance: initialBalance },
		staleTime: 5000,
	});

	const { data: nonceData, isLoading: isNonceLoading } = useQuery({
		queryKey: ["casino-nonce"],
		queryFn: async () => {
			return apiRequest<{ nextNonce: number }>(
				api.casino.nonce.$get(),
				"Failed to fetch nonce",
			);
		},
		staleTime: Infinity,
	});

	if (!("balance" in balanceData)) {
		throw new Error("Invalid response from server");
	}

	if (nonceData && !("nextNonce" in nonceData)) {
		throw new Error("Invalid response from server");
	}

	const balance = balanceData?.balance ?? 0;
	const nextNonce = nonceData?.nextNonce ?? null;
	const isLoading = isBalanceLoading || isNonceLoading;

	const handleResultApplied = useCallback(
		(spin: SpinResponse) => {
			if (spin.totalWin > 0) {
				notifications.showWin(spin);
			} else {
				notifications.showLoss(spin);
			}
		},
		[notifications],
	);

	const {
		result,
		spinData,
		showResult,
		isSpinning,
		bufferResult,
		onSpinEnd,
		prepareForSpin,
		abortSpin,
	} = useSpinResult({ onResultApplied: handleResultApplied });

	const handleSpinError = useCallback(
		(error: string, status: number, expectedNonce?: number) => {
			abortSpin();

			if (status === 400 && error === "invalid_nonce" && expectedNonce) {
				queryClient.setQueryData(["casino-nonce"], {
					nextNonce: expectedNonce,
				});
				notifications.showSync();
				return { success: false, error: "nonce_resync" };
			}

			if (status === 402) {
				notifications.showInsufficientFunds();
				return { success: false, error: "insufficient_funds" };
			}

			notifications.showError(error);
			return { success: false, error };
		},
		[abortSpin, queryClient, notifications],
	);

	const placeBets = useCallback(
		async (bets: RouletteSelection[]) => {
			if (nextNonce === null) {
				notifications.showLoading();
				return { success: false, error: "nonce_not_loaded" };
			}

			prepareForSpin();

			try {
				const clientSeed = generateClientSeed();
				const idempotencyKey = generateIdempotencyKey();

				const res = await api.casino.spin.$post({
					json: {
						clientSeed,
						nonce: nextNonce,
						idempotencyKey,
						bets: bets.map((b) => ({
							type: b.type,
							amount: b.amount,
							color: b.color || undefined,
							choice: b.choice,
							numbers: b.numbers || [],
						})),
					},
				});

				const status = res.status;
				const data = await res.json();

				if (!res.ok) {
					const expectedNonce = getApiErrorNumberDetail(data, "expectedNonce");
					return handleSpinError(
						getApiErrorMessage(data),
						status,
						expectedNonce,
					);
				}

				if ("result" in data && !isApiErrorResponse(data)) {
					bufferResult(data as SpinResponse);
					return { success: true, error: null };
				}

				return { success: false, error: "Invalid response" };
			} catch {
				abortSpin();
				notifications.showError("Wystąpił nieoczekiwany błąd");
				return { success: false, error: "unexpected" };
			}
		},
		[
			nextNonce,
			prepareForSpin,
			bufferResult,
			abortSpin,
			handleSpinError,
			notifications,
		],
	);

	return {
		balance,
		nextNonce,
		isLoading,
		result,
		spinData,
		showResult,
		isSpinning,
		placeBets,
		onSpinEnd,
	};
}
