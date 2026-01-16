import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { ROULETTE_COLORS } from '@/lib/roulette';

type Spin = {
  id: string;
  number: number;
  color: string;
  totalBet: string;
  totalWin: string;
  createdAt: string;
  bets: Array<{
    type: string;
    amount: string;
    win: string;
  }>;
};

export function SpinHistory() {
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

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-lg mb-3">Historia spinów</h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {data.spins.map((spin) => {
          const totalBet = Number(spin.totalBet);
          const totalWin = Number(spin.totalWin);
          const profit = totalWin - totalBet;
          const isWin = totalWin > 0;
          const colorHex = ROULETTE_COLORS[spin.color as keyof typeof ROULETTE_COLORS] || '#333';

          return (
            <div
              key={spin.id}
              className="flex items-center justify-between p-2 bg-zinc-800/50 rounded-lg"
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
          );
        })}
      </div>
    </div>
  );
}
