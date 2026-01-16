import { useAuth } from '@/auth-context'
import RouletteControls, { RouletteSelection } from '@/components/RouletteControls'
import AnimatedWheel from '@/components/RouletteWheel'
import { SpinHistory } from '@/components/SpinHistory'
import { BalanceDisplay } from '@/components/BalanceDisplay'
import { api } from '@/lib/api'
import { generateClientSeed, generateIdempotencyKey } from '@/lib/roulette'
import { useToast } from '@/hooks/use-toast'
import { SpinResponse } from '@server/types'
import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import confetti from 'canvas-confetti'

export const Route = createFileRoute('/_authenticated/games/roulette')({
  component: Roulette,
})

type Result = {
  number: number;
  color: 'red' | 'black' | 'green';
}

function Roulette() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [result, setResult] = useState<Result | null>(null);
  const [data, setData] = useState<SpinResponse | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [disableBetting, setDisableBetting] = useState(false);

  // React Query: pobierz balance z API
  const { data: balanceData, isLoading: isBalanceLoading } = useQuery({
    queryKey: ['casino-balance'],
    queryFn: async () => {
      const res = await api.casino.balance.$get();
      if (!res.ok) throw new Error('Failed to fetch balance');
      return res.json();
    },
    initialData: { balance: user?.balance || 0 },
    staleTime: 5000,
  });

  // React Query: pobierz nonce z API
  const { data: nonceData, isLoading: isNonceLoading } = useQuery({
    queryKey: ['casino-nonce'],
    queryFn: async () => {
      const res = await api.casino.nonce.$get();
      if (!res.ok) throw new Error('Failed to fetch nonce');
      return res.json();
    },
    staleTime: Infinity, // Nonce zmieniamy tylko lokalnie po spinie
  });

  const balance = balanceData?.balance ?? 0;
  const nextNonce = nonceData?.nextNonce ?? null;
  const isLoading = isBalanceLoading || isNonceLoading;

  // Batched place bets handler
  const handlePlaceBets = useCallback(async (bets: RouletteSelection[]) => {
    if (nextNonce === null) {
      toast({ title: 'Ładowanie...', description: 'Spróbuj ponownie za chwilę', variant: 'destructive' });
      return { success: false, error: 'nonce_not_loaded' };
    }

    setShowResult(false);
    try {
      setDisableBetting(true);

      // Generuj nowy clientSeed i idempotencyKey dla każdego spina
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

      const data = await res.json() as SpinResponse | { error: string; expectedNonce?: number };

      if (!res.ok) {
        setDisableBetting(false);

        // Obsługa błędu invalid_nonce - zsynchronizuj i pozwól spróbować ponownie
        if (res.status === 400 && 'error' in data && data.error === 'invalid_nonce' && data.expectedNonce) {
          queryClient.setQueryData(['casino-nonce'], { nextNonce: data.expectedNonce });
          toast({ title: 'Synchronizacja', description: 'Nonce zsynchronizowany. Spróbuj ponownie.' });
          return { success: false, error: 'nonce_resync' };
        }

        if (res.status === 402) {
          toast({ title: 'Brak środków', description: 'Niewystarczające środki na koncie!', variant: 'destructive' });
        } else {
          const errorMsg = 'error' in data ? data.error : 'Nieznany błąd';
          toast({ title: 'Błąd', description: errorMsg, variant: 'destructive' });
        }
        return { success: false, error: 'error' in data ? data.error : 'Request failed' };
      }

      if (data && typeof data === 'object' && 'result' in data) {
        const spin = data as unknown as SpinResponse;
        setResult(spin.result);
        setData(spin);
        // Aktualizuj cache: balance, nonce i historia
        queryClient.setQueryData(['casino-balance'], { balance: spin.newBalance });
        queryClient.setQueryData(['casino-nonce'], { nextNonce: spin.provablyFair.nonce + 1 });
        queryClient.invalidateQueries({ queryKey: ['casino-history'] });

        // Toast wyniku - pokaż po zakończeniu animacji
        setTimeout(() => {
          if (spin.totalWin > 0) {
            const profit = spin.totalWin - spin.totalBet;
            // Confetti przy wygranej!
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#FFD700', '#00FF00', '#FF6B6B'],
            });
            toast({
              title: '🎉 Wygrana!',
              description: `Wygrałeś ${spin.totalWin.toLocaleString('pl-PL')} zł${profit > 0 ? ` (zysk: +${profit.toLocaleString('pl-PL')} zł)` : ''}`,
            });
          } else {
            toast({
              title: '😔 Przegrana',
              description: `Straciłeś ${spin.totalBet.toLocaleString('pl-PL')} zł`,
              variant: 'destructive',
            });
          }
        }, 3500); // Czas animacji koła
      }

      return { success: true, error: null };
    } catch (error) {
      setDisableBetting(false);
      toast({ title: 'Błąd', description: 'Wystąpił nieoczekiwany błąd', variant: 'destructive' });
      return { success: false, error };
    }
  }, [nextNonce, queryClient, toast]);

  function handleResultNumber() {
    if (result?.color === 'red') {
      return <div className={`w-full h-full rounded-md flex items-center justify-center bg-[#FF013C]`}>{result.number}</div>
    } else if (result?.color === 'black') {
      return <div className={`w-full h-full rounded-md flex items-center justify-center bg-[#1D2224]`}>{result.number}</div>
    } else if (result?.color === 'green') {
      return <div className={`w-full h-full rounded-md flex items-center justify-center bg-[#16A34A]`}>{result.number}</div>
    }
  }

  if (isLoading) {
    return (
      <section className='p-2.5 space-y-10 mt-10 flex items-center justify-center'>
        <div className="animate-pulse text-lg">Ładowanie gry...</div>
      </section>
    );
  }

  return (
    <>
      <section className='p-2.5 space-y-10 mt-10'>
        {/* Balance Display */}
        <div className="flex justify-center">
          <BalanceDisplay initialBalance={balance} />
        </div>

        <div className='flex items-center justify-center gap-10'>
          <div className="w-12 h-12 overflow-hidden bg-zinc-700 rounded-md">
            <div
              className={`w-12 h-12 rounded-md text-center flex items-center justify-center font-bold duration-200 transform transition-all ease-in-out ${showResult ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-70'
                }`}
            >
              <div className="w-full h-full rounded-md text-white flex items-center justify-center">
                {handleResultNumber()}
              </div>
            </div>
          </div>
          <AnimatedWheel fontSizeProp={11} size={290} targetNumber={result?.number} onSpinEnd={() => {
            setDisableBetting(false);
            setShowResult(true);
          }} />
        </div>
        <div>
          <RouletteControls onPlaceBets={handlePlaceBets} balance={balance} disableBet={disableBetting} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          {/* Provably Fair Info */}
          <div className="bg-zinc-800/30 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-3">Provably Fair</h3>
            {data ? (
              <div className="space-y-1 text-sm text-zinc-400">
                <p>Numer: <span className="text-white font-mono">{data.result.number}</span></p>
                <p>Stawka: <span className="text-white">{data.totalBet.toLocaleString('pl-PL')} zł</span></p>
                <p>Wygrana: <span className={data.totalWin > 0 ? 'text-green-400' : 'text-red-400'}>{data.totalWin.toLocaleString('pl-PL')} zł</span></p>
                <p className="pt-2">Client Seed: <span className="font-mono text-xs break-all">{data.provablyFair.clientSeed}</span></p>
                <p>Server Seed Hash: <span className="font-mono text-xs break-all">{data.provablyFair.serverSeedHash}</span></p>
                <p>Nonce: <span className="font-mono">{data.provablyFair.nonce}</span></p>
              </div>
            ) : (
              <p className="text-zinc-500 text-sm">Zagraj, żeby zobaczyć dane</p>
            )}
          </div>

          {/* Historia spinów */}
          <div className="bg-zinc-800/30 p-4 rounded-lg">
            <SpinHistory />
          </div>
        </div>
      </section>
    </>
  )
}


