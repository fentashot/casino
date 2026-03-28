import { cn } from "@/lib/utils";

export type ResultVariant = "blackjack" | "win" | "push" | "loss" | "mixed";

interface ResultBannerProps {
  variant: ResultVariant;
  label: string;
}

const STYLES: Record<ResultVariant, string> = {
  blackjack:
    "bg-amber-500/20 border-amber-400/50 text-amber-200 shadow-amber-900/40",
  win: "bg-emerald-500/20 border-emerald-400/50 text-emerald-200 shadow-emerald-900/40",
  push: "bg-zinc-500/20 border-zinc-400/40 text-zinc-300 shadow-zinc-900/40",
  loss: "bg-red-600/20 border-red-500/50 text-red-300 shadow-red-900/40",
  mixed:
    "bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-blue-900/40",
};

export function ResultBanner({ variant, label }: ResultBannerProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-8 py-2.5 shadow-sm",
        "text-xl sm:text-2xl font-bold tracking-tight text-center",
        "animate-number-pop",
        STYLES[variant],
      )}
    >
      {label}
    </div>
  );
}
