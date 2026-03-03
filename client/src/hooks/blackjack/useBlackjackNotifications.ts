/* ============================================================================
   useBlackjackNotifications — Toast messages, confetti, error display
   Pure UI-feedback concern — no game state, no API calls.
   ============================================================================ */

import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { formatCurrency } from "@/lib/format";
import type { BlackjackGameState } from "@/lib/blackjack";

/* ── Error message maps ──────────────────────────────────────────────────── */

export const DEAL_ERRORS: Record<string, string> = {
  insufficient_funds: "Niewystarczające środki na koncie!",
  active_game_exists: "Aktywna gra już istnieje.",
};

export const INSURANCE_ERRORS: Record<string, string> = {
  no_active_game: "Brak aktywnej gry.",
  insurance_not_available: "Ubezpieczenie niedostępne.",
  insufficient_funds_insurance: "Niewystarczające środki na ubezpieczenie.",
};

export const ACTION_ERRORS: Record<string, string> = {
  no_active_game: "Brak aktywnej gry.",
  not_your_turn: "Nie możesz teraz wykonać akcji.",
  cannot_double_now: "Double możliwy tylko na pierwszych 2 kartach.",
  cannot_split: "Nie możesz podzielić tej ręki.",
  insufficient_funds: "Niewystarczające środki!",
  insurance_pending: "Najpierw odpowiedz na ofertę ubezpieczenia.",
  split_aces_no_actions: "Po podziale asów nie można dobierać kart.",
};

/* ── Hook ────────────────────────────────────────────────────────────────── */

export function useBlackjackNotifications() {
  const { toast } = useToast();

  /** Display an error toast using the given lookup map */
  const showError = useCallback(
    (error: string, errorMap: Record<string, string>) => {
      toast({
        title: "Błąd",
        description: errorMap[error] ?? error,
        variant: "destructive",
      });
    },
    [toast],
  );

  /** Generic unexpected-error toast */
  const showUnexpectedError = useCallback(() => {
    toast({
      title: "Błąd",
      description: "Nieoczekiwany błąd",
      variant: "destructive",
    });
  }, [toast]);

  /** Insurance result toast */
  const showInsuranceResult = useCallback(
    (result: "win" | "loss", decision: "take" | "skip") => {
      if (result === "win") {
        toast({
          title: "🛡️ Ubezpieczenie wygrało!",
          description: "Dealer ma Blackjack. Ubezpieczenie wypłacone 2:1.",
        });
      } else if (decision === "take") {
        toast({
          title: "🛡️ Ubezpieczenie przegrane",
          description: "Dealer nie ma Blackjacka. Gra trwa.",
        });
      }
    },
    [toast],
  );

  /** End-of-round result notification with confetti */
  const showRoundResult = useCallback(
    (game: BlackjackGameState) => {
      const hands = game.playerHands;

      const anyBlackjack = hands.some((h) => h.result === "blackjack");
      const anyWin = hands.some(
        (h) => h.result === "win" || h.result === "blackjack",
      );
      const allLoss = hands.every(
        (h) => h.result === "loss" || h.result === "bust",
      );
      const allPush = hands.every((h) => h.result === "push");

      let totalPayout = 0;
      let totalBet = 0;
      for (const h of hands) {
        totalBet += h.bet;
        if (h.result === "blackjack") totalPayout += Math.floor(h.bet * 2.5);
        else if (h.result === "win") totalPayout += h.bet * 2;
        else if (h.result === "push") totalPayout += h.bet;
      }
      const profit = totalPayout - totalBet;

      if (anyBlackjack) {
        confetti({
          particleCount: 160,
          spread: 80,
          origin: { y: 0.5 },
          colors: ["#FFD700", "#FFA500", "#FFFFFF"],
        });
        toast({
          title: "🃏 Blackjack!",
          description: `Wygrałeś ${formatCurrency(totalPayout)} (zysk: +${formatCurrency(profit)})`,
        });
      } else if (anyWin) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: ["#00FF00", "#FFD700", "#FF6B6B"],
        });
        toast({
          title: "🎉 Wygrana!",
          description:
            profit > 0
              ? `Wygrałeś ${formatCurrency(totalPayout)} (zysk: +${formatCurrency(profit)})`
              : `Zwrot: ${formatCurrency(totalPayout)}`,
        });
      } else if (allPush) {
        toast({
          title: "🤝 Remis",
          description: `Zwrot zakładu: ${formatCurrency(totalPayout)}`,
        });
      } else if (allLoss) {
        toast({
          title: "😔 Przegrana",
          description: `Straciłeś ${formatCurrency(totalBet)}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Koniec rundy",
          description:
            profit >= 0
              ? `Wynik: +${formatCurrency(profit)}`
              : `Wynik: ${formatCurrency(profit)}`,
        });
      }
    },
    [toast],
  );

  return {
    showError,
    showUnexpectedError,
    showInsuranceResult,
    showRoundResult,
  };
}
