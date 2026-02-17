// Re-eksport z serwera dla klienta

import { getNumberColor } from '@server/lib/roulette/utils';
import { EUROPEAN_WHEEL_SEQUENCE } from '@server/lib/roulette/constants';
import { RouletteNumber } from '@server/lib/roulette';

// Typy
export type {
  BetType,
  RouletteColor,
  ColorChoice,
  ParityChoice,
  RangeChoice,
  ColumnChoice,
  DozenChoice,
  BetChoice,
  RouletteNumber,
  SpinResult,
  Bet,
  StraightBet,
  SplitBet,
  StreetBet,
  CornerBet,
  LineBet,
  ColumnBet,
  DozenBet,
  EvenOddBet,
  RedBlackBet,
  HighLowBet,
  ProvablyFairData,
  BetResult,
  SpinOutcome,
} from '@server/lib/roulette/types';

// Stałe
export {
  EUROPEAN_WHEEL_SEQUENCE,
  RED_NUMBERS,
  COLUMNS,
  DOZENS,
  PAYOUT_MULTIPLIERS,
  POCKET_COUNT,
} from '@server/lib/roulette/constants';

// Funkcje pomocnicze
export {
  isRedNumber,
  getNumberColor,
  isInColumn,
  isInDozen,
  isNumberBetWinner,
  isColumnBetWinner,
  isDozenBetWinner,
  isParityBetWinner,
  isColorBetWinner,
  isRangeBetWinner,
  calculatePotentialWinnings,
  getPayoutOddsString,
  isValidRouletteNumber,
  isValidBetType,
} from '@server/lib/roulette/utils';

// Kolory CSS dla UI
export const ROULETTE_COLORS = {
  red: '#FF013C',
  black: '#1D2224',
  green: '#16A34A',
} as const;

// Funkcje pomocnicze specyficzne dla UI
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

// Generuj losowy client seed dla provably fair
export function generateClientSeed(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Generuj unikalny klucz idempotency dla każdego spin requestu
export function generateIdempotencyKey(): string {
  const timestamp = Date.now().toString(36);
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  const random = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${timestamp}-${random}`;
}
