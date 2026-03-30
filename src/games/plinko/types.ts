/* ============================================================================
   Plinko Types
   ============================================================================ */

export interface PlinkoPlayResult {
  path: number[];
  finalBucket: number;
  multiplier: number;
  win: number;
  balance: number;
}
