import { DatabaseZap } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShoePenetrationBarProps {
  penetration: number;
}

export function ShoePenetrationBar({ penetration }: ShoePenetrationBarProps) {
  const pct = Math.min(100, Math.max(0, penetration));
  const near = pct >= 70;
  const warn = pct >= 75;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/20 bg-card/20 px-4 py-2.5">
      <DatabaseZap
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          warn
            ? "text-amber-400"
            : near
              ? "text-amber-500/70"
              : "text-muted-foreground/50",
        )}
      />
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Shoe penetration
          </span>
          <span
            className={cn(
              "text-[10px] font-mono font-semibold",
              warn ? "text-amber-400" : "text-muted-foreground/50",
            )}
          >
            {pct}%{warn ? " — reshuffle soon" : ""}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-out",
              warn
                ? "bg-amber-400"
                : near
                  ? "bg-amber-500/60"
                  : "bg-primary/50",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
