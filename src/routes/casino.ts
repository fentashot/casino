import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db/turso";
import { casinoServerSeed, casinoSpin, casinoBet, userBalance } from "../db/schema";
import { eq } from "drizzle-orm";
import crypto from 'crypto';
import { auth } from "../auth";
import { z } from "zod";
import { betTypeSchema, betSchema, spinRequestSchema } from "../zodTypes";

type User = typeof auth.$Infer.Session.user;
type Session = typeof auth.$Infer.Session;

export interface Vars {
  Variables: {
    user: User | null;
    session: Session | null;
  };
}



export interface SpinResponse {
  result: { number: number; color: 'red' | 'black' | 'green' };
  totalWin: number;
  provablyFair: {
    clientSeed: string;
    serverSeedHash: string;
    nonce: number;
    hmac: string;
  };
}

const redNumbers = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

const payoutTable: Record<z.infer<typeof betTypeSchema>, number> = {
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

// ====== Helpers ======
function calculateWinnings(bet: z.infer<typeof betSchema>, result: { number: number; color: string }): number {
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

function computeHmac(serverSeedHex: string, clientSeed: string, nonce: number): string {
  const hmac = crypto.createHmac('sha256', Buffer.from(serverSeedHex, 'hex'));
  hmac.update(`${clientSeed}:${nonce}`);
  return hmac.digest('hex');
}

function hashToNumber(hashHex: string): number {
  // We take first 8 hex chars => 32-bit number
  const val = parseInt(hashHex.substring(0, 8), 16);
  return val % 37; // 0..36
}

// ====== Routes ======
export const casinoRoutes = new Hono<Vars>()
  // Get current active server seed hash
  .get('/seed', async (c) => {
    const activeSeed = await db.query.casinoServerSeed.findFirst({
      where: eq(casinoServerSeed.active, true),
      columns: {
        hash: true,
      },
    });

    if (!activeSeed) {
      return c.json({ error: 'no_active_seed' }, 500);
    }

    return c.json({ serverSeedHash: activeSeed.hash });
  })
  // Rotate server seed
  .post('/rotate', async (c) => {
    // In production: require admin auth, add API key/JWT validation
    const body = await c.req.json();
    const adminKey: string = body?.adminKey;
    if (adminKey !== process.env.ADMIN_KEY) {
      return c.json({ error: 'unauthorized' }, 401);
    }

    // Deactivate current seed
    await db
      .update(casinoServerSeed)
      .set({ active: false })
      .where(eq(casinoServerSeed.active, true));

    // Generate and insert new seed
    const newSeed = crypto.randomBytes(32).toString('hex');
    const newHash = crypto.createHash('sha256').update(newSeed).digest('hex');
    const newId = crypto.randomBytes(16).toString('hex');

    await db.insert(casinoServerSeed).values({
      id: newId,
      seed: newSeed,
      hash: newHash,
      active: true,
    });

    return c.json({ ok: true, newSeedHash: newHash });
  })
  // Get user balance
  .get('/balance', async (c) => {
    const { id } = c.get('user') as User;

    let balance = await db.query.userBalance.findFirst({
      where: eq(userBalance.userId, id),
      columns: {
        balance: true,
      },
    });

    if (!balance) {
      // Create initial balance if it doesn't exist
      await db.insert(userBalance).values({
        userId: id,
        balance: '1000.00', // Initial balance of 1000
        lastNonce: 0,
      });
      balance = { balance: '1000.00' };
    }

    return c.json({ balance: Number(balance.balance) });
  })
  .post('/reveal', async (c) => {
    const body = await c.req.json();
    const adminKey = body?.adminKey;
    const seedId = body?.seedId;

    if (adminKey !== process.env.ADMIN_KEY) {
      return c.json({ error: 'unauthorized' }, 401);
    }

    if (!seedId) {
      return c.json({ error: 'missing_seed_id' }, 400);
    }

    const seedRecord = await db.query.casinoServerSeed.findFirst({
      where: eq(casinoServerSeed.id, seedId),
    });

    if (!seedRecord) {
      return c.json({ error: 'seed_not_found' }, 404);
    }

    if (seedRecord.active) {
      return c.json({ error: 'seed_still_active' }, 400);
    }

    // Mark seed as revealed
    await db
      .update(casinoServerSeed)
      .set({ revealedAt: new Date().toISOString() })
      .where(eq(casinoServerSeed.id, seedId));

    return c.json({ seed: seedRecord.seed });
  })
  .post('/spin', zValidator('json', spinRequestSchema), async (c) => {
    const { id: userId } = c.get('user') as User;
    const body = c.req.valid('json');


    // Get active server seed
    const serverSeedRecord = await db.query.casinoServerSeed.findFirst({
      where: eq(casinoServerSeed.active, true),
    });

    if (!serverSeedRecord) {
      return c.json({ error: 'no_active_seed' }, 500);
    }

    // Calculate total bet amount
    const totalBet = body.bets.reduce((sum: number, bet: z.infer<typeof betSchema>) => sum + bet.amount, 0);

    // Check and update user balance
    const userBalanceRecord = await db.query.userBalance.findFirst({
      where: eq(userBalance.userId, userId),
    });

    if (!userBalanceRecord || Number(userBalanceRecord.balance) < totalBet) {
      return c.json({ error: 'insufficient_funds' }, 402);
    }

    if (body.nonce !== userBalanceRecord.lastNonce + 1) {
      body.nonce = userBalanceRecord.lastNonce + 1;
    }



    // Generate spin result
    const hmac = computeHmac(serverSeedRecord.seed, body.clientSeed, body.nonce);
    const number = hashToNumber(hmac);
    const color = number === 0 ? 'green' : (redNumbers.has(number) ? 'red' : 'black');

    // Calculate total win
    let totalWin = 0;
    for (const bet of body.bets) {
      totalWin += calculateWinnings(bet, { number, color });
    }

    // Create spin record
    const spinId = crypto.randomBytes(16).toString('hex');
    await db.insert(casinoSpin).values({
      id: spinId,
      userId,
      clientSeed: body.clientSeed,
      nonce: body.nonce,
      hmac,
      serverSeedId: serverSeedRecord.id,
      number,
      color,
      totalBet: totalBet.toString(),
      totalWin: totalWin.toString(),
    });

    // Create bet records
    for (const bet of body.bets) {
      const win = calculateWinnings(bet, { number, color });
      await db.insert(casinoBet).values({
        id: crypto.randomBytes(16).toString('hex'),
        spinId,
        type: bet.type,
        numbers: JSON.stringify(bet.numbers),
        amount: bet.amount.toString(),
        color: bet.color,
        choice: bet.choice,
        win: win.toString(),
      });
    }

    // Update user balance
    const newBalance = Number(userBalanceRecord.balance) - totalBet + totalWin;
    await db
      .update(userBalance)
      .set({ balance: newBalance.toString(), lastNonce: body.nonce })
      .where(eq(userBalance.userId, userId));

    const res: SpinResponse = {
      result: { number, color },
      totalWin,
      provablyFair: {
        clientSeed: body.clientSeed,
        serverSeedHash: serverSeedRecord.hash,
        nonce: body.nonce,
        hmac,
      },
    };

    console.log('Spin result:', res);
    console.log('User balance after spin:', newBalance);
    console.log('User last nonce after spin:', body.nonce);


    return c.json(res);
  })
  .get('/history', async (c) => {
    const { id: userId } = c.get('user') as User;
    const limit = Number(c.req.query('limit') ?? '10');
    const offset = Number(c.req.query('offset') ?? '0');

    // Get user's spins with bets
    const spins = await db.query.casinoSpin.findMany({
      where: eq(casinoSpin.userId, userId),
      orderBy: casinoSpin.createdAt,
      limit,
      offset,
      with: {
        bets: true
      }
    });

    return c.json({ spins });
  })
  .get('/nonce', async (c) => {
    const { id: userId } = c.get('user') as User;

    const balance = await db.query.userBalance.findFirst({
      where: eq(userBalance.userId, userId),
      columns: {
        lastNonce: true
      }
    });

    return c.json({ nextNonce: (balance?.lastNonce || 0) + 1 });
  });