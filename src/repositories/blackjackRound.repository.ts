/* ============================================================================
   Blackjack Round Repository — persisted round history
   ============================================================================ */

import { db } from "../db/postgres";
import { blackjackRound } from "../db/schema";
import * as crypto from "crypto";

export interface HandSnapshot {
  result: string;
  bet: number;
  doubled: boolean;
  splitAces: boolean;
}

export interface RoundInsert {
  userId: string;
  totalBet: number;
  totalWin: number;
  handsSnapshot: HandSnapshot[];
  balanceAfter: number;
}

/* ============================================================================
   Commands
   ============================================================================ */

export async function createRound(data: RoundInsert): Promise<void> {
  await db.insert(blackjackRound).values({
    id: crypto.randomBytes(16).toString("hex"),
    userId: data.userId,
    totalBet: data.totalBet.toString(),
    totalWin: data.totalWin.toString(),
    handsSnapshot: data.handsSnapshot,
    balanceAfter: data.balanceAfter.toString(),
  });
}
