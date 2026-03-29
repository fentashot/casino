import { api } from "@/lib/api";

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

export async function playPlinko(
	req: PlinkoPlayRequest,
): Promise<PlinkoPlayResult> {
	const res = await api.plinko.play.$post({ json: req });
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error((err as { error?: string }).error ?? "Play failed");
	}
	return res.json() as Promise<PlinkoPlayResult>;
}
