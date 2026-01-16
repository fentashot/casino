import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface BalanceDisplayProps {
  initialBalance?: number;
  className?: string;
}

export function BalanceDisplay({ initialBalance = 0, className = '' }: BalanceDisplayProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['casino-balance'],
    queryFn: async () => {
      const res = await api.casino.balance.$get();
      if (!res.ok) throw new Error('Failed to fetch balance');
      return res.json();
    },
    initialData: { balance: initialBalance },
    staleTime: 5000,
  });

  const balance = data?.balance ?? 0;

  if (isLoading) {
    return (
      <div className={`animate-pulse bg-zinc-700 rounded-lg h-12 w-32 ${className}`} />
    );
  }

  return (
    <div className={`flex items-center gap-2 bg-gradient-to-r from-zinc-800 to-zinc-900 px-4 py-2 rounded-lg border border-zinc-700 ${className}`}>
      <div className="flex items-center justify-center w-8 h-8 bg-yellow-500/20 rounded-full">
        <span className="text-yellow-400 text-lg">💰</span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-zinc-400 uppercase tracking-wide">Saldo</span>
        <span className="text-lg font-bold text-white">
          {balance.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span className="text-zinc-400 text-sm ml-1">zł</span>
        </span>
      </div>
    </div>
  );
}
