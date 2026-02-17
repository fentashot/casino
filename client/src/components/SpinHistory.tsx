import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { ROULETTE_COLORS } from '@/lib/roulette';
import { useState } from 'react';

type Bet = {
  type: string;
  amount: string;
  win: string;
  numbers: string; // JSON string from database
  color?: string | null;
  choice?: string | null;
};

type Spin = {
  id: string;
  number: number;
  color: string;
  totalBet: string;
  totalWin: string;
  createdAt: string;
  bets: Bet[];
};

export function SpinHistory() {
  const [expandedSpinId, setExpandedSpinId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['casino-history'],
    queryFn: async () => {
      const res = await api.casino.history.$get({ query: { limit: '10' } });
      if (!res.ok) throw new Error('Failed to fetch history');
      return res.json() as Promise<{ spins: Spin[] }>;
    },
    staleTime: 10000,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-zinc-800 rounded" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-sm">Błąd ładowania historii</div>;
  }

  if (!data?.spins?.length) {
    return <div className="text-zinc-500 text-sm">Brak historii spinów</div>;
  }

  const toggleExpand = (spinId: string) => {
    setExpandedSpinId(expandedSpinId === spinId ? null : spinId);
  };

  const formatBetType = (bet: Bet): string => {
    // Parse numbers from JSON string
    try {
      const numbers = JSON.parse(bet.numbers) as number[];
      if (numbers && numbers.length > 0) {
        return `Nr: ${numbers.join(', ')}`;
      }
    } catch {
      // If parsing fails, continue to other checks
    }

    if (bet.color) return bet.color === 'red' ? 'Czerwony' : 'Czarny';
    if (bet.choice) {
      const choiceMap: Record<string, string> = {
        'even': 'Parzyste',
        'odd': 'Nieparzyste',
        'low': '1-18',
        'high': '19-36',
        '1st12': '1-12',
        '2nd12': '13-24',
        '3rd12': '25-36',
        'col1': 'Kolumna 1',
        'col2': 'Kolumna 2',
        'col3': 'Kolumna 3',
      };
      return choiceMap[bet.choice] || bet.choice;
    }
    return bet.type;
  };

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-lg mb-3">Historia spinów</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {data.spins.map((spin) => {
          const totalBet = Number(spin.totalBet);
          const totalWin = Number(spin.totalWin);
          const profit = totalWin - totalBet;
          const isWin = totalWin > 0;
          const colorHex = ROULETTE_COLORS[spin.color as keyof typeof ROULETTE_COLORS] || '#333';
          const isExpanded = expandedSpinId === spin.id;

          return (
            <div
              key={spin.id}
              className="bg-zinc-800/50 rounded-lg overflow-hidden"
            >
              <div
                className="flex items-center justify-between p-2 cursor-pointer hover:bg-zinc-800/70 transition-colors"
                onClick={() => toggleExpand(spin.id)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center font-bold text-white text-sm"
                    style={{ backgroundColor: colorHex }}
                  >
                    {spin.number}
                  </div>
                  <div className="text-xs text-zinc-400">
                    {new Date(spin.createdAt).toLocaleString('pl-PL', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-semibold ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                    {isWin ? '+' : ''}{profit.toLocaleString('pl-PL')} zł
                  </div>
                  <div className="text-xs text-zinc-500">
                    Stawka: {totalBet.toLocaleString('pl-PL')} zł
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-zinc-700/50">
                  <div className="text-xs text-zinc-400 mb-2">Zakłady ({spin.bets.length}):</div>
                  <div className="space-y-1">
                    {spin.bets.map((bet, idx) => {
                      const betAmount = Number(bet.amount);
                      const betWin = Number(bet.win);
                      const betProfit = betWin - betAmount;

                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs bg-zinc-900/30 rounded px-2 py-1"
                        >
                          <span className="text-zinc-300">{formatBetType(bet)}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500">{betAmount.toLocaleString('pl-PL')} zł</span>
                            <span className={betWin > 0 ? 'text-green-400' : 'text-zinc-600'}>
                              {betWin > 0 ? `+${betProfit.toLocaleString('pl-PL')}` : '0'} zł
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
