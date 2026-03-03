/* ============================================================================
   useBlackjack – Main hook for the Blackjack game UI
   ============================================================================ */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { formatCurrency } from "@/lib/format";

import {
  type BlackjackGameState,
  type BlackjackAction,
  type InsuranceDecision,
  type ShoeInfo,
  isApiError,
  canSplitHand,
  countAllCards,
  buildDisplayState,
  fetchState as apiFetchState,
  deal as apiDeal,
  submitInsurance as apiInsurance,
  submitAction as apiAction,
  clearGame as apiClear,
  fetchShoeInfo as apiFetchShoeInfo,
} from "@/lib/blackjack";

export type {
  Suit,
  Rank,
  CardData,
  HandResult,
  Hand,
  GamePhase,
  BlackjackGameState,
  BlackjackAction,
  InsuranceDecision,
} from "@/lib/blackjack";

export { canSplitHand, handTotal, isSoftHand } from "@/lib/blackjack";

/* ============================================================================
   Constants
   ============================================================================ */

const CARD_INTERVAL_MS = 300;
const FLIP_DURATION_MS = 300;
/** Short gap after hole-card flip before the next card appears (ms) */
const POST_FLIP_GAP_MS = 120;

/* ============================================================================
   Error maps
   ============================================================================ */

const DEAL_ERRORS: Record<string, string> = {
  insufficient_funds: "Niewystarczające środki na koncie!",
  active_game_exists: "Aktywna gra już istnieje.",
};

const INSURANCE_ERRORS: Record<string, string> = {
  no_active_game: "Brak aktywnej gry.",
  insurance_not_available: "Ubezpieczenie niedostępne.",
  insufficient_funds_insurance: "Niewystarczające środki na ubezpieczenie.",
};

const ACTION_ERRORS: Record<string, string> = {
  no_active_game: "Brak aktywnej gry.",
  not_your_turn: "Nie możesz teraz wykonać akcji.",
  cannot_double_now: "Double możliwy tylko na pierwszych 2 kartach.",
  cannot_split: "Nie możesz podzielić tej ręki.",
  insufficient_funds: "Niewystarczające środki!",
  insurance_pending: "Najpierw odpowiedz na ofertę ubezpieczenia.",
  split_aces_no_actions: "Po podziale asów nie można dobierać kart.",
};

/* ============================================================================
   Result notification
   ============================================================================ */

type ToastFn = ReturnType<typeof useToast>["toast"];

function showResultNotification(
  game: BlackjackGameState,
  toast: ToastFn,
): void {
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
}

/* ============================================================================
   Reveal Sequence Builder
   ============================================================================ */

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

/* ============================================================================
   Hook
   ============================================================================ */

