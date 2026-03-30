import {
	EUROPEAN_WHEEL_SEQUENCE,
	getNumberColor,
} from "@server/games/roulette/engine";
import { type RouletteNumber } from "@server/games/roulette/types";

export const ROULETTE_COLORS = {
	red: "#FF013C",
	black: "#1D2224",
	green: "#16A34A",
} as const;

export function getNumberColorHex(num: RouletteNumber): string {
	const color = getNumberColor(num);
	return ROULETTE_COLORS[color];
}

export function getWheelIndex(num: RouletteNumber): number {
	return EUROPEAN_WHEEL_SEQUENCE.indexOf(num);
}

export function getNumberAtWheelIndex(index: number): RouletteNumber {
	const normalizedIndex = ((index % 37) + 37) % 37;
	return EUROPEAN_WHEEL_SEQUENCE[normalizedIndex];
}

export function generateClientSeed(): string {
	const array = new Uint8Array(16);
	crypto.getRandomValues(array);
	return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
		"",
	);
}

export function generateIdempotencyKey(): string {
	const timestamp = Date.now().toString(36);
	const array = new Uint8Array(12);
	crypto.getRandomValues(array);
	const random = Array.from(array, (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");
	return `${timestamp}-${random}`;
}
