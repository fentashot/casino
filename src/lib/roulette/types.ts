// Typy dla European Roulette

// Wszystkie możliwe typy zakładów
export type BetType =
  | 'straight'   // Pojedynczy numer (35:1)
  | 'split'      // Dwa sąsiednie numery (17:1)
  | 'street'     // Trzy numery w rzędzie (11:1)
  | 'corner'     // Cztery numery (8:1)
  | 'line'       // Sześć numerów (5:1)
  | 'column'     // 12 numerów w kolumnie (2:1)
  | 'dozen'      // 12 kolejnych numerów (2:1)
  | 'even_odd'   // Parzyste lub nieparzyste (1:1)
  | 'red_black'  // Czerwone lub czarne (1:1)
  | 'high_low';  // 1-18 lub 19-36 (1:1)

// Kolory pól ruletki
export type RouletteColor = 'red' | 'black' | 'green';

// Opcje zakładów kolorowych
export type ColorChoice = 'red' | 'black';

// Opcje zakładów parzystości
export type ParityChoice = 'even' | 'odd';

// Opcje zakładów zakresu
export type RangeChoice = 'low' | 'high';

// Opcje zakładów kolumn
export type ColumnChoice = 'col1' | 'col2' | 'col3';

// Opcje zakładów tuzinów
export type DozenChoice = '1st12' | '2nd12' | '3rd12';

// Wszystkie możliwe wybory zakładów
export type BetChoice = ParityChoice | RangeChoice | ColumnChoice | DozenChoice;

// Prawidłowe numery ruletki (0-36 dla europejskiej)
export type RouletteNumber =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
  | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19
  | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29
  | 30 | 31 | 32 | 33 | 34 | 35 | 36;

// Wynik obrotu ruletki
export interface SpinResult {
  readonly number: RouletteNumber;
  readonly color: RouletteColor;
}

// Bazowa struktura zakładu
interface BaseBet {
  readonly type: BetType;
  readonly amount: number;
}

// Zakład na pojedynczy numer
export interface StraightBet extends BaseBet {
  readonly type: 'straight';
  readonly numbers: readonly [RouletteNumber];
}

// Zakład split na dwa sąsiednie numery
export interface SplitBet extends BaseBet {
  readonly type: 'split';
  readonly numbers: readonly [RouletteNumber, RouletteNumber];
}

// Zakład street na trzy numery
export interface StreetBet extends BaseBet {
  readonly type: 'street';
  readonly numbers: readonly [RouletteNumber, RouletteNumber, RouletteNumber];
}

// Zakład corner na cztery numery
export interface CornerBet extends BaseBet {
  readonly type: 'corner';
  readonly numbers: readonly [RouletteNumber, RouletteNumber, RouletteNumber, RouletteNumber];
}

// Zakład line na sześć numerów
export interface LineBet extends BaseBet {
  readonly type: 'line';
  readonly numbers: readonly RouletteNumber[];
}

// Zakład na kolumnę
export interface ColumnBet extends BaseBet {
  readonly type: 'column';
  readonly choice: ColumnChoice;
}

// Zakład na tuzin
export interface DozenBet extends BaseBet {
  readonly type: 'dozen';
  readonly choice: DozenChoice;
}

// Zakład parzyste/nieparzyste
export interface EvenOddBet extends BaseBet {
  readonly type: 'even_odd';
  readonly choice: ParityChoice;
}

// Zakład czerwone/czarne
export interface RedBlackBet extends BaseBet {
  readonly type: 'red_black';
  readonly color: ColorChoice;
}

// Zakład wysokie/niskie
export interface HighLowBet extends BaseBet {
  readonly type: 'high_low';
  readonly choice: RangeChoice;
}

// Unia wszystkich typów zakładów
export type Bet =
  | StraightBet
  | SplitBet
  | StreetBet
  | CornerBet
  | LineBet
  | ColumnBet
  | DozenBet
  | EvenOddBet
  | RedBlackBet
  | HighLowBet;

// Dane do weryfikacji provably fair
export interface ProvablyFairData {
  readonly serverSeedHex: string;
  readonly clientSeed: string;
  readonly nonce: number;
}

// Wynik przetworzenia zakładu
export interface BetResult {
  readonly bet: Bet;
  readonly winnings: number;
  readonly isWinner: boolean;
}

// Kompletny wynik obrotu
export interface SpinOutcome {
  readonly result: SpinResult;
  readonly bets: readonly BetResult[];
  readonly totalBet: number;
  readonly totalWin: number;
  readonly hmac: string;
}
