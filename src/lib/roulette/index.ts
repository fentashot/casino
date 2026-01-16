// Główny punkt eksportu dla modułu roulette

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
} from './types';

// Stałe
export {
  EUROPEAN_WHEEL_SEQUENCE,
  RED_NUMBERS,
  COLUMNS,
  DOZENS,
  PAYOUT_MULTIPLIERS,
  POCKET_COUNT,
} from './constants';

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
} from './utils';

// Engine
export { RouletteEngine, type RouletteEngineType } from './engine';
export { RouletteEngine as default } from './engine';
