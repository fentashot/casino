import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/auth-context";
import {
  Dices,
  Clock,
  ArrowRight,
  Star,
  Layers,
  TrendingUp,
} from "lucide-react";

import { StatsSummaryCards } from "@/components/stats";
import { useStatsSummary } from "@/hooks/useStats";

export const Route = createFileRoute("/_authenticated/games/")({
  component: GamesIndex,
});

function GamesIndex() {
  const { user } = useAuth();
  const { overview, isLoading: statsLoading } = useStatsSummary();

  return (
    <div className="space-y-8">
      {/* Greeting & page header */}
      <div className="space-y-1 animate-fade-in">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {getGreeting()},{" "}
          <span className="text-gradient-emerald">
            {user?.name?.split(" ")[0] ?? "Player"}
          </span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Pick a game and test your luck. All outcomes are cryptographically
          verified.
        </p>
      </div>

      {/* Stats summary — links to /games/stats */}
      <div className="animate-slide-up" style={{ animationDelay: "90ms" }}>
        <StatsSummaryCards overview={overview} isLoading={statsLoading} />
      </div>

      {/* Featured game — Roulette spotlight */}
      <div className="animate-slide-up" style={{ animationDelay: "120ms" }}>
        <Link to="/games/roulette" className="block group">
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 card-hover">
            {/* Background decoration */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/[0.06] blur-[80px]" />
              <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent/[0.04] blur-[60px]" />
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 sm:p-8">
              {/* Game icon */}
              <div className="relative flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 glow-emerald group-hover:glow-emerald-strong transition-all duration-300">
                <Dices className="h-10 w-10 sm:h-12 sm:w-12 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                {/* Live badge */}
                <div className="absolute -top-2 -right-2 flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                    Live
                  </span>
                </div>
              </div>

              {/* Game info */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wider">
                    <Star className="h-2.5 w-2.5" />
                    Featured
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground group-hover:text-gradient-emerald transition-colors duration-200">
                  European Roulette
                </h2>
                <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                  Classic single-zero roulette with provably fair outcomes.
                  Straight, split, street, corner, column, dozen bets and more.
                </p>
                <div className="flex items-center gap-4 pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Dices className="h-3 w-3" />
                    <span>37 pockets</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    <span>Up to 36x payout</span>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="flex items-center gap-2 text-sm font-semibold text-primary group-hover:gap-3 transition-all duration-300 shrink-0 sm:self-center">
                Play Now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Games grid */}
      <div
        className="space-y-4 animate-slide-up"
        style={{ animationDelay: "180ms" }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-tight">All Games</h3>
          <span className="text-xs text-muted-foreground font-medium">
            2 games available
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          <GameCard
            title="European Roulette"
            description="Single-zero classic roulette"
            icon={<Dices className="h-6 w-6" />}
            tags={["Provably Fair", "Live"]}
            to="/games/roulette"
          />

          <GameCard
            title="Blackjack"
            description="Classic 21 — beat the dealer to win"
            icon={<Layers className="h-6 w-6" />}
            tags={["Live", "3:2 BJ"]}
            to="/games/blackjack"
          />
          <ComingSoonCard
            title="Crash"
            description="Multiplier prediction game"
          />
        </div>
      </div>

      {/* Recent activity link — points to full stats page */}
      <div className="animate-slide-up" style={{ animationDelay: "240ms" }}>
        <Link
          to="/games/stats"
          className="flex items-center justify-between rounded-xl border border-border/40 bg-card/30 backdrop-blur-sm px-5 py-3.5 transition-all duration-200 hover:bg-card/50 hover:border-primary/20 group"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
              <Clock className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">
                Historia i statystyki
              </span>
              <span className="text-xs text-muted-foreground">
                Wykresy, trendy, aktywność godzinowa i więcej
              </span>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200" />
        </Link>
      </div>
    </div>
  );
}

/* ============================================================================
   SUB-COMPONENTS
   ============================================================================ */

function GameCard({
  title,
  description,
  icon,
  tags,
  to,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  tags: string[];
  to: string;
}) {
  return (
    <Link to={to} className="block group">
      <div className="relative overflow-hidden rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm p-5 transition-all duration-300 hover:border-primary/30 hover:bg-card/60 card-hover">
        {/* Subtle glow on hover */}
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-primary/0 group-hover:bg-primary/[0.05] blur-[40px] transition-all duration-500" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary transition-all duration-300 group-hover:glow-emerald group-hover:scale-105">
              {icon}
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-md bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}

function ComingSoonCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/30 bg-card/20 p-5 opacity-60 cursor-default">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/30 border border-border/30">
            <Clock className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <span className="inline-flex items-center rounded-md bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
            Soon
          </span>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-semibold tracking-tight text-muted-foreground">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground/60 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {/* Diagonal "coming soon" overlay line */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-muted/10" />
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
