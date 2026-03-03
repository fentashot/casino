import { useQuery } from "@tanstack/react-query";
import { fetchBalance } from "@/lib/roulette/api";
import { cn } from "@/lib/utils";
import { Wallet } from "lucide-react";

interface BalanceDisplayProps {
  initialBalance?: number;
  className?: string;
  compact?: boolean;
}

export function BalanceDisplay({
  initialBalance = 0,
  className = "",
  compact = false,
}: BalanceDisplayProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["casino-balance"],
    queryFn: fetchBalance,
    initialData: { balance: initialBalance },
    staleTime: 5000,
  });

  const balance = data?.balance ?? 0;

  if (isLoading) {
    return (
      <div
        className={cn(
          "shimmer rounded-xl",
          compact ? "h-10 w-24" : "h-14 w-36",
          className,
        )}
      />
    );
  }

  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-lg balance-pill px-3 py-2",
          className,
        )}
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
          <Wallet className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-sm font-bold font-mono tracking-tight text-foreground">
          {formatBalance(balance)}
          <span className="text-xs font-medium text-muted-foreground ml-1">
            zł
          </span>
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl balance-pill p-4 transition-all duration-300",
        className,
      )}
    >
      {/* Subtle ambient glow */}
      <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-primary/[0.06] blur-[30px] pointer-events-none" />

      <div className="relative z-10 flex items-center gap-3">
        {/* Icon container */}
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
          <Wallet className="h-5 w-5 text-primary" />
          {/* Pulse dot */}
          <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>

        {/* Balance info */}
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Balance
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-extrabold font-mono tracking-tight text-foreground tabular-nums">
              {formatBalance(balance)}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              PLN
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatBalance(value: number): string {
  return value.toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