export function useBlackjack(initialBalance = 0) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [serverGame, setServerGame] = useState<BlackjackGameState | null>(null);
  const [displayGame, setDisplayGame] = useState<BlackjackGameState | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const shownCountRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Przechowujemy informację czy karta została już odwrócona.
  // Gwarantuje to, że po flipie nigdy nie usuniemy flagi `flipping: true` z tej karty.
  // Zapobiega to bugowi w którym zdjęcie flagi nakłada ponownie klasę wejścia i powoduje "ponowny opad".
  const flipFinishedRef = useRef(false);

  const { data: balanceData, isLoading: isBalanceLoading } = useQuery({
    queryKey: ["casino-balance"],
    queryFn: async () => {
      const res = await fetch("/api/casino/balance", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch balance");
      return res.json() as Promise<{ balance: number }>;
    },
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

  const cancelTimers = useCallback(() => {
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, delay: number) => {
    const t = setTimeout(fn, delay);
    timersRef.current.push(t);
  }, []);

  const finalizeDisplayState = useCallback((state: BlackjackGameState) => {
    // Jeżeli animacja obrotu została odpalona dla tej rundy, aplikujemy na stałe
    // flagę, co zabezpiecza DOM przed odłączeniem animacji 3D i resetem CSS'a.
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
  }, []);

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
          // If the previous step was a flip, use a shorter post-flip gap so the
          // next card arrives promptly and avoids the visual pause.
          timeOffset += prevWasFlip ? POST_FLIP_GAP_MS : CARD_INTERVAL_MS;
          prevWasFlip = false;
          const t = timeOffset;
          const count = step.count;

          schedule(() => {
            shownCountRef.current = count;
            setDisplayGame(
              finalizeDisplayState(buildDisplayState(server, count)),
            );

            if (isLast) {
              shownCountRef.current = countAllCards(server);
              setDisplayGame(finalizeDisplayState(server));
              setIsAnimating(false);
              onComplete();
            }
          }, t);
        } else {
          // flip step: keep standard spacing before starting the flip
          timeOffset += CARD_INTERVAL_MS;
          prevWasFlip = true;
          const flipStart = timeOffset;

          schedule(() => {
            // Mark flip occurred this round and render state where hole card
            // is flagged for flipping so the card component performs the 3D turn.
            flipFinishedRef.current = true;
            setDisplayGame(
              finalizeDisplayState(
                buildDisplayState(server, alreadyShown + idx),
              ),
            );
          }, flipStart);

          // Wait for flip to complete, then continue
          timeOffset += FLIP_DURATION_MS;
          const flipEnd = timeOffset;

          schedule(() => {
            setDisplayGame(
              finalizeDisplayState(
                buildDisplayState(server, alreadyShown + idx),
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

  const handleGameResponse = useCallback(
    (game: BlackjackGameState, prevShown: number, clearTable = false) => {
      setServerGame(game);
      syncBalance(game.balance);

      if (clearTable) {
        flipFinishedRef.current = false;
        shownCountRef.current = 0;
        setDisplayGame({
          ...game,
          dealerHand: { ...game.dealerHand, cards: [] },
          playerHands: game.playerHands.map((h) => ({ ...h, cards: [] })),
        });
      }

      runAnimation(game, clearTable ? 0 : prevShown, () => {
        if (game.phase === "finished") {
          showResultNotification(game, toast);
          queryClient.invalidateQueries({ queryKey: ["casino-history"] });
        }
      });
    },
    [syncBalance, runAnimation, toast, queryClient],
  );

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

  const showUnexpectedError = useCallback(() => {
    toast({
      title: "Błąd",
      description: "Nieoczekiwany błąd",
      variant: "destructive",
    });
  }, [toast]);

  const deal = useCallback(
    async (bet: number) => {
      if (isLoading) return;
      setIsLoading(true);
      cancelTimers();
      setIsAnimating(false);
      setDisplayGame(null);
      setServerGame(null);
      shownCountRef.current = 0;
      flipFinishedRef.current = false;

      try {
        const data = await apiDeal(bet);
        if (isApiError(data)) {
          showError(data.error, DEAL_ERRORS);
          return;
        }
        handleGameResponse(data.game, 0, true);
      } catch {
        showUnexpectedError();
      } finally {
        setIsLoading(false);
      }
    },
    [
      isLoading,
      cancelTimers,
      handleGameResponse,
      showError,
      showUnexpectedError,
    ],
  );

  const takeInsurance = useCallback(
    async (decision: InsuranceDecision) => {
      if (isLoading || isAnimating) return;
      setIsLoading(true);

      try {
        const data = await apiInsurance(decision);
        if (isApiError(data)) {
          showError(data.error, INSURANCE_ERRORS);
          return;
        }

        const prevShown = shownCountRef.current;
        handleGameResponse(data.game, prevShown);

        const hand = data.game.playerHands[0];
        if (hand.insuranceResult === "win") {
          toast({
            title: "🛡️ Ubezpieczenie wygrało!",
            description: "Dealer ma Blackjack. Ubezpieczenie wypłacone 2:1.",
          });
        } else if (hand.insuranceResult === "loss" && decision === "take") {
          toast({
            title: "🛡️ Ubezpieczenie przegrane",
            description: "Dealer nie ma Blackjacka. Gra trwa.",
          });
        }
      } catch {
        showUnexpectedError();
      } finally {
        setIsLoading(false);
      }
    },
    [
      isLoading,
      isAnimating,
      handleGameResponse,
      showError,
      showUnexpectedError,
      toast,
    ],
  );

  const performAction = useCallback(
    async (action: BlackjackAction) => {
      if (isLoading || isAnimating || !serverGame) return;
      setIsLoading(true);

      try {
        const data = await apiAction(action);
        if (isApiError(data)) {
          showError(data.error, ACTION_ERRORS);
          return;
        }
        const prevShown = shownCountRef.current;
        handleGameResponse(data.game, prevShown);
      } catch {
        showUnexpectedError();
      } finally {
        setIsLoading(false);
      }
    },
    [
      isLoading,
      isAnimating,
      serverGame,
      handleGameResponse,
      showError,
      showUnexpectedError,
    ],
  );

  const hit = useCallback(() => performAction("hit"), [performAction]);
  const stand = useCallback(() => performAction("stand"), [performAction]);
  const double = useCallback(() => performAction("double"), [performAction]);
  const split = useCallback(() => performAction("split"), [performAction]);

  const newGame = useCallback(async () => {
    cancelTimers();
    setIsAnimating(false);
    await apiClear();
    setServerGame(null);
    setDisplayGame(null);
    shownCountRef.current = 0;
    flipFinishedRef.current = false;
    queryClient.invalidateQueries({ queryKey: ["casino-balance"] });
  }, [cancelTimers, queryClient]);

  const restoreGame = useCallback(async () => {
    try {
      const data = await apiFetchState();
      if (data.game) {
        const total = countAllCards(data.game);
        shownCountRef.current = total;

        const holeCard = data.game.dealerHand.cards[0];
        if (holeCard && !holeCard.hidden && total >= 4) {
          flipFinishedRef.current = true;
        }

        setServerGame(data.game);
        setDisplayGame(finalizeDisplayState(data.game));
        syncBalance(data.game.balance);
      }
    } catch {
      /* not critical */
    }
  }, [syncBalance, finalizeDisplayState]);

  const { data: shoeInfo } = useQuery<ShoeInfo>({
    queryKey: ["blackjack-shoe"],
    queryFn: apiFetchShoeInfo,
    refetchInterval: 30_000,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const phase = serverGame?.phase ?? "betting";
  const activeHand =
    serverGame?.playerHands[serverGame.activeHandIndex] ?? null;
  const isPlaying = phase === "playing" && activeHand !== null && !isAnimating;

  const canHit = isPlaying && !isLoading;
  const canStand = isPlaying && !isLoading;
  const canDouble =
    isPlaying &&
    !isLoading &&
    activeHand.cards.length === 2 &&
    balance >= activeHand.bet &&
    !activeHand.splitAces;
  const canSplitLocal =
    isPlaying &&
    !isLoading &&
    canSplitHand(activeHand?.cards ?? []) &&
    balance >= activeHand.bet;

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
