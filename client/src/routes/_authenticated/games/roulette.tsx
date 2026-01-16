import { useAuth } from '@/auth-context';
import RouletteControls from '@/components/RouletteControls';
import AnimatedWheel from '@/components/RouletteWheel';
import { SpinHistory } from '@/components/SpinHistory';
import { RouletteResult } from '@/components/RouletteResult';
import { ProvablyFairInfo } from '@/components/ProvablyFairInfo';
import { useCasinoGame } from '@/hooks/useCasinoGame';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/games/roulette')({
  component: Roulette,
});

/**
 * Główny komponent gry Roulette
 * Zarządza interakcją użytkownika z grą i wyświetla wszystkie komponenty
 */
function Roulette() {
  const { user } = useAuth();

  const {
    balance,
    isLoading,
    result,
    spinData,
    showResult,
    isSpinning,
    placeBets,
    onSpinEnd,
  } = useCasinoGame(user?.balance || 0);

  if (isLoading) {
    return (
      <section className="p-2.5 space-y-10 mt-10 flex items-center justify-center">
        <div className="animate-pulse text-lg">Ładowanie gry...</div>
      </section>
    );
  }

  return (
    <section className="p-2.5 space-y-10 mt-10">

      {/* Wheel and Result */}
      <div className="flex items-center justify-center gap-10">
        <RouletteResult result={result} showResult={showResult} />

        <AnimatedWheel
          fontSizeProp={11}
          size={290}
          targetNumber={result?.number}
          onSpinEnd={onSpinEnd}
        />
      </div>

      {/* Controls */}
      <RouletteControls
        onPlaceBets={placeBets}
        balance={balance}
        disableBet={isSpinning}
      />

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-32">
        <ProvablyFairInfo spinData={spinData} />

        <div className="bg-zinc-800/30 p-4 rounded-lg">
          <SpinHistory />
        </div>
      </div>
    </section>
  );
}


