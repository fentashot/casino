import { type Result, ok, err, ErrorCode } from "../lib/errors";
import * as BalanceRepo from "../repositories/balance.repository";
import * as PlinkoRepo from "../repositories/plinkoRound.repository";
import { dropBall, type Difficulty } from "../lib/plinko";
import * as crypto from "crypto";

export interface PlinkoPlayResult {
  path: number[];
  finalBucket: number;
  multiplier: number;
  win: number;
  balance: number;
}

export async function play(
  userId: string,
  bet: number,
  rows: number,
  difficulty: Difficulty,
): Promise<Result<PlinkoPlayResult>> {
  const { balance: currentBalance } = await BalanceRepo.findOrCreate(userId);

  if (currentBalance < bet) {
    return err(ErrorCode.INSUFFICIENT_FUNDS);
  }

  // Generate a random seed for this drop
  const seed = crypto.randomBytes(16).toString("hex");
  const result = dropBall(bet, rows, difficulty, seed);

  const newBalance = currentBalance - bet + result.win;

  await BalanceRepo.updateBalance(userId, newBalance.toString());

  await PlinkoRepo.createRound({
    userId,
    bet,
    totalWin: result.win,
    rows,
    difficulty,
    finalBucket: result.finalBucket,
    multiplier: result.multiplier,
    balanceAfter: newBalance,
  });

  return ok({
    path: result.path,
    finalBucket: result.finalBucket,
    multiplier: result.multiplier,
    win: result.win,
    balance: newBalance,
  });
}
