// Stałe dla European Roulette

import type { BetType, ColumnChoice, DozenChoice, RouletteNumber } from './types';

// Sekwencja kół ruletki europejskiej (fizyczna kolejność na kole)
export const EUROPEAN_WHEEL_SEQUENCE: readonly RouletteNumber[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
  24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
] as const;

// Czerwone numery na kole europejskim
export const RED_NUMBERS: ReadonlySet<number> = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
]);

// Definicje kolumn
export const COLUMNS: Readonly<Record<ColumnChoice, readonly number[]>> = {
  col1: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
  col2: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  col3: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
} as const;

// Zakresy tuzinów
export const DOZENS: Readonly<Record<DozenChoice, { min: number; max: number }>> = {
  '1st12': { min: 1, max: 12 },
  '2nd12': { min: 13, max: 24 },
  '3rd12': { min: 25, max: 36 },
} as const;

// Mnożniki wypłat dla każdego typu zakładu
// Uwaga: To są CAŁKOWITE zwroty (włącznie z oryginalnym zakładem)
export const PAYOUT_MULTIPLIERS: Readonly<Record<BetType, number>> = {
  straight: 36,
  split: 18,
  street: 12,
  corner: 9,
  line: 6,
  column: 3,
  dozen: 3,
  even_odd: 2,
  red_black: 2,
  high_low: 2,
} as const;

// Liczba pól na kole europejskim
export const POCKET_COUNT = 37;
