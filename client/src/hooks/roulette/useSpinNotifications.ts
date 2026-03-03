/* ============================================================================
   useSpinNotifications — Win/loss toasts & confetti
   Single-responsibility hook: only produces UI feedback for spin outcomes.
   ============================================================================ */

import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import type { SpinResponse } from "@server/types";

export function useSpinNotifications() {
  const { toast } = useToast();

  const showWin = useCallback(
    (spin: SpinResponse) => {
      const profit = spin.totalWin - spin.totalBet;

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#FFD700", "#00FF00", "#FF6B6B"],
      });

      toast({
        title: "🎉 Wygrana!",
        description: `Wygrałeś ${spin.totalWin.toLocaleString("pl-PL")} zł${profit > 0 ? ` (zysk: +${profit.toLocaleString("pl-PL")} zł)` : ""
          }`,
      });
    },
    [toast],
  );

  const showLoss = useCallback(
    (spin: SpinResponse) => {
      toast({
        title: "😔 Przegrana",
        description: `Straciłeś ${spin.totalBet.toLocaleString("pl-PL")} zł`,
        variant: "destructive",
      });
    },
    [toast],
  );

  const showError = useCallback(
    (message: string) => {
      toast({
        title: "Błąd",
        description: message || "Nieznany błąd",
        variant: "destructive",
      });
    },
    [toast],
  );

  const showSync = useCallback(() => {
    toast({
      title: "Synchronizacja",
      description: "Nonce zsynchronizowany. Spróbuj ponownie.",
    });
  }, [toast]);

  const showInsufficientFunds = useCallback(() => {
    toast({
      title: "Brak środków",
      description: "Niewystarczające środki na koncie!",
      variant: "destructive",
    });
  }, [toast]);

  const showLoading = useCallback(() => {
    toast({
      title: "Ładowanie...",
      description: "Spróbuj ponownie za chwilę",
      variant: "destructive",
    });
  }, [toast]);

  return {
    showWin,
    showLoss,
    showError,
    showSync,
    showInsufficientFunds,
    showLoading,
  };
}
