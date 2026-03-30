// Types for European Roulette

export type BetType =
  | "straight"
  | "split"
  | "street"
  | "corner"
  | "line"
  | "column"
  | "dozen"
  | "even_odd"
  | "red_black"
  | "high_low";

export type RouletteColor = "red" | "black" | "green";

export type ColorChoice = "red" | "black";

export type ParityChoice = "even" | "odd";

export type RangeChoice = "low" | "high";

export type ColumnChoice = "col1" | "col2" | "col3";

export type DozenChoice = "1st12" | "2nd12" | "3rd12";

export type BetChoice = ParityChoice | RangeChoice | ColumnChoice | DozenChoice;

export type RouletteNumber =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24
  | 25
  | 26
  | 27
  | 28
  | 29
  | 30
  | 31
  | 32
  | 33
  | 34
  | 35
  | 36;

export interface SpinResult {
  readonly number: RouletteNumber;
  readonly color: RouletteColor;
}

interface BaseBet {
  readonly type: BetType;
  readonly amount: number;
}

export interface StraightBet extends BaseBet {
  readonly type: "straight";
  readonly numbers: readonly [RouletteNumber];
}

export interface SplitBet extends BaseBet {
  readonly type: "split";
  readonly numbers: readonly [RouletteNumber, RouletteNumber];
}

export interface StreetBet extends BaseBet {
  readonly type: "street";
  readonly numbers: readonly [RouletteNumber, RouletteNumber, RouletteNumber];
}

export interface CornerBet extends BaseBet {
  readonly type: "corner";
  readonly numbers: readonly [
    RouletteNumber,
    RouletteNumber,
    RouletteNumber,
    RouletteNumber
  ];
}

export interface LineBet extends BaseBet {
  readonly type: "line";
  readonly numbers: readonly RouletteNumber[];
}

export interface ColumnBet extends BaseBet {
  readonly type: "column";
  readonly choice: ColumnChoice;
}

export interface DozenBet extends BaseBet {
  readonly type: "dozen";
  readonly choice: DozenChoice;
}

export interface EvenOddBet extends BaseBet {
  readonly type: "even_odd";
  readonly choice: ParityChoice;
}

export interface RedBlackBet extends BaseBet {
  readonly type: "red_black";
  readonly color: ColorChoice;
}

export interface HighLowBet extends BaseBet {
  readonly type: "high_low";
  readonly choice: RangeChoice;
}

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

export interface ProvablyFairData {
  readonly serverSeedHex: string;
  readonly clientSeed: string;
  readonly nonce: number;
}

export interface BetResult {
  readonly bet: Bet;
  readonly winnings: number;
  readonly isWinner: boolean;
}

export interface SpinOutcome {
  readonly result: SpinResult;
  readonly bets: readonly BetResult[];
  readonly totalBet: number;
  readonly totalWin: number;
  readonly hmac: string;
}

import { z } from "zod";
import { type betSchema } from "../../zodTypes";

// From roulette.service.ts
export interface SeedHashResult {
  serverSeedHash: string;
}

export interface RotateSeedResult {
  ok: true;
  newSeedHash: string;
}

export interface BalanceResult {
  balance: number;
}

export interface RevealSeedResult {
  seed: string;
}

export interface NonceResult {
  nextNonce: number;
}

export interface SpinInput {
  bets: z.infer<typeof betSchema>[];
  clientSeed: string;
  nonce: number;
  idempotencyKey?: string;
}

// From seed.repository.ts
export interface SeedSummary {
  id: string;
  hash: string;
  active: boolean;
  createdAt: Date;
  revealedAt: Date | null;
}
