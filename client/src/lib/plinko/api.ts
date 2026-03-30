import { api, apiRequest } from "@/lib/api";

export type Difficulty = "low" | "medium" | "high" | "expert";

export interface PlinkoPlayRequest {
	bet: number;
	rows: number;
	difficulty: Difficulty;
	idempotencyKey: string;
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
	return apiRequest<PlinkoPlayResult>(
		api.plinko.play.$post({ json: req }),
		"Play failed",
	);
}
