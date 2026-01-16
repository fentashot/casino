import type { RouletteSelection } from '@/components/RouletteControls';

// Kolory numerów
export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

// Układy numerów na stole
export const TOP_ROW = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];
export const MIDDLE_ROW = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
export const BOTTOM_ROW = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

// Domyślne wartości chipów
export const CHIP_VALUES = [10, 20, 50, 100, 500, 1000];
export const CHIP_COUNTS = [1, 2, 3, 4, 5];

/**
 * Formatuje wartość do skróconej formy (np. 1000 -> "1k")
 */
export function formatValue(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toString();
}

/**
 * Formatuje balance z separatorami tysięcy
 */
export function formatBalance(value: number): string {
  return value.toLocaleString().replace(/,/g, '.');
}

/**
 * Generuje klucz dla danego zakładu (do śledzenia w pendingStacks)
 */
export function getKeyFromSelection(selection: RouletteSelection): string {
  switch (selection.type) {
    case 'straight':
      return `straight:${selection.numbers?.[0]}`;
    case 'red_black':
      return `red_black:${selection.color}`;
    case 'dozen':
      return `dozen:${selection.choice}`;
    case 'column':
      return `column:${selection.choice}`;
    case 'even_odd':
      return `even_odd:${selection.choice}`;
    case 'high_low':
      return `high_low:${selection.choice}`;
    default:
      return `${selection.type}:${selection.choice}`;
  }
}

/**
 * Tworzy obiekt RouletteSelection z klucza
 */
export function makeSelectionFromKey(
  key: string,
  amount: number
): RouletteSelection {
  const [type, choice] = key.split(':');
  const base = {
    amount,
    numbers: [] as number[],
    color: undefined,
    choice: undefined,
  };

  switch (type) {
    case 'straight':
      return { ...base, type: 'straight', numbers: [Number(choice)] };
    case 'red_black':
      return {
        ...base,
        type: 'red_black',
        color: choice as RouletteSelection['color'],
      };
    default:
      return {
        ...base,
        type: type as RouletteSelection['type'],
        choice: choice as RouletteSelection['choice'],
      };
  }
}

/**
 * Sprawdza czy dwa zakłady są identyczne (ten sam typ, numery, kolor, wybór)
 */
export function areBetsEqual(
  bet1: RouletteSelection,
  bet2: RouletteSelection
): boolean {
  return (
    bet1.type === bet2.type &&
    JSON.stringify(bet1.numbers || []) === JSON.stringify(bet2.numbers || []) &&
    bet1.choice === bet2.choice &&
    bet1.color === bet2.color
  );
}
