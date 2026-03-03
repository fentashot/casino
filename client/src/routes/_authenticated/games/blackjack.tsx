import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/auth-context";
import { BlackjackGame } from "@/components/blackjack/BlackjackGame";
import { Trophy, TrendingUp, Layers } from "lucide-react";

export const Route = createFileRoute("/_authenticated/games/blackjack")({
  component: BlackjackPage,
});

function BlackjackPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-5 pb-12">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start sm:items-center justify-between gap-4 animate-fade-in">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Blackjack
            </h1>
            <LiveBadge />
          </div>
          <p className="text-sm text-muted-foreground">
            Classic 21 · Dealer hits soft 17 · Blackjack pays 3:2
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2 flex-wrap justify-end">
          <Stat
            icon={<Trophy className="h-3.5 w-3.5" />}
            label="Blackjack"
            value="3:2"
          />
          <Stat
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label="Payout"
            value="1:1"
          />
          <Stat
            icon={<Layers className="h-3.5 w-3.5" />}
            label="Decks"
            value="6"
          />
        </div>
      </div>

      {/* ── Game ────────────────────────────────────────────────────────── */}
      <div className="animate-slide-up" style={{ animationDelay: "60ms" }}>
        <BlackjackGame initialBalance={user?.balance ?? 0} />
      </div>
    </div>
  );
}

/* ── tiny presentational pieces ──────────────────────────────────────────── */

function LiveBadge() {
  return (
    <div className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5">
      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
      <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
        Live
      </span>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border/30 bg-card/30 px-2.5 py-1.5">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[11px] text-muted-foreground">{label}:</span>
      <span className="text-[11px] font-semibold text-foreground font-mono">
        {value}
      </span>
    </div>
  );
}
