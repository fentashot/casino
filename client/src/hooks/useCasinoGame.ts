import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { generateClientSeed, generateIdempotencyKey } from '@/lib/roulette';
import { SpinResponse } from '@server/types';
import confetti from 'canvas-confetti';
import type { RouletteSelection } from '@/components/RouletteControls';

type Result = {
  number: number;
  color: 'red' | 'black' | 'green';
};

const ANIMATION_DURATION = 3500;

/**
 * Hook zarządzający stanem gry w kasynie (roulette)
 * Obsługuje: balance, nonce, spinning, win/loss notifications
 */
export function useCasinoGame(initialBalance = 0) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [result, setResult] = useState<Result | null>(null);
  const [spinData, setSpinData] = useState<SpinResponse | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinTimeoutId, setSpinTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Fetch user balance
  const { data: balanceData, isLoading: isBalanceLoading } = useQuery({
    queryKey: ['casino-balance'],
    queryFn: async () => {
      const res = await api.casino.balance.$get();
      if (!res.ok) throw new Error('Failed to fetch balance');
      return res.json();
    },
    initialData: { balance: initialBalance },
    staleTime: 5000,
  });

  // Fetch next nonce
  const { data: nonceData, isLoading: isNonceLoading } = useQuery({
    queryKey: ['casino-nonce'],
    queryFn: async () => {
      const res = await api.casino.nonce.$get();
      if (!res.ok) throw new Error('Failed to fetch nonce');
      return res.json();
    },
    staleTime: Infinity,
  });

  const balance = balanceData?.balance ?? 0;
  const nextNonce = nonceData?.nextNonce ?? null;
  const isLoading = isBalanceLoading || isNonceLoading;

  const showWinNotification = useCallback((spin: SpinResponse) => {
    const profit = spin.totalWin - spin.totalBet;

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#00FF00', '#FF6B6B'],
    });

    toast({
      title: '🎉 Wygrana!',
      description: `Wygrałeś ${spin.totalWin.toLocaleString('pl-PL')} zł${profit > 0 ? ` (zysk: +${profit.toLocaleString('pl-PL')} zł)` : ''
        }`,
    });
  }, [toast]);

  const showLossNotification = useCallback((spin: SpinResponse) => {
    toast({
      title: '😔 Przegrana',
      description: `Straciłeś ${spin.totalBet.toLocaleString('pl-PL')} zł`,
      variant: 'destructive',
    });
  }, [toast]);

  const handleSpinError = useCallback((
    error: string,
    status: number,
    expectedNonce?: number
  ) => {
    setIsSpinning(false);

    // Resync nonce if invalid
    if (status === 400 && error === 'invalid_nonce' && expectedNonce) {
      queryClient.setQueryData(['casino-nonce'], { nextNonce: expectedNonce });
      toast({
        title: 'Synchronizacja',
        description: 'Nonce zsynchronizowany. Spróbuj ponownie.',
      });
      return { success: false, error: 'nonce_resync' };
    }

    // Insufficient funds
    if (status === 402) {
      toast({
        title: 'Brak środków',
        description: 'Niewystarczające środki na koncie!',
        variant: 'destructive',
      });
      return { success: false, error: 'insufficient_funds' };
    }

    // Generic error
    toast({
      title: 'Błąd',
      description: error || 'Nieznany błąd',
      variant: 'destructive',
    });
    return { success: false, error };
  }, [queryClient, toast]);

  const placeBets = useCallback(async (bets: RouletteSelection[]) => {
    if (nextNonce === null) {
      toast({
        title: 'Ładowanie...',
        description: 'Spróbuj ponownie za chwilę',
        variant: 'destructive',
      });
      return { success: false, error: 'nonce_not_loaded' };
    }

    setShowResult(false);
    setIsSpinning(true);

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

      const data = (await res.json()) as
        | SpinResponse
        | { error: string; expectedNonce?: number };

      if (!res.ok) {
        return handleSpinError(
          'error' in data ? data.error : 'Request failed',
          res.status,
          'expectedNonce' in data ? data.expectedNonce : undefined
        );
      }

      if (data && typeof data === 'object' && 'result' in data) {
        const spin = data as SpinResponse;

        setResult(spin.result);
        setSpinData(spin);

        // Update cache immediately
        queryClient.setQueryData(['casino-balance'], { balance: spin.newBalance });
        queryClient.setQueryData(['casino-nonce'], {
          nextNonce: spin.provablyFair.nonce + 1,
        });

        // Safety timeout - force unlock after 10 seconds if wheel doesn't call onSpinEnd
        const timeoutId = setTimeout(() => {
          setIsSpinning(false);
          setShowResult(true);
          queryClient.invalidateQueries({ queryKey: ['casino-history'] });
        }, 10000);
        setSpinTimeoutId(timeoutId);

        // Show notification after animation
        setTimeout(() => {
          if (spin.totalWin > 0) {
            showWinNotification(spin);
          } else {
            showLossNotification(spin);
          }
        }, ANIMATION_DURATION);

        return { success: true, error: null };
      }

      return { success: false, error: 'Invalid response' };
    } catch (error) {
      setIsSpinning(false);
      toast({
        title: 'Błąd',
        description: 'Wystąpił nieoczekiwany błąd',
        variant: 'destructive',
      });
      return { success: false, error };
    }
  }, [nextNonce, queryClient, toast, handleSpinError, showWinNotification, showLossNotification]);

  const onSpinEnd = useCallback(() => {
    // Clear safety timeout
    if (spinTimeoutId) {
      clearTimeout(spinTimeoutId);
      setSpinTimeoutId(null);
    }

    setIsSpinning(false);
    setShowResult(true);
    // Invalidate history AFTER animation completes
    queryClient.invalidateQueries({ queryKey: ['casino-history'] });
  }, [queryClient, spinTimeoutId]);

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
