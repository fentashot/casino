// RouletteEngine - główna logika gry jako obiekt

import * as crypto from 'crypto';
import { EUROPEAN_WHEEL_SEQUENCE, PAYOUT_MULTIPLIERS, POCKET_COUNT, COLUMNS, DOZENS } from './constants';
import {
  isNumberBetWinner,
  isColumnBetWinner,
  isDozenBetWinner,
  isParityBetWinner,
  isColorBetWinner,
  isRangeBetWinner,
  getNumberColor,
} from './utils';
import type {
  Bet,
  BetResult,
  BetType,
  ColumnChoice,
  DozenChoice,
  ProvablyFairData,
  RouletteColor,
  RouletteNumber,
  SpinOutcome,
  SpinResult,
} from './types';

// Oblicza HMAC-SHA256 dla weryfikacji provably fair
function computeHmac(data: ProvablyFairData): string {
  const hmac = crypto.createHmac('sha256', Buffer.from(data.serverSeedHex, 'hex'));
  hmac.update(`${data.clientSeed}:${data.nonce}`);
  return hmac.digest('hex');
}

// Konwertuje hash na numer ruletki (0-36)
function hashToRouletteNumber(hashHex: string): RouletteNumber {
  const value = parseInt(hashHex.substring(0, 8), 16);
  return (value % POCKET_COUNT) as RouletteNumber;
}

// Tworzy wynik obrotu z numeru
function createSpinResult(number: RouletteNumber): SpinResult {
  return {
    number,
    color: getNumberColor(number),
  };
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

// Oblicza wygrane dla zakładu
function calculateBetWinnings(bet: Bet, result: SpinResult): number {
  return isBetWinner(bet, result) ? bet.amount * PAYOUT_MULTIPLIERS[bet.type] : 0;
}

// Ewaluuje pojedynczy zakład
function evaluateBet(bet: Bet, result: SpinResult): BetResult {
  const winnings = calculateBetWinnings(bet, result);
  return {
    bet,
    winnings,
    isWinner: winnings > 0,
  };
}

// Walidacja kwoty zakładu
function assertPositiveAmount(amount: number): void {
  if (amount <= 0) {
    throw new Error('Bet amount must be a positive number');
  }
  if (!Number.isInteger(amount)) {
    throw new Error('Bet amount must be an integer');
  }
}

// Walidacja numerów zakładu
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

// Walidacja wyboru zakładu
function assertValidChoice<T>(choice: T, validOptions: readonly T[]): void {
  if (!validOptions.includes(choice)) {
    throw new Error(`Invalid choice: ${choice}. Valid options: ${validOptions.join(', ')}`);
  }
}

// Główny obiekt RouletteEngine
export const RouletteEngine = {
  // Wykonuje kompletny obrót z podanymi zakładami
  spin(bets: readonly Bet[], provablyFair: ProvablyFairData): SpinOutcome {
    const hmac = computeHmac(provablyFair);
    const spinNumber = hashToRouletteNumber(hmac);
    const result = createSpinResult(spinNumber);

    const betResults = bets.map(bet => evaluateBet(bet, result));
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

  // Zwraca kolor numeru ruletki
  getColor(number: RouletteNumber): RouletteColor {
    return getNumberColor(number);
  },

  // Waliduje strukturę zakładu
  validateBet(bet: Bet): boolean {
    assertPositiveAmount(bet.amount);

    switch (bet.type) {
      case 'straight':
        assertValidNumbers(bet.numbers, 1);
        break;
      case 'split':
        assertValidNumbers(bet.numbers, 2);
        break;
      case 'street':
        assertValidNumbers(bet.numbers, 3);
        break;
      case 'corner':
        assertValidNumbers(bet.numbers, 4);
        break;
      case 'line':
        assertValidNumbers(bet.numbers, 6);
        break;
      case 'column':
        assertValidChoice(bet.choice, ['col1', 'col2', 'col3'] as const);
        break;
      case 'dozen':
        assertValidChoice(bet.choice, ['1st12', '2nd12', '3rd12'] as const);
        break;
      case 'even_odd':
        assertValidChoice(bet.choice, ['even', 'odd'] as const);
        break;
      case 'red_black':
        assertValidChoice(bet.color, ['red', 'black'] as const);
        break;
      case 'high_low':
        assertValidChoice(bet.choice, ['low', 'high'] as const);
        break;
    }

    return true;
  },

  // Zwraca mnożnik wypłat dla typu zakładu
  getPayoutMultiplier(type: BetType): number {
    return PAYOUT_MULTIPLIERS[type];
  },

  // Oblicza potencjalne wygrane
  calculatePotentialWinnings(bet: Bet): number {
    return bet.amount * PAYOUT_MULTIPLIERS[bet.type];
  },

  // Zwraca numery dla kolumny
  getColumnNumbers(column: ColumnChoice): readonly number[] {
    return COLUMNS[column];
  },

  // Zwraca zakres dla tuzina
  getDozenRange(dozen: DozenChoice): { min: number; max: number } {
    return DOZENS[dozen];
  },

  // Zwraca sekwencję kół (do renderowania UI)
  getWheelSequence(): readonly RouletteNumber[] {
    return EUROPEAN_WHEEL_SEQUENCE;
  },
} as const;

// Typ dla RouletteEngine
export type RouletteEngineType = typeof RouletteEngine;

export default RouletteEngine;
