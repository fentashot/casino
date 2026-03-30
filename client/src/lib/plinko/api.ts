import { api } from "@/lib/api";
import { apiRequest } from "@/lib/api-error";

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
	return apiRequest<PlinkoPlayResult>(
		api.plinko.play.$post({ json: req }),
		"Play failed",
	);
}
