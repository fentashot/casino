// RouletteEngine — flattened implementation (constants + utils + engine in one file)

import * as crypto from "crypto";
import type {
  BetType,
  RouletteColor,
  ColorChoice,
  ParityChoice,
  RangeChoice,
  ColumnChoice,
  DozenChoice,
  RouletteNumber,
  SpinResult,
  Bet,
  BetResult,
  ProvablyFairData,
  SpinOutcome,
} from "./types";

/* ============================================================================
   Constants
   ============================================================================ */

export const EUROPEAN_WHEEL_SEQUENCE: readonly RouletteNumber[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
  24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const;

export const RED_NUMBERS: ReadonlySet<number> = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export const COLUMNS: Readonly<Record<ColumnChoice, readonly number[]>> = {
  col1: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
  col2: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  col3: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
} as const;

export const DOZENS: Readonly<Record<DozenChoice, { min: number; max: number }>> = {
  "1st12": { min: 1, max: 12 },
  "2nd12": { min: 13, max: 24 },
  "3rd12": { min: 25, max: 36 },
} as const;

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

export const POCKET_COUNT = 37;

/* ============================================================================
   Utils
   ============================================================================ */

export function isRedNumber(num: number): boolean {
  return RED_NUMBERS.has(num);
}

export function getNumberColor(num: number): RouletteColor {
  if (num === 0) return "green";
  return RED_NUMBERS.has(num) ? "red" : "black";
}

export function isInColumn(num: number, column: ColumnChoice): boolean {
  if (num === 0) return false;
  return COLUMNS[column].includes(num);
}

export function isInDozen(num: number, dozen: DozenChoice): boolean {
  if (num === 0) return false;
  const { min, max } = DOZENS[dozen];
  return num >= min && num <= max;
}

export function isNumberBetWinner(
  numbers: readonly number[],
  resultNumber: number,
): boolean {
  return numbers.includes(resultNumber);
}

export function isColumnBetWinner(
  choice: ColumnChoice,
  resultNumber: number,
): boolean {
  if (resultNumber === 0) return false;
  return COLUMNS[choice].includes(resultNumber);
}

export function isDozenBetWinner(
  choice: DozenChoice,
  resultNumber: number,
): boolean {
  if (resultNumber === 0) return false;
  const { min, max } = DOZENS[choice];
  return resultNumber >= min && resultNumber <= max;
}

export function isParityBetWinner(
  choice: ParityChoice,
  resultNumber: number,
): boolean {
  if (resultNumber === 0) return false;
  const isEven = resultNumber % 2 === 0;
  return choice === "even" ? isEven : !isEven;
}

export function isColorBetWinner(
  chosenColor: ColorChoice,
  resultColor: RouletteColor,
): boolean {
  return chosenColor === resultColor;
}

export function isRangeBetWinner(
  choice: RangeChoice,
  resultNumber: number,
): boolean {
  if (resultNumber === 0) return false;
  return choice === "low"
    ? resultNumber >= 1 && resultNumber <= 18
    : resultNumber >= 19 && resultNumber <= 36;
}

export function calculatePotentialWinnings(betType: BetType, amount: number): number {
  return amount * PAYOUT_MULTIPLIERS[betType];
}

export function getPayoutOddsString(betType: BetType): string {
  const multiplier = PAYOUT_MULTIPLIERS[betType];
  return `${multiplier - 1}:1`;
}

export function isValidRouletteNumber(num: number): num is RouletteNumber {
  return Number.isInteger(num) && num >= 0 && num <= 36;
}

export function isValidBetType(type: string): type is BetType {
  return [
    "straight",
    "split",
    "street",
    "corner",
    "line",
    "column",
    "dozen",
    "even_odd",
    "red_black",
    "high_low",
  ].includes(type);
}

/* ============================================================================
   Engine (private helpers)
   ============================================================================ */

function computeHmacEngine(data: ProvablyFairData): string {
  const hmac = crypto.createHmac("sha256", Buffer.from(data.serverSeedHex, "hex"));
  hmac.update(`${data.clientSeed}:${data.nonce}`);
  return hmac.digest("hex");
}

function hashToRouletteNumber(hashHex: string): RouletteNumber {
  const value = parseInt(hashHex.substring(0, 8), 16);
  return (value % POCKET_COUNT) as RouletteNumber;
}

function createSpinResult(number: RouletteNumber): SpinResult {
  return {
    number,
    color: getNumberColor(number),
  };
}

function isBetWinner(bet: Bet, result: SpinResult): boolean {
  switch (bet.type) {
    case "straight":
    case "split":
    case "street":
    case "corner":
    case "line":
      return isNumberBetWinner(bet.numbers as readonly number[], result.number);
    case "column":
      return isColumnBetWinner(bet.choice, result.number);
    case "dozen":
      return isDozenBetWinner(bet.choice, result.number);
    case "even_odd":
      return isParityBetWinner(bet.choice, result.number);
    case "red_black":
      return isColorBetWinner(bet.color, result.color);
    case "high_low":
      return isRangeBetWinner(bet.choice, result.number);
  }
}

function calculateBetWinnings(bet: Bet, result: SpinResult): number {
  return isBetWinner(bet, result) ? bet.amount * PAYOUT_MULTIPLIERS[bet.type] : 0;
}

function evaluateBet(bet: Bet, result: SpinResult): BetResult {
  const winnings = calculateBetWinnings(bet, result);
  return {
    bet,
    winnings,
    isWinner: winnings > 0,
  };
}

function assertPositiveAmount(amount: number): void {
  if (amount <= 0) {
    throw new Error("Bet amount must be a positive number");
  }
  if (!Number.isInteger(amount)) {
    throw new Error("Bet amount must be an integer");
  }
}

function assertValidNumbers(numbers: readonly number[], expectedCount: number): void {
  if (numbers.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} numbers, got ${numbers.length}`);
  }
  for (const num of numbers) {
    if (num < 0 || num > 36 || !Number.isInteger(num)) {
      throw new Error(`Invalid roulette number: ${num}`);
    }
  }
}

function assertValidChoice<T>(choice: T, validOptions: readonly T[]): void {
  if (!validOptions.includes(choice)) {
    throw new Error(
      `Invalid choice: ${choice}. Valid options: ${validOptions.join(", ")}`,
    );
  }
}

/* ============================================================================
   RouletteEngine (exported)
   ============================================================================ */

export const RouletteEngine = {
  spin(bets: readonly Bet[], provablyFair: ProvablyFairData): SpinOutcome {
    const hmac = computeHmacEngine(provablyFair);
    const spinNumber = hashToRouletteNumber(hmac);
    const result = createSpinResult(spinNumber);

    const betResults = bets.map((bet) => evaluateBet(bet, result));
    const totalBet = bets.reduce((sum, bet) => sum + bet.amount, 0);
    const totalWin = betResults.reduce((sum, r) => sum + r.winnings, 0);

    return {
      result,
      bets: betResults,
      totalBet,
      totalWin,
      hmac,
    };
  },

  getColor(number: RouletteNumber): RouletteColor {
    return getNumberColor(number);
  },

  validateBet(bet: Bet): boolean {
    assertPositiveAmount(bet.amount);

    switch (bet.type) {
      case "straight":
        assertValidNumbers(bet.numbers, 1);
        break;
      case "split":
        assertValidNumbers(bet.numbers, 2);
        break;
      case "street":
        assertValidNumbers(bet.numbers, 3);
        break;
      case "corner":
        assertValidNumbers(bet.numbers, 4);
        break;
      case "line":
        assertValidNumbers(bet.numbers, 6);
        break;
      case "column":
        assertValidChoice(bet.choice, ["col1", "col2", "col3"] as const);
        break;
      case "dozen":
        assertValidChoice(bet.choice, ["1st12", "2nd12", "3rd12"] as const);
        break;
      case "even_odd":
        assertValidChoice(bet.choice, ["even", "odd"] as const);
        break;
      case "red_black":
        assertValidChoice(bet.color, ["red", "black"] as const);
        break;
      case "high_low":
        assertValidChoice(bet.choice, ["low", "high"] as const);
        break;
    }

    return true;
  },

  getPayoutMultiplier(type: BetType): number {
    return PAYOUT_MULTIPLIERS[type];
  },

  calculatePotentialWinnings(bet: Bet): number {
    return bet.amount * PAYOUT_MULTIPLIERS[bet.type];
  },

  getColumnNumbers(column: ColumnChoice): readonly number[] {
    return COLUMNS[column];
  },

  getDozenRange(dozen: DozenChoice): { min: number; max: number } {
    return DOZENS[dozen];
  },

  getWheelSequence(): readonly RouletteNumber[] {
    return EUROPEAN_WHEEL_SEQUENCE;
  },
} as const;

export type RouletteEngineType = typeof RouletteEngine;

export default RouletteEngine;
