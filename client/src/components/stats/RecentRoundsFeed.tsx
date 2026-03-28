/* ============================================================================
   RecentRoundsFeed
   Scrollable list of the most recent game rounds — supports both Roulette
   and Blackjack rows.
   One responsibility: render a feed of recent rounds. No data fetching.
   ============================================================================ */

import { cn } from "@/lib/utils";
import { formatCurrency, formatProfit } from "@/lib/format";
import type { RecentRound } from "@/lib/stats";
import { Dices } from "lucide-react";

interface RecentRoundsFeedProps {
  rounds: RecentRound[];
  /** Max visible rows before scrolling */
  maxVisible?: number;
}

export function RecentRoundsFeed({
  rounds,
  maxVisible = 10,
}: RecentRoundsFeedProps) {
  if (rounds.length === 0) {
    return <EmptyState />;
  }

  return (
    <div
      className="flex flex-col gap-1.5 overflow-y-auto"
      style={{ maxHeight: maxVisible * 58 }}
    >
      {rounds.map((round) => (
        <RoundRow key={round.id} round={round} />
      ))}
    </div>
  );
}

/* ── Row dispatcher ──────────────────────────────────────────────────────── */

function RoundRow({ round }: { round: RecentRound }) {
  const won = round.profit > 0;
  const push = round.profit === 0;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:bg-muted/30">
      {/* Left badge — differs per game */}
      {round.game === "Blackjack" ? (
        <BlackjackBadge handResults={round.handResults} />
      ) : (
        <RouletteBadge number={round.number} color={round.color} />
      )}

      {/* Game label + time */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-sm font-medium text-foreground">
          {round.game}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {formatRelativeTime(round.createdAt)}
        </span>
      </div>

      {/* Hand results pill — blackjack only */}
      {round.game === "Blackjack" && round.handResults.length > 0 && (
        <HandResultsPill results={round.handResults} />
      )}

      {/* Bet — hidden on mobile */}
      <div className="hidden sm:flex flex-col items-end shrink-0">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Stawka
        </span>
        <span className="text-xs font-mono text-muted-foreground">
          {formatCurrency(round.bet)}
        </span>
      </div>

      {/* Profit / loss */}
      <div className="flex flex-col items-end shrink-0 min-w-[72px]">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Wynik
        </span>
        <span
          className={cn(
            "text-sm font-bold font-mono",
            won
              ? "text-emerald-400"
              : push
                ? "text-muted-foreground"
                : "text-red-400",
          )}
        >
          {push ? "±0" : formatProfit(round.profit)}
        </span>
      </div>
    </div>
  );
}

/* ── Roulette pocket badge ───────────────────────────────────────────────── */

function RouletteBadge({ number, color }: { number: number; color: string }) {
  return (
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white",
        color === "red" && "bg-red-600",
        color === "black" && "bg-zinc-800 border border-zinc-600",
        color === "green" && "bg-emerald-600",
        !["red", "black", "green"].includes(color) && "bg-muted",
      )}
    >
      {number}
    </div>
  );
}

/* ── Blackjack game badge ────────────────────────────────────────────────── */

function BlackjackBadge({ handResults }: { handResults: string[] }) {
  // Pick the dominant result for the badge colour
  const hasBlackjack = handResults.includes("blackjack");
  const hasWin = handResults.some((r) => r === "win" || r === "blackjack");
  const allLoss = handResults.every((r) => r === "loss" || r === "bust");

  return (
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-extrabold",
        hasBlackjack
          ? "bg-amber-500/20 border border-amber-400/40 text-amber-400"
          : hasWin
            ? "bg-emerald-500/15 border border-emerald-400/30 text-emerald-400"
            : allLoss
              ? "bg-red-500/15 border border-red-400/30 text-red-400"
              : "bg-muted border border-border text-muted-foreground",
      )}
    >
      BJ
    </div>
  );
}

/* ── Hand results pill (blackjack) ───────────────────────────────────────── */

const RESULT_LABEL: Record<string, string> = {
  blackjack: "BJ",
  win: "W",
  push: "P",
  loss: "L",
  bust: "B",
};

const RESULT_CLASS: Record<string, string> = {
  blackjack: "bg-amber-500/20 text-amber-400 border-amber-400/30",
  win: "bg-emerald-500/15 text-emerald-400 border-emerald-400/30",
  push: "bg-zinc-500/20 text-zinc-400 border-zinc-400/30",
  loss: "bg-red-500/15 text-red-400 border-red-400/30",
  bust: "bg-red-600/20 text-red-500 border-red-500/30",
};

function HandResultsPill({ results }: { results: string[] }) {
  // Show at most 4 hand chips to avoid overflow
  const visible = results.slice(0, 4);
  const overflow = results.length - visible.length;

  return (
    <div className="hidden sm:flex items-center gap-1 shrink-0">
      {visible.map((r, i) => (
        <span
          key={i}
          className={cn(
            "inline-flex items-center justify-center h-5 w-5 rounded text-[9px] font-bold border",
            RESULT_CLASS[r] ??
              "bg-muted text-muted-foreground border-border",
          )}
        >
          {RESULT_LABEL[r] ?? "?"}
        </span>
      ))}
      {overflow > 0 && (
        <span className="text-[10px] text-muted-foreground font-medium">
          +{overflow}
        </span>
      )}
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────────── */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
      <Dices className="h-8 w-8 opacity-30" />
      <p className="text-sm">Brak rozegranych rund.</p>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (mins < 1) return "przed chwilą";
  if (mins < 60) return `${mins} min temu`;
  if (hours < 24) return `${hours} godz. temu`;
  if (days < 7) return `${days} dni temu`;

  return new Date(dateStr).toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "short",
  });
}
