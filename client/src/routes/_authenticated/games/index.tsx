import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/auth-context";
import { Dices, Clock, ArrowRight, Star, Layers, TrendingUp, Rows3 } from "lucide-react";

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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {getGreeting()},{" "}
          <span className="text-primary">
            {user?.name?.split(" ")[0] ?? "Player"}
          </span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Pick a game and test your luck. All outcomes are cryptographically
          verified.
        </p>
      </div>

      {/* Stats summary */}
      <div className="animate-slide-up" style={{ animationDelay: "90ms" }}>
        <StatsSummaryCards overview={overview} isLoading={statsLoading} />
      </div>

      {/* Featured game — Roulette spotlight */}
      <div className="animate-slide-up" style={{ animationDelay: "120ms" }}>
        <Link to="/games/roulette" className="block group">
          <div className="relative overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:border-primary/40 hover:shadow-md card-hover">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-6">
              {/* Game icon */}
              <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 transition-all duration-200 group-hover:bg-primary/15">
                <Dices className="h-8 w-8 sm:h-10 sm:w-10 text-primary transition-transform duration-200 group-hover:scale-105 group-hover:rotate-6" />
                {/* Live badge */}
                <div className="absolute -top-1.5 -right-1.5 flex items-center gap-1 rounded-full bg-card border border-border px-2 py-0.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-semibold text-foreground uppercase tracking-wide">
                    Live
                  </span>
                </div>
              </div>

              {/* Game info */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wide">
                    <Star className="h-2.5 w-2.5" />
                    Featured
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                  European Roulette
                </h2>
                <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                  Classic single-zero roulette with provably fair outcomes.
                  Straight, split, street, corner, column, dozen bets and more.
                </p>
                <div className="flex items-center gap-4 pt-0.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Dices className="h-3 w-3" />
                    <span>37 pockets</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    <span>Up to 36× payout</span>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="flex items-center gap-2 text-sm font-semibold text-primary group-hover:gap-3 transition-all duration-200 shrink-0 sm:self-center">
                Play Now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Games grid */}
      <div className="space-y-3 animate-slide-up" style={{ animationDelay: "180ms" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold tracking-tight text-foreground">All Games</h3>
          <span className="text-xs text-muted-foreground">3 available</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger-children">
          <GameCard
            title="European Roulette"
            description="Single-zero classic roulette"
            icon={<Dices className="h-5 w-5" />}
            tags={["Provably Fair", "Live"]}
            to="/games/roulette"
          />
          <GameCard
            title="Blackjack"
            description="Classic 21 — beat the dealer to win"
            icon={<Layers className="h-5 w-5" />}
            tags={["Live", "3:2 BJ"]}
            to="/games/blackjack"
          />
          <GameCard
            title="Plinko"
            description="Drop the ball through the pegs to win big"
            icon={<Rows3 className="h-5 w-5" />}
            tags={["Up to 1000×", "Live"]}
            to="/games/plinko"
          />
        </div>
      </div>

      {/* Recent activity link */}
      <div className="animate-slide-up" style={{ animationDelay: "240ms" }}>
        <Link
          to="/games/stats"
          className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-3.5 transition-all duration-150 hover:bg-muted/40 hover:border-primary/30 group"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
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
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-150" />
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
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/40 hover:shadow-sm card-hover">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted border border-border text-foreground transition-all duration-200 group-hover:bg-primary/10 group-hover:border-primary/20 group-hover:text-primary">
              {icon}
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              {title}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-md bg-muted border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide"
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
    <div className="rounded-xl border border-border bg-card p-5 opacity-50 cursor-default select-none">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted border border-border text-muted-foreground">
            <Clock className="h-5 w-5" />
          </div>
          <span className="inline-flex items-center rounded-md bg-muted border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Soon
          </span>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-semibold tracking-tight text-muted-foreground">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      </div>
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
