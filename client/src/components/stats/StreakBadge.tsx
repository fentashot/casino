/* ============================================================================
   StreakBadge
   Visual display of the current win or loss streak.
   One responsibility: render a single streak indicator. No data fetching.
   ============================================================================ */

import { cn } from "@/lib/utils";
import { Flame, Snowflake } from "lucide-react";

interface StreakBadgeProps {
  /** Positive = win streak, negative = loss streak, 0 = neutral */
  currentStreak: number;
  longestWinStreak: number;
  longestLossStreak: number;
}

export function StreakBadge({
  currentStreak,
  longestWinStreak,
  longestLossStreak,
}: StreakBadgeProps) {
  const isWin = currentStreak > 0;
  const isLoss = currentStreak < 0;
  const abs = Math.abs(currentStreak);

  return (
    <div className="flex flex-col gap-3">
      {/* Current streak pill */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border px-4 py-3",
          isWin
            ? "border-emerald-500/25 bg-emerald-500/8"
            : isLoss
              ? "border-red-500/25 bg-red-500/8"
              : "border-border/30 bg-muted/20",
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            isWin
              ? "bg-emerald-500/15 text-emerald-400"
              : isLoss
                ? "bg-red-500/15 text-red-400"
                : "bg-muted/50 text-muted-foreground",
          )}
        >
          {isWin ? (
            <Flame className="h-5 w-5" />
          ) : isLoss ? (
            <Snowflake className="h-5 w-5" />
          ) : (
            <Flame className="h-5 w-5 opacity-30" />
          )}
        </div>

        {/* Label + value */}
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Aktualny streak
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span
              className={cn(
                "text-2xl font-extrabold font-mono leading-none",
                isWin
                  ? "text-emerald-400"
                  : isLoss
                    ? "text-red-400"
                    : "text-muted-foreground",
              )}
            >
              {abs}
            </span>
            <span
              className={cn(
                "text-xs font-semibold",
                isWin
                  ? "text-emerald-400/70"
                  : isLoss
                    ? "text-red-400/70"
                    : "text-muted-foreground",
              )}
            >
              {abs === 1
                ? isWin
                  ? "wygrana"
                  : isLoss
                    ? "przegrana"
                    : "rund"
                : isWin
                  ? "wygrane z rzędu"
                  : isLoss
                    ? "przegrane z rzędu"
                    : "rund"}
            </span>
          </div>
        </div>

        {/* Flame dots for intensity (up to 5) */}
        {abs > 0 && (
          <div className="ml-auto flex items-center gap-0.5">
            {Array.from({ length: Math.min(abs, 5) }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isWin ? "bg-emerald-400" : "bg-red-400",
                  i >= 3 && "opacity-60",
                  i >= 4 && "opacity-30",
                )}
              />
            ))}
            {abs > 5 && (
              <span
                className={cn(
                  "text-[10px] font-bold ml-1",
                  isWin ? "text-emerald-400" : "text-red-400",
                )}
              >
                +{abs - 5}
              </span>
            )}
          </div>
        )}
      </div>

      {/* All-time records row */}
      <div className="grid grid-cols-2 gap-2">
        <RecordTile
          label="Najlepszy streak"
          value={longestWinStreak}
          unit="wygranych"
          variant="win"
        />
        <RecordTile
          label="Najgorszy streak"
          value={longestLossStreak}
          unit="przegranych"
          variant="loss"
        />
      </div>
    </div>
  );
}

/* ── Record tile ─────────────────────────────────────────────────────────── */

function RecordTile({
  label,
  value,
  unit,
  variant,
}: {
  label: string;
  value: number;
  unit: string;
  variant: "win" | "loss";
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border/30 bg-muted/10 px-3 py-2.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            "text-lg font-extrabold font-mono leading-none",
            variant === "win" ? "text-emerald-400" : "text-red-400",
          )}
        >
          {value}
        </span>
        <span className="text-[10px] text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}
