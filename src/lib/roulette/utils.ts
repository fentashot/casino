// Funkcje pomocnicze dla ruletki

import { RED_NUMBERS, COLUMNS, DOZENS } from './constants';
import type {
  RouletteNumber,
  RouletteColor,
  ColumnChoice,
  DozenChoice,
  ParityChoice,
  RangeChoice,
  ColorChoice,
  BetType,
} from './types';
import { PAYOUT_MULTIPLIERS } from './constants';

// Sprawdza czy numer jest czerwony
export function isRedNumber(num: number): boolean {
  return RED_NUMBERS.has(num);
}

// Zwraca kolor dla numeru
export function getNumberColor(num: number): RouletteColor {
  if (num === 0) return 'green';
  return RED_NUMBERS.has(num) ? 'red' : 'black';
}

// Sprawdza czy numer jest w kolumnie
export function isInColumn(num: number, column: ColumnChoice): boolean {
  if (num === 0) return false;
  return COLUMNS[column].includes(num);
}

// Sprawdza czy numer jest w tuzinie
export function isInDozen(num: number, dozen: DozenChoice): boolean {
  if (num === 0) return false;
  const { min, max } = DOZENS[dozen];
  return num >= min && num <= max;
}

// Sprawdza czy zakład na numery wygrał
export function isNumberBetWinner(numbers: readonly number[], resultNumber: number): boolean {
  return numbers.includes(resultNumber);
}

// Sprawdza czy zakład na kolumnę wygrał
export function isColumnBetWinner(choice: ColumnChoice, resultNumber: number): boolean {
  if (resultNumber === 0) return false;
  return COLUMNS[choice].includes(resultNumber);
}

// Sprawdza czy zakład na tuzin wygrał
export function isDozenBetWinner(choice: DozenChoice, resultNumber: number): boolean {
  if (resultNumber === 0) return false;
  const { min, max } = DOZENS[choice];
  return resultNumber >= min && resultNumber <= max;
}

// Sprawdza czy zakład na parzystość wygrał
export function isParityBetWinner(choice: ParityChoice, resultNumber: number): boolean {
  if (resultNumber === 0) return false;
  const isEven = resultNumber % 2 === 0;
  return choice === 'even' ? isEven : !isEven;
}

// Sprawdza czy zakład na kolor wygrał
export function isColorBetWinner(chosenColor: ColorChoice, resultColor: RouletteColor): boolean {
  return chosenColor === resultColor;
}

// Sprawdza czy zakład na zakres wygrał
export function isRangeBetWinner(choice: RangeChoice, resultNumber: number): boolean {
  if (resultNumber === 0) return false;
  return choice === 'low'
    ? resultNumber >= 1 && resultNumber <= 18
    : resultNumber >= 19 && resultNumber <= 36;
}

// Oblicza potencjalne wygrane dla zakładu
export function calculatePotentialWinnings(betType: BetType, amount: number): number {
  return amount * PAYOUT_MULTIPLIERS[betType];
}

// Zwraca string z kursami wypłat (np. "35:1")
export function getPayoutOddsString(betType: BetType): string {
  const multiplier = PAYOUT_MULTIPLIERS[betType];
  return `${multiplier - 1}:1`;
}

// Type guard - sprawdza czy numer jest prawidłowym numerem ruletki
export function isValidRouletteNumber(num: number): num is RouletteNumber {
  return Number.isInteger(num) && num >= 0 && num <= 36;
}

// Type guard - sprawdza czy typ zakładu jest prawidłowy
export function isValidBetType(type: string): type is BetType {
  return [
    'straight', 'split', 'street', 'corner', 'line',
    'column', 'dozen', 'even_odd', 'red_black', 'high_low'
  ].includes(type);
}
