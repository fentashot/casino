// Casino Helpers - Bridge między API a RouletteEngine

import { z } from "zod";
import { betSchema } from "../zodTypes";
import {
  RouletteEngine,
  isRedNumber,
  PAYOUT_MULTIPLIERS,
  isNumberBetWinner,
  isColumnBetWinner,
  isDozenBetWinner,
  isParityBetWinner,
  isColorBetWinner,
  isRangeBetWinner,
  type Bet,
  type SpinResult,
  type ProvablyFairData,
  type SpinOutcome,
  type RouletteNumber
} from "./roulette";

// Re-export dla bezpośredniego użycia
export {
  RouletteEngine,
  isRedNumber,
  type Bet,
  type SpinResult,
  type ProvablyFairData,
  type SpinOutcome
};

// @deprecated Użyj isRedNumber() zamiast tego
export const redNumbers = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

// @deprecated Użyj RouletteEngine.getPayoutMultiplier() zamiast tego
export const payoutTable = PAYOUT_MULTIPLIERS;

// Oblicza wygrane dla zakładu (wrapper dla kompatybilności)
export function calculateWinnings(
  bet: z.infer<typeof betSchema>,
  result: { number: number; color: string }
): number {
  const engineBet = convertLegacyBet(bet);
  const spinResult: SpinResult = {
    number: result.number as RouletteNumber,
    color: result.color as SpinResult['color'],
  };

  if (isBetWinner(engineBet, spinResult)) {
    return bet.amount * PAYOUT_MULTIPLIERS[bet.type];
  }
  return 0;
}

// Oblicza HMAC dla weryfikacji provably fair
export function computeHmac(serverSeedHex: string, clientSeed: string, nonce: number): string {
  const data: ProvablyFairData = { serverSeedHex, clientSeed, nonce };
  const outcome = RouletteEngine.spin([], data);
  return outcome.hmac;
}

// Konwertuje hash na numer ruletki (0-36)
export function hashToNumber(hashHex: string): number {
  const val = parseInt(hashHex.substring(0, 8), 16);
  return val % 37;
}

// Obrót koła z użyciem RouletteEngine
export function spinWheel(
  bets: z.infer<typeof betSchema>[],
  provablyFair: ProvablyFairData
): SpinOutcome {
  const engineBets = bets.map(convertLegacyBet);
  return RouletteEngine.spin(engineBets, provablyFair);
}

// Konwertuje stary format zakładu na nowy typowany format
function convertLegacyBet(legacyBet: z.infer<typeof betSchema>): Bet {
  const { type, numbers, amount, color, choice } = legacyBet;

  switch (type) {
    case 'straight':
      return { type, numbers: [numbers[0] as RouletteNumber] as const, amount };
    case 'split':
      return { type, numbers: [numbers[0] as RouletteNumber, numbers[1] as RouletteNumber] as const, amount };
    case 'street':
      return { type, numbers: [numbers[0] as RouletteNumber, numbers[1] as RouletteNumber, numbers[2] as RouletteNumber] as const, amount };
    case 'corner':
      return { type, numbers: [numbers[0] as RouletteNumber, numbers[1] as RouletteNumber, numbers[2] as RouletteNumber, numbers[3] as RouletteNumber] as const, amount };
    case 'line':
      return { type, numbers: numbers as readonly RouletteNumber[], amount };
    case 'column':
      return { type, choice: choice as 'col1' | 'col2' | 'col3', amount };
    case 'dozen':
      return { type, choice: choice as '1st12' | '2nd12' | '3rd12', amount };
    case 'even_odd':
      return { type, choice: choice as 'even' | 'odd', amount };
    case 'red_black':
      return { type, color: color as 'red' | 'black', amount };
    case 'high_low':
      return { type, choice: choice as 'low' | 'high', amount };
  }
}

// Sprawdza czy zakład wygrał
function isBetWinner(bet: Bet, result: SpinResult): boolean {
  switch (bet.type) {
    case 'straight':
    case 'split':
    case 'street':
    case 'corner':
    case 'line':
      return isNumberBetWinner(bet.numbers as readonly number[], result.number);
    case 'column':
      return isColumnBetWinner(bet.choice, result.number);
    case 'dozen':
      return isDozenBetWinner(bet.choice, result.number);
    case 'even_odd':
      return isParityBetWinner(bet.choice, result.number);
    case 'red_black':
      return isColorBetWinner(bet.color, result.color);
    case 'high_low':
      return isRangeBetWinner(bet.choice, result.number);
  }
}
