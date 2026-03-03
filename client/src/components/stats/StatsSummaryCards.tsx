/* ============================================================================
   StatsSummaryCards
   Clickable summary tiles shown on the /games index page.
   Each tile displays one KPI from the overview and links to /games/stats.

   One responsibility: render summary KPIs with a "see more" affordance.
   No data fetching — receives data via props from the parent page.
   ============================================================================ */

import { Link } from "@tanstack/react-router";
import {
  TrendingUp,
  TrendingDown,
  Trophy,
  Target,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatProfit } from "@/lib/format";
import type { StatsOverview } from "@/lib/stats";

interface StatsSummaryCardsProps {
  overview: StatsOverview | null;
  isLoading: boolean;
}

export function StatsSummaryCards({
  overview,
  isLoading,
}: StatsSummaryCardsProps) {
  const ov = overview;
  const netProfit = ov?.netProfit ?? 0;
  const winRate = ov?.winRate ?? 0;

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          Twoje statystyki
        </h3>
        <Link
          to="/games/stats"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline underline-offset-2 transition-colors"
        >
          Szczegóły
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Cards grid */}
      <Link to="/games/stats" className="block group">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 cursor-pointer">
          <SummaryTile
            label="Net profit"
            value={isLoading ? null : formatProfit(netProfit)}
            icon={
              netProfit >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )
            }
            variant={netProfit >= 0 ? "win" : "loss"}
            isLoading={isLoading}
          />
          <SummaryTile
            label="Win rate"
            value={isLoading ? null : `${winRate}%`}
            icon={<Target className="h-4 w-4" />}
            variant={winRate >= 50 ? "win" : "default"}
            isLoading={isLoading}
          />
          <SummaryTile
            label="Największa wygrana"
            value={isLoading ? null : formatCurrency(ov?.biggestWin ?? 0)}
            icon={<Trophy className="h-4 w-4" />}
            variant={(ov?.biggestWin ?? 0) > 0 ? "win" : "default"}
            isLoading={isLoading}
          />
          <SummaryTile
            label="Rozegranych rund"
            value={isLoading ? null : String(ov?.totalRounds ?? 0)}
            icon={<BarChart3 className="h-4 w-4" />}
            variant="default"
            isLoading={isLoading}
            /* Last tile shows the "see full stats" cue */
            cta
          />
        </div>
      </Link>
    </div>
  );
}

/* ============================================================================
   SummaryTile — single stat inside the summary grid
   ============================================================================ */

type TileVariant = "default" | "win" | "loss";

interface SummaryTileProps {
  label: string;
  value: string | null;
  icon: React.ReactNode;
  variant: TileVariant;
  isLoading: boolean;
  /** Show the "View all stats →" affordance in the corner */
  cta?: boolean;
}

const ICON_BG: Record<TileVariant, string> = {
  default: "bg-muted/60 text-muted-foreground",
  win: "bg-emerald-500/10 text-emerald-400",
  loss: "bg-red-500/10 text-red-400",
};

const VALUE_COLOR: Record<TileVariant, string> = {
  default: "text-foreground",
  win: "text-emerald-400",
  loss: "text-red-400",
};

function SummaryTile({
  label,
  value,
  icon,
  variant,
  isLoading,
  cta = false,
}: SummaryTileProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm p-4",
        "transition-all duration-200",
        "group-hover:bg-card/60 group-hover:border-primary/20",
      )}
    >
      {/* Icon + label */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            ICON_BG[variant],
          )}
        >
          {icon}
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
          {label}
        </span>
      </div>

      {/* Value or skeleton */}
      {isLoading ? (
        <div className="h-6 w-20 rounded-md bg-muted/40 animate-pulse" />
      ) : (
        <p
          className={cn(
            "text-xl font-bold font-mono tracking-tight leading-none",
            VALUE_COLOR[variant],
          )}
        >
          {value ?? "—"}
        </p>
      )}

      {/* CTA arrow — only on the last tile */}
      {cta && (
        <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span>Szczegóły</span>
          <ArrowRight className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}
