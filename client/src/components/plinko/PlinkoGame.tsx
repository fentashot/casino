import { useRef, useEffect, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { playPlinko, type Difficulty } from "@/lib/plinko/api";
import { getMultipliers, getBucketColor } from "@/lib/plinko/multipliers";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "expert", label: "Expert" },
];

const ROWS_OPTIONS = [8, 9, 10, 11, 12, 13, 14, 15, 16];

interface PlinkoGameProps {
  initialBalance: number;
}

export function PlinkoGame({ initialBalance }: PlinkoGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const pendingResultRef = useRef<{ multiplier: number; win: number; bucket: number } | null>(null);
  const queryClient = useQueryClient();

  const [bet, setBet] = useState(100);
  const [rows, setRows] = useState(16);
  const [difficulty, setDifficulty] = useState<Difficulty>("expert");
  const [isPlaying, setIsPlaying] = useState(false);
  const [balance, setBalance] = useState(initialBalance);
  const [lastResult, setLastResult] = useState<{
    multiplier: number;
    win: number;
    bucket: number;
  } | null>(null);
  const [activeBucketIdx, setActiveBucketIdx] = useState<number | null>(null);
  const [ballPath, setBallPath] = useState<number[] | null>(null);
  const [ballStep, setBallStep] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const multipliers = getMultipliers(rows, difficulty);

  // Canvas drawing
  const drawBoard = useCallback(
    (highlightBucket: number | null = null, ballPos?: { x: number; y: number } | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const W = canvas.width;
      const H = canvas.height;
      const bucketBarH = 36;
      const boardH = H - bucketBarH - 8;

      ctx.clearRect(0, 0, W, H);

      const pegRows = rows;
      const pegSpacingY = boardH / (pegRows + 1);
      // Top row starts with 3 pegs; bottom row has rows+2 pegs
      const maxPegsInRow = pegRows + 2;
      const pegSpacingX = W / (maxPegsInRow + 1);
      const pegR = Math.max(3, Math.min(6, pegSpacingX * 0.12));

      // Draw pegs — row 0 starts with 3 pegs
      for (let row = 0; row < pegRows; row++) {
        const pegsInRow = row + 3;
        const rowWidth = (pegsInRow - 1) * pegSpacingX;
        const startX = (W - rowWidth) / 2;
        const y = pegSpacingY * (row + 1);

        for (let col = 0; col < pegsInRow; col++) {
          const x = startX + col * pegSpacingX;
          ctx.beginPath();
          ctx.arc(x, y, pegR, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.82)";
          ctx.fill();
        }
      }

      // Bucket bar: bottom row has (rows+2) pegs, giving (rows+1) buckets between them.
      // Bucket i center = midpoint between peg i and peg i+1 of bottom row.
      // Bottom row: pegsInRow = rows+2, rowWidth = (rows+1)*pegSpacingX
      // lastRowStartX = (W - (rows+1)*pegSpacingX) / 2
      // Bucket i center = lastRowStartX + (i + 0.5) * pegSpacingX
      const bucketCount = rows + 1;
      const lastRowWidth = (rows + 1) * pegSpacingX;
      const lastRowStartX = (W - lastRowWidth) / 2;
      const bW = pegSpacingX;
      const byPos = H - bucketBarH;

      for (let i = 0; i < bucketCount; i++) {
        const m = multipliers[i] ?? 0;
        const color = getBucketColor(m);
        const isHighlighted = highlightBucket === i;
        const bucketCenterX = lastRowStartX + (i + 0.5) * pegSpacingX;
        const bx = bucketCenterX - bW / 2;

        ctx.fillStyle = isHighlighted ? "#fff" : color;
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.lineWidth = 1;
        const pad = 2;
        roundRect(ctx, bx + pad, byPos + pad, bW - pad * 2, bucketBarH - pad * 2, 5);
        ctx.fill();
        ctx.stroke();

        // Label
        ctx.fillStyle = isHighlighted ? color : "rgba(0,0,0,0.85)";
        ctx.font = `bold ${Math.max(8, Math.min(11, bW * 0.28))}px 'JetBrains Mono', monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const label =
          m >= 10000 ? "10K" :
          m >= 1000 ? "1K" :
          m >= 100 ? `${Math.round(m)}` :
          `${m}`;
        ctx.fillText(label, bucketCenterX, byPos + bucketBarH / 2);
      }

      // Draw ball
      if (ballPos) {
        ctx.beginPath();
        ctx.arc(ballPos.x, ballPos.y, pegR * 1.3, 0, Math.PI * 2);
        ctx.fillStyle = "#10b981";
        ctx.shadowColor = "#10b981";
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    },
    [rows, multipliers],
  );

  // Initial draw
  useEffect(() => {
    drawBoard(activeBucketIdx, null);
  }, [drawBoard, activeBucketIdx]);

  // Ball animation — rAF smooth interpolation between peg waypoints
  useEffect(() => {
    if (!ballPath) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = canvas.width;
    const H = canvas.height;
    const bucketBarH = 36;
    const boardH = H - bucketBarH - 8;
    const pegSpacingY = boardH / (rows + 1);
    const pegSpacingX = W / (rows + 3);

    // Build waypoints: one per row hit, starting above the board
    // At row `r` (0-indexed), the ball is at peg index (rights+1) after `r+1` decisions
    const waypoints: { x: number; y: number }[] = [];

    // Entry point — above top row
    waypoints.push({ x: W / 2, y: pegSpacingY * 0.3 });

    let rights = 0;
    for (let r = 0; r < ballPath.length; r++) {
      if (ballPath[r] === 1) rights++;
      // Row r has (r+3) pegs. After r+1 decisions the ball is in gap between
      // peg `rights` and peg `rights+1` of this row.
      const pegsInRow = r + 3;
      const rowWidth = (pegsInRow - 1) * pegSpacingX;
      const startX = (W - rowWidth) / 2;
      const x = startX + (rights + 0.5) * pegSpacingX;
      const y = pegSpacingY * (r + 1.3);
      waypoints.push({ x, y });
    }

    // Final landing — center of the correct bucket
    // Bottom row has (rows+2) pegs; bucket `rights` center = lastRowStartX + (rights+0.5)*pegSpacingX
    const lastRowWidth2 = (rows + 1) * pegSpacingX;
    const lastRowStartX2 = (W - lastRowWidth2) / 2;
    const bucketCenterX = lastRowStartX2 + (rights + 0.5) * pegSpacingX;
    waypoints.push({ x: bucketCenterX, y: H - bucketBarH - 6 });

    // ms per segment — slightly slower near top, uniform thereafter
    const MS_PER_SEG = 90;
    const totalDuration = waypoints.length * MS_PER_SEG;

    let startTime: number | null = null;
    let rafId: number;

    const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    const animate = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;
      const globalT = Math.min(elapsed / totalDuration, 1);

      // Which segment are we in?
      const segCount = waypoints.length - 1;
      const rawSeg = globalT * segCount;
      const segIdx = Math.min(Math.floor(rawSeg), segCount - 1);
      const segT = rawSeg - segIdx;
      const easedT = easeInOut(segT);

      const p0 = waypoints[segIdx];
      const p1 = waypoints[segIdx + 1];

      // Horizontal: lerp
      const bx = p0.x + (p1.x - p0.x) * easedT;

      // Vertical: parabolic arc — ball arcs up slightly then falls toward next peg
      // t=0: at p0.y, t=0.5: slight rise, t=1: at p1.y
      const arcHeight = pegSpacingY * 0.25;
      const linearY = p0.y + (p1.y - p0.y) * easedT;
      const by = linearY - arcHeight * Math.sin(Math.PI * easedT);

      drawBoard(null, { x: bx, y: by });

      if (globalT < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        // Animation done — show result
        const result = pendingResultRef.current;
        if (result) {
          setLastResult(result);
          setActiveBucketIdx(result.bucket);
          drawBoard(result.bucket, null);
          setShowResult(true);
        }
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ballPath]);

  const handlePlay = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    setLastResult(null);
    setShowResult(false);
    setActiveBucketIdx(null);
    setBallPath(null);
    setBallStep(0);
    pendingResultRef.current = null;

    try {
      const result = await playPlinko({ bet, rows, difficulty });
      setBalance(result.balance);
      queryClient.setQueryData(["casino-balance"], { balance: result.balance });

      // Store result — shown after animation finishes
      pendingResultRef.current = {
        multiplier: result.multiplier,
        win: result.win,
        bucket: result.finalBucket,
      };

      // Start animation
      setBallPath(result.path);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsPlaying(false);
    }
  };

  const isAnimating = ballPath !== null && !showResult;
  const canPlay = !isPlaying && !isAnimating && bet > 0 && bet <= balance;

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start">
      {/* Controls panel */}
      <div className="w-full lg:w-64 shrink-0 space-y-4">
        {/* Bet Amount */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Bet Amount
            </span>
            <span className="text-xs font-mono text-muted-foreground">
              {balance.toLocaleString("pl-PL")} PLN
            </span>
          </div>

          <input
            type="number"
            min={1}
            max={balance}
            value={bet}
            onChange={(e) => setBet(Math.max(1, Number(e.target.value)))}
            className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs font-semibold"
              onClick={() => setBet(Math.max(1, Math.floor(bet / 2)))}
            >
              &frac12;
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs font-semibold"
              onClick={() => setBet(Math.min(balance, bet * 2))}
            >
              2&times;
            </Button>
          </div>
        </div>

        {/* Difficulty */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            Difficulty
          </span>
          <div className="relative">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="w-full appearance-none rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary pr-8"
            >
              {DIFFICULTY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Rows */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            Rows
          </span>
          <div className="relative">
            <select
              value={rows}
              onChange={(e) => {
                setRows(Number(e.target.value));
                setActiveBucketIdx(null);
                setBallPath(null);
                setBallStep(0);
                setLastResult(null);
                setShowResult(false);
              }}
              className="w-full appearance-none rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary pr-8"
            >
              {ROWS_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Bet button */}
        <Button
          className="w-full h-11 text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
          disabled={!canPlay}
          onClick={handlePlay}
        >
          {isPlaying || isAnimating ? "Dropping..." : "Bet"}
        </Button>

        {/* Last result */}
        {lastResult && showResult && (
          <div
            className={cn(
              "rounded-xl border p-3 text-center animate-number-pop",
              lastResult.win > bet
                ? "border-emerald-500/30 bg-emerald-500/5"
                : lastResult.win === 0
                  ? "border-red-500/20 bg-red-500/5"
                  : "border-border bg-card",
            )}
          >
            <div className="text-xs text-muted-foreground mb-0.5">Result</div>
            <div
              className={cn(
                "text-xl font-bold font-mono",
                lastResult.win > bet ? "text-emerald-400" : lastResult.win === 0 ? "text-red-400" : "text-foreground",
              )}
            >
              {lastResult.multiplier}&times;
            </div>
            <div className="text-xs font-mono text-muted-foreground">
              {lastResult.win > 0 ? `+${lastResult.win.toLocaleString("pl-PL")}` : `-${bet.toLocaleString("pl-PL")}`} PLN
            </div>
          </div>
        )}
      </div>

      {/* Board */}
      <div className="flex-1 w-full rounded-2xl border border-border bg-card p-2 sm:p-4 flex items-center justify-center min-h-[420px]">
        <canvas
          ref={canvasRef}
          width={680}
          height={480}
          className="w-full max-w-[680px] h-auto"
          style={{ imageRendering: "crisp-edges" }}
        />
      </div>
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
