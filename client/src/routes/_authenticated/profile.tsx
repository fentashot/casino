import { AdminSeedPanel } from "@/components/AdminSeedPanel";
import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/auth-context";
import { useQuery } from "@tanstack/react-query";
import { fetchHistory } from "@/lib/roulette/api";
import {
  User,
  Mail,
  Shield,
  LogOut,
  Copy,
  Check,
  TrendingUp,
  Dices,
  Wallet,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/profile")({
  component: Profile,
});

function Profile() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: historyData } = useQuery({
    queryKey: ["casino-history"],
    queryFn: () => fetchHistory(50),
    staleTime: 10000,
  });

  const spins = historyData?.spins ?? [];

  // Calculate lifetime stats
  const totalWagered = spins.reduce((acc, s) => acc + Number(s.totalBet), 0);
  const totalWon = spins.reduce((acc, s) => acc + Number(s.totalWin), 0);
  const netProfit = totalWon - totalWagered;
  const totalGames = spins.length;
  const wins = spins.filter((s) => Number(s.totalWin) > 0).length;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const biggestWin =
    spins.length > 0 ? Math.max(...spins.map((s) => Number(s.totalWin))) : 0;

  const initials = user?.name
    ? user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
    : "??";

  return (
    <div className="space-y-8 pb-8">
      {/* Page header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Profile
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and view your gaming statistics
        </p>
      </div>

      {/* ================================================================
          USER CARD — Avatar + info + actions
          ================================================================ */}
      <div className="animate-slide-up" style={{ animationDelay: "60ms" }}>
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm">
          {/* Background decoration */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/[0.06] blur-[80px]" />
            <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent/[0.04] blur-[60px]" />
          </div>

          {/* Top gradient strip */}
          <div className="h-24 sm:h-32 bg-gradient-to-r from-primary/10 via-primary/5 to-accent/5 relative">
            <div className="absolute inset-0 bg-dots opacity-20" />
            {/* Admin crown badge */}
            {isAdmin && (
              <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/25 px-3 py-1">
                <Crown className="h-3 w-3 text-amber-400" />
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                  Admin
                </span>
              </div>
            )}
          </div>

          {/* Profile content */}
          <div className="relative z-10 px-6 pb-6">
            {/* Avatar — overlapping the gradient strip */}
            <div className="-mt-12 sm:-mt-14 mb-4 flex items-end gap-4">
              <div className="relative flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-2xl bg-card border-4 border-background shadow-xl">
                <span className="text-xl sm:text-2xl font-bold text-muted-foreground">
                  {initials}
                </span>
                {/* Online indicator */}
                <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-[3px] border-background bg-emerald-500" />
              </div>

              <div className="flex-1 min-w-0 pb-1">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
                  {user?.name}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  {isAdmin ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                      <Shield className="h-2.5 w-2.5" />
                      Administrator
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wider">
                      Player
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Info rows */}
            <div className="space-y-3 mt-6">
              <InfoRow
                icon={<User className="h-4 w-4" />}
                label="Full Name"
                value={user?.name ?? "—"}
              />
              <InfoRow
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                value={user?.email ?? "—"}
                copyable
              />
              <InfoRow
                icon={<Shield className="h-4 w-4" />}
                label="Account ID"
                value={
                  user?.id
                    ? `${user.id.slice(0, 8)}...${user.id.slice(-4)}`
                    : "—"
                }
                copyValue={user?.id}
                copyable
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border/40">
              <Button
                variant="outline"
                className="gap-2 border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================
          STATS GRID
          ================================================================ */}
      <div className="animate-slide-up" style={{ animationDelay: "120ms" }}>
        <h3 className="text-lg font-semibold tracking-tight mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Statistics
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            label="Balance"
            value={formatCurrency(user?.balance ?? 0)}
            variant="primary"
          />
          <StatCard
            label="Total Wagered"
            value={formatCurrency(totalWagered)}
          />
          <StatCard
            label="Total Won"
            value={formatCurrency(totalWon)}
            variant={totalWon > totalWagered ? "win" : undefined}
          />
          <StatCard
            label="Net Profit"
            value={`${netProfit >= 0 ? "+" : ""}${formatCurrency(netProfit)}`}
            variant={netProfit >= 0 ? "win" : "loss"}
          />
          <StatCard
            label="Win Rate"
            value={`${winRate}%`}
            subtitle={`${wins}/${totalGames}`}
            variant={winRate >= 50 ? "win" : undefined}
          />
          <StatCard
            label="Biggest Win"
            value={formatCurrency(biggestWin)}
            variant={biggestWin > 0 ? "win" : undefined}
          />
        </div>
      </div>

      {/* ================================================================
          RECENT GAMES OVERVIEW
          ================================================================ */}
      {spins.length > 0 && (
        <div className="animate-slide-up" style={{ animationDelay: "180ms" }}>
          <h3 className="text-lg font-semibold tracking-tight mb-4 flex items-center gap-2">
            <Dices className="h-4 w-4 text-muted-foreground" />
            Recent Results
          </h3>

          {/* Results strip — horizontal scrollable on mobile */}
          <div className="flex gap-2 overflow-x-auto pb-2 fade-edges">
            {spins.slice(0, 20).map((spin) => {
              const won = Number(spin.totalWin) > 0;
              return (
                <div
                  key={spin.id}
                  className={cn(
                    "flex flex-col items-center gap-1 shrink-0 rounded-xl border p-3 min-w-[4rem] transition-colors",
                    won
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : "border-border/30 bg-card/30",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white",
                      spin.color === "red" && "bg-red-600",
                      spin.color === "black" &&
                      "bg-zinc-900 border border-zinc-700",
                      spin.color === "green" && "bg-emerald-600",
                    )}
                  >
                    {spin.number}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-semibold font-mono",
                      won ? "text-emerald-400" : "text-muted-foreground",
                    )}
                  >
                    {won
                      ? `+${Number(spin.totalWin).toLocaleString("pl-PL")}`
                      : `-${Number(spin.totalBet).toLocaleString("pl-PL")}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================
          BALANCE SECTION
          ================================================================ */}
      <div className="animate-slide-up" style={{ animationDelay: "240ms" }}>
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm p-6">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[200px] w-[200px] rounded-full bg-primary/[0.04] blur-[80px]" />
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">
                  Current Balance
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-foreground">
                  {formatCurrency(user?.balance ?? 0)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Account active</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================
          ADMIN PANEL — only visible to admins
          ================================================================ */}
      {isAdmin && (
        <div className="animate-slide-up" style={{ animationDelay: "300ms" }}>
          <AdminSeedPanel />
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   SUB-COMPONENTS
   ============================================================================ */

function InfoRow({
  icon,
  label,
  value,
  copyable = false,
  copyValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  copyable?: boolean;
  copyValue?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(copyValue ?? value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between rounded-xl bg-muted/20 border border-border/30 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground shrink-0">
          {icon}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <span className="text-sm font-medium text-foreground truncate">
            {value}
          </span>
        </div>
      </div>

      {copyable && (
        <button
          onClick={handleCopy}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  variant,
}: {
  label: string;
  value: string;
  subtitle?: string;
  variant?: "primary" | "win" | "loss";
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm p-4 space-y-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block">
        {label}
      </span>
      <p
        className={cn(
          "text-base sm:text-lg font-bold font-mono tracking-tight",
          variant === "primary" && "text-foreground",
          variant === "win" && "text-emerald-400",
          variant === "loss" && "text-red-400",
          !variant && "text-foreground",
        )}
      >
        {value}
      </p>
      {subtitle && (
        <span className="text-[10px] text-muted-foreground font-medium">
          {subtitle}
        </span>
      )}
    </div>
  );
}

/* ============================================================================
   HELPERS
   ============================================================================ */

function formatCurrency(value: number): string {
  return (
    value.toLocaleString("pl-PL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " zł"
  );
}
