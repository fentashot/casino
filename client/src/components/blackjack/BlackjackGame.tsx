import { useEffect } from "react";
import { useBlackjack } from "@/hooks/useBlackjack";
import { GameTable } from "./GameTable";
import { GameControls } from "./GameControls";
import { ShoePenetrationBar } from "./ShoePenetrationBar";
import { RulesReference } from "./RulesReference";
import type { ResultVariant } from "./ResultBanner";
import type { BlackjackGameState } from "@/lib/blackjack";

interface BlackjackGameProps {
  initialBalance?: number;
}

export function BlackjackGame({ initialBalance = 0 }: BlackjackGameProps) {
  const {
    game,
    serverGame,
    phase,
    balance,
    isLoading,
    isAnimating,
    canHit,
    canStand,
    canDouble,
    canSplit,
    maxInsuranceBet,
    shoeInfo,
    deal,
    hit,
    stand,
    double,
    split,
    takeInsurance,
    newGame,
    restoreGame,
  } = useBlackjack(initialBalance);

  useEffect(() => {
    restoreGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Use the animated display state directly for rendering cards.
  // We never fall back to serverGame here — that would cause a flash of
  // all cards before the reveal queue starts. Instead, null means "empty
  // table" which is the correct initial state before any cards are dealt.
  const renderGame = game;

  // Only show "finished" state (result banner, payout summary) once the
  // reveal animation has fully completed — otherwise cards and results
  // appear simultaneously which ruins the flow.
  const isFinished = phase === "finished" && !isAnimating;
  const isPlaying = phase === "playing";

  const resultBanner = deriveResultBanner(serverGame, isFinished);

  return (
    <div className="flex flex-col gap-4">
      {shoeInfo.penetration !== null && (
        <ShoePenetrationBar penetration={shoeInfo.penetration} />
      )}

      <GameTable
        renderGame={renderGame}
        serverGame={serverGame}
        phase={phase}
        isPlaying={isPlaying}
        isFinished={isFinished}
        isAnimating={isAnimating}
        resultBanner={resultBanner}
      />

      <GameControls
        phase={phase}
        serverGame={serverGame}
        balance={balance}
        isLoading={isLoading}
        isAnimating={isAnimating}
        canHit={canHit}
        canStand={canStand}
        canDouble={canDouble}
        canSplit={canSplit}
        maxInsuranceBet={maxInsuranceBet}
        onDeal={deal}
        onHit={hit}
        onStand={stand}
        onDouble={double}
        onSplit={split}
        onInsurance={takeInsurance}
        onNewGame={newGame}
      />

      <RulesReference />
    </div>
  );
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

function deriveResultBanner(
  serverGame: BlackjackGameState | null,
  isFinished: boolean,
): { label: string; variant: ResultVariant } | null {
  if (!serverGame || !isFinished) return null;

  const hands = serverGame.playerHands;
  const anyBJ = hands.some((h) => h.result === "blackjack");
  const anyWin = hands.some(
    (h) => h.result === "win" || h.result === "blackjack",
  );
  const allLoss = hands.every(
    (h) => h.result === "loss" || h.result === "bust",
  );
  const allPush = hands.every((h) => h.result === "push");

  if (anyBJ) return { label: "Blackjack! 🃏", variant: "blackjack" };
  if (anyWin) return { label: "Wygrana! 🎉", variant: "win" };
  if (allPush) return { label: "Remis 🤝", variant: "push" };
  if (allLoss) return { label: "Dealer wygrywa", variant: "loss" };
  return { label: "Koniec rundy", variant: "mixed" };
}
