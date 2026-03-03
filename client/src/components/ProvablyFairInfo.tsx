import { SpinResponse } from "@server/types";
import { cn } from "@/lib/utils";
import { Copy, Check, ShieldCheck } from "lucide-react";
import { useState } from "react";

type Props = {
  spinData: SpinResponse | null;
};

/**
 * Provably Fair verification panel
 * Displays cryptographic proof data for the last spin
 */
export function ProvablyFairInfo({ spinData }: Props) {
  if (!spinData) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/30 border border-border/30">
          <ShieldCheck className="h-6 w-6 text-muted-foreground/40" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-muted-foreground/60">
            No data yet
          </p>
          <p className="text-xs text-muted-foreground/40">
            Place a bet to see provably fair verification
          </p>
        </div>
      </div>
    );
  }

  const profit = spinData.totalWin - spinData.totalBet;
  const isWin = spinData.totalWin > 0;

  return (
    <div className="space-y-4">
      {/* Result summary */}
      <div className="flex items-center justify-between rounded-xl bg-muted/20 border border-border/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white",
              spinData.result.color === "red" && "bg-red-600",
              spinData.result.color === "black" &&
                "bg-zinc-900 border border-zinc-700",
              spinData.result.color === "green" && "bg-emerald-600",
            )}
          >
            {spinData.result.number}
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground capitalize">
              {spinData.result.color} · #{spinData.result.number}
            </span>
            <span
              className={cn(
                "text-sm font-bold font-mono",
                isWin ? "text-emerald-400" : "text-red-400",
              )}
            >
              {isWin ? "+" : ""}
              {profit.toLocaleString("pl-PL")} zł
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end text-right">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Bet
          </span>
          <span className="text-xs font-semibold font-mono text-foreground">
            {spinData.totalBet.toLocaleString("pl-PL")} zł
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border/30" />

      {/* Cryptographic data */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Verification Data
        </p>

        <CryptoRow
          label="Client Seed"
          value={spinData.provablyFair.clientSeed}
          copyable
        />
        <CryptoRow
          label="Server Seed Hash"
          value={spinData.provablyFair.serverSeedHash}
          copyable
        />
        <CryptoRow label="HMAC" value={spinData.provablyFair.hmac} copyable />
        <CryptoRow label="Nonce" value={String(spinData.provablyFair.nonce)} />
      </div>

      {/* Verification note */}
      <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2.5">
        <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Each spin result is determined by a SHA-256 HMAC of the server seed,
          client seed, and nonce. The server seed hash is published before the
          game, and the actual seed is revealed after rotation for independent
          verification.
        </p>
      </div>
    </div>
  );
}

/* ============================================================================
   SUB-COMPONENTS
   ============================================================================ */

function CryptoRow({
  label,
  value,
  copyable = false,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Truncate long values for display
  const displayValue =
    value.length > 32 ? `${value.slice(0, 16)}...${value.slice(-8)}` : value;

  return (
    <div className="flex items-center justify-between gap-3 group">
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">
          {label}
        </span>
        <span
          className="text-xs font-mono text-foreground/80 truncate"
          title={value}
        >
          {displayValue}
        </span>
      </div>

      {copyable && (
        <button
          onClick={handleCopy}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors opacity-0 group-hover:opacity-100"
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="h-3 w-3 text-emerald-400" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </button>
      )}
    </div>
  );
}
