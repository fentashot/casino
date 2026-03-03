/* ============================================================================
   useCasinoGame — Roulette game orchestrator
   Composes single-responsibility sub-hooks:
     • useSpinNotifications — win/loss toasts & confetti
     • useSpinResult        — deferred result & wheel-animation sync
   This hook is responsible only for wiring them together and exposing
   a flat public API to the page component.
   ============================================================================ */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { fetchBalance, fetchNonce, submitSpin } from "@/lib/roulette";
import { generateClientSeed, generateIdempotencyKey } from "@/lib/roulette";
import type { SpinResponse } from "@server/types";
import type { RouletteSelection } from "@/components/RouletteControls";
import { useSpinNotifications } from "./roulette/useSpinNotifications";
import { useSpinResult } from "./roulette/useSpinResult";

export function useCasinoGame(initialBalance = 0) {
  const queryClient = useQueryClient();
  const notifications = useSpinNotifications();

  /* ── Data queries ──────────────────────────────────────────────────────── */

  const { data: balanceData, isLoading: isBalanceLoading } = useQuery({
    queryKey: ["casino-balance"],
    queryFn: fetchBalance,
    initialData: { balance: initialBalance },
    staleTime: 5000,
  });

  const { data: nonceData, isLoading: isNonceLoading } = useQuery({
    queryKey: ["casino-nonce"],
    queryFn: fetchNonce,
    staleTime: Infinity,
  });

  const balance = balanceData?.balance ?? 0;
  const nextNonce = nonceData?.nextNonce ?? null;
  const isLoading = isBalanceLoading || isNonceLoading;

  /* ── Spin result & animation sync ──────────────────────────────────────── */

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

  /* ── Error handling ────────────────────────────────────────────────────── */

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

  /* ── Place bets ────────────────────────────────────────────────────────── */

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

        const { data, status } = await submitSpin({
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
        });

        if (status < 200 || status >= 300) {
          return handleSpinError(
            "error" in data ? data.error : "Request failed",
            status,
            "expectedNonce" in data ? data.expectedNonce : undefined,
          );
        }

        if ("result" in data) {
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
