import crypto from 'crypto';
import { z } from "zod";
import { betTypeSchema, betSchema } from "../zodTypes";

export const redNumbers = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export const payoutTable: Record<z.infer<typeof betTypeSchema>, number> = {
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
};

//Calculate Winnings
export function calculateWinnings(bet: z.infer<typeof betSchema>, result: { number: number; color: string }): number {
  const { type, numbers, amount, color, choice } = bet;
  switch (type) {
    case 'straight':
      return numbers[0] === result.number ? amount * payoutTable.straight : 0;
    case 'split':
      return numbers.includes(result.number) ? amount * payoutTable.split : 0;
    case 'street':
      return numbers.includes(result.number) ? amount * payoutTable.street : 0;
    case 'corner':
      return numbers.includes(result.number) ? amount * payoutTable.corner : 0;
    case 'line':
      return numbers.includes(result.number) ? amount * payoutTable.line : 0;
    case 'column':
      if (
        (choice === 'col1' && [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34].includes(result.number)) ||
        (choice === 'col2' && [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35].includes(result.number)) ||
        (choice === 'col3' && [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36].includes(result.number))
      ) return amount * payoutTable.column;
      return 0;
    case 'dozen':
      if (
        (choice === '1st12' && result.number >= 1 && result.number <= 12) ||
        (choice === '2nd12' && result.number >= 13 && result.number <= 24) ||
        (choice === '3rd12' && result.number >= 25 && result.number <= 36)
      ) return amount * payoutTable.dozen;
      return 0;
    case 'even_odd':
      if (result.number === 0) return 0;
      if ((choice === 'even' && result.number % 2 === 0) || (choice === 'odd' && result.number % 2 === 1)) return amount * payoutTable.even_odd;
      return 0;
    case 'red_black':
      return result.color === color ? amount * payoutTable.red_black : 0;
    case 'high_low':
      if ((choice === 'low' && result.number >= 1 && result.number <= 18) || (choice === 'high' && result.number >= 19 && result.number <= 36)) return amount * payoutTable.high_low;
      return 0;
    default:
      return 0;
  }
}
//HMAC
export function computeHmac(serverSeedHex: string, clientSeed: string, nonce: number): string {
  const hmac = crypto.createHmac('sha256', Buffer.from(serverSeedHex, 'hex'));
  hmac.update(`${clientSeed}:${nonce}`);
  return hmac.digest('hex');
}

export function hashToNumber(hashHex: string): number {
  // We take first 8 hex chars => 32-bit number
  const val = parseInt(hashHex.substring(0, 8), 16);
  return val % 37; // 0..36
}