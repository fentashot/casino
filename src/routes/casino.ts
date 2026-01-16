import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db/postgres";
import { casinoServerSeed, casinoSpin, casinoBet, userBalance } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import * as crypto from 'crypto';
import { z } from "zod";
import { betSchema, spinRequestSchema } from "../zodTypes";
import { SpinResponse, User, Vars } from "../types";
import { calculateWinnings, computeHmac, hashToNumber, redNumbers } from "../lib/casinoHelpers";
import { requireAdminMiddleware } from "../auth";

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
  // Rotate server seed (Admin only)
  .post('/rotate', requireAdminMiddleware, async (c) => {
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
        balance: '100000.00', // Initial balance of 1000
        lastNonce: 0,
      });
      balance = { balance: '100000.00' };
    }
    // await db.update(userBalance).set({
    //   userId: id,
    //   balance: '100000.00', // Initial balance of 1000
    //   lastNonce: 0,
    // });

    return c.json({ balance: Number(balance.balance) });
  })
  // Reveal seed for verification (Admin only, only inactive seeds)
  .post('/reveal', requireAdminMiddleware, async (c) => {
    const body = await c.req.json();
    const seedId = body?.seedId;

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
      .set({ revealedAt: new Date() })
      .where(eq(casinoServerSeed.id, seedId));

    return c.json({ seed: seedRecord.seed });
  })
  .post('/spin', zValidator('json', spinRequestSchema), async (c) => {

    const { id: userId } = c.get('user') as User;
    const body = c.req.valid('json');

    // Sprawdź idempotency - jeśli już był taki spin, zwróć poprzedni wynik
    if (body.idempotencyKey) {
      const existingSpin = await db.query.casinoSpin.findFirst({
        where: eq(casinoSpin.idempotencyKey, body.idempotencyKey),
        with: { bets: true },
      });

      if (existingSpin) {
        // Pobierz aktualny balance
        const currentBalance = await db.query.userBalance.findFirst({
          where: eq(userBalance.userId, userId),
        });

        // Zwróć poprzedni wynik bez ponownego wykonania
        const serverSeed = await db.query.casinoServerSeed.findFirst({
          where: eq(casinoServerSeed.id, existingSpin.serverSeedId),
        });

        return c.json({
          result: { number: existingSpin.number, color: existingSpin.color as 'red' | 'black' | 'green' },
          totalWin: Number(existingSpin.totalWin),
          totalBet: Number(existingSpin.totalBet),
          newBalance: Number(currentBalance?.balance || 0),
          provablyFair: {
            clientSeed: existingSpin.clientSeed,
            serverSeedHash: serverSeed?.hash || '',
            nonce: existingSpin.nonce,
            hmac: existingSpin.hmac,
          },
          cached: true,
        } satisfies SpinResponse & { cached: boolean });
      }
    }

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

    // Walidacja nonce - musi być dokładnie lastNonce + 1
    const expectedNonce = userBalanceRecord.lastNonce + 1;
    if (body.nonce !== expectedNonce) {
      return c.json({
        error: 'invalid_nonce',
        expectedNonce,
        receivedNonce: body.nonce
      }, 400);
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

    const newBalance = Number(userBalanceRecord.balance) - totalBet + totalWin;
    const spinId = crypto.randomBytes(16).toString('hex');

    // Wykonaj wszystkie operacje w transakcji
    await db.transaction(async (tx) => {
      // Create spin record
      await tx.insert(casinoSpin).values({
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
        idempotencyKey: body.idempotencyKey || null,
      });

      // Create bet records
      for (const bet of body.bets) {
        const win = calculateWinnings(bet, { number, color });
        await tx.insert(casinoBet).values({
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
      await tx
        .update(userBalance)
        .set({ balance: newBalance.toString(), lastNonce: body.nonce })
        .where(eq(userBalance.userId, userId));
    });

    const res: SpinResponse = {
      result: { number, color },
      totalWin,
      totalBet,
      newBalance: newBalance,
      provablyFair: {
        clientSeed: body.clientSeed,
        serverSeedHash: serverSeedRecord.hash,
        nonce: body.nonce,
        hmac,
      },
    };

    return c.json(res);
  })
  .get('/history', async (c) => {
    const { id: userId } = c.get('user') as User;
    const limit = Number(c.req.query('limit') ?? '10');
    const offset = Number(c.req.query('offset') ?? '0');

    // Get user's spins with bets
    const spins = await db.query.casinoSpin.findMany({
      where: eq(casinoSpin.userId, userId),
      orderBy: desc(casinoSpin.createdAt),
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
  })
  // Admin: Get all seeds history (for seed rotation panel)
  .get('/seeds', requireAdminMiddleware, async (c) => {
    const seeds = await db.query.casinoServerSeed.findMany({
      orderBy: desc(casinoServerSeed.createdAt),
      columns: {
        id: true,
        hash: true,
        active: true,
        createdAt: true,
        revealedAt: true,
        // Don't expose actual seed unless revealed
      }
    });

    return c.json({ seeds });
  });