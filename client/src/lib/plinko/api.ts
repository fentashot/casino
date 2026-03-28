const BASE = "/api/plinko";

export type Difficulty = "low" | "medium" | "high" | "expert";

export interface PlinkoPlayRequest {
  bet: number;
  rows: number;
  difficulty: Difficulty;
}

export interface PlinkoPlayResult {
  path: number[];
  finalBucket: number;
  multiplier: number;
  win: number;
  balance: number;
}

export async function playPlinko(req: PlinkoPlayRequest): Promise<PlinkoPlayResult> {
  const res = await fetch(`${BASE}/play`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? "Play failed");
  }
  return res.json();
}
