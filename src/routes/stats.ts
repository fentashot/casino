/* ============================================================================
   Stats Routes
   Aggregated player statistics across ALL games (roulette + blackjack).
   All heavy computation is done server-side — the client receives
   ready-to-render data series.
   ============================================================================ */

import { Hono } from "hono";
import { db } from "../db/postgres";
import { casinoSpin, blackjackRound } from "../db/schema";
import { eq, asc, desc } from "drizzle-orm";
import type { User, Vars } from "../types";

export const statsRoutes = new Hono<Vars>()

  /**
   * GET /api/stats/overview
   * Lifetime aggregates across roulette + blackjack:
   * total wagered, won, net profit, win rate, biggest win,
   * streaks, avg bet, ROI.
   */
  .get("/overview", async (c) => {
    const { id: userId } = c.get("user") as User;

    const [spins, bjRounds] = await Promise.all([
      db.query.casinoSpin.findMany({
        where: eq(casinoSpin.userId, userId),
        columns: { totalBet: true, totalWin: true, createdAt: true },
        orderBy: asc(casinoSpin.createdAt),
      }),
      db.query.blackjackRound.findMany({
        where: eq(blackjackRound.userId, userId),
        columns: { totalBet: true, totalWin: true, createdAt: true },
        orderBy: asc(blackjackRound.createdAt),
      }),
    ]);

    // Merge into a single chronological list
    type RawRound = { totalBet: string; totalWin: string; createdAt: Date };
    const all: RawRound[] = [...spins, ...bjRounds].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    if (all.length === 0) {
      return c.json({
        totalRounds: 0,
        totalWagered: 0,
        totalWon: 0,
        netProfit: 0,
        winRate: 0,
        biggestWin: 0,
        biggestLoss: 0,
        currentStreak: 0,
        longestWinStreak: 0,
        longestLossStreak: 0,
        avgBet: 0,
        avgWin: 0,
        roiPct: 0,
        rouletteRounds: 0,
        blackjackRounds: 0,
      });
    }

    let totalWagered = 0;
    let totalWon = 0;
    let wins = 0;
    let biggestWin = 0;
    let biggestLoss = 0;
    let currentStreak = 0;
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let runningWin = 0;
    let runningLoss = 0;

    for (const round of all) {
      const bet = Number(round.totalBet);
      const win = Number(round.totalWin);
      const profit = win - bet;

      totalWagered += bet;
      totalWon += win;

      if (win > 0) {
        wins++;
        if (win > biggestWin) biggestWin = win;
        runningWin++;
        runningLoss = 0;
        if (runningWin > longestWinStreak) longestWinStreak = runningWin;
      } else {
        if (bet > biggestLoss) biggestLoss = bet;
        runningLoss++;
        runningWin = 0;
        if (runningLoss > longestLossStreak) longestLossStreak = runningLoss;
      }

      if (profit > 0) {
        currentStreak = currentStreak > 0 ? currentStreak + 1 : 1;
      } else {
        currentStreak = currentStreak < 0 ? currentStreak - 1 : -1;
      }
    }

    const netProfit = totalWon - totalWagered;
    const winRate = Math.round((wins / all.length) * 100);
    const avgBet = totalWagered / all.length;
    const avgWin = totalWon / all.length;
    const roiPct =
      totalWagered > 0
        ? Math.round((netProfit / totalWagered) * 10000) / 100
        : 0;

    return c.json({
      totalRounds: all.length,
      totalWagered: Math.round(totalWagered * 100) / 100,
      totalWon: Math.round(totalWon * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      winRate,
      biggestWin: Math.round(biggestWin * 100) / 100,
      biggestLoss: Math.round(biggestLoss * 100) / 100,
      currentStreak,
      longestWinStreak,
      longestLossStreak,
      avgBet: Math.round(avgBet * 100) / 100,
      avgWin: Math.round(avgWin * 100) / 100,
      roiPct,
      rouletteRounds: spins.length,
      blackjackRounds: bjRounds.length,
    });
  })

  /**
   * GET /api/stats/balance-history
   * Running cumulative profit/loss over time, merging both game types.
   * Query param: limit (default 200, max 1000)
   */
  .get("/balance-history", async (c) => {
    const { id: userId } = c.get("user") as User;
    const rawLimit = Number(c.req.query("limit") ?? "200");
    const limit = Math.min(Math.max(1, rawLimit), 1000);

    const [spins, bjRounds] = await Promise.all([
      db.query.casinoSpin.findMany({
        where: eq(casinoSpin.userId, userId),
        columns: { totalBet: true, totalWin: true, createdAt: true },
        orderBy: asc(casinoSpin.createdAt),
      }),
      db.query.blackjackRound.findMany({
        where: eq(blackjackRound.userId, userId),
        columns: { totalBet: true, totalWin: true, createdAt: true },
        orderBy: asc(blackjackRound.createdAt),
      }),
    ]);

    type RawRound = {
      totalBet: string;
      totalWin: string;
      createdAt: Date;
      game: "Roulette" | "Blackjack";
    };

    const all: RawRound[] = [
      ...spins.map((s) => ({ ...s, game: "Roulette" as const })),
      ...bjRounds.map((r) => ({ ...r, game: "Blackjack" as const })),
    ]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(-limit); // keep the most recent `limit` rounds

    let running = 0;
    const series = all.map((round, idx) => {
      const bet = Number(round.totalBet);
      const win = Number(round.totalWin);
      running += win - bet;
      return {
        round: idx + 1,
        balance: Math.round(running * 100) / 100,
        date: round.createdAt,
        won: win > 0,
        game: round.game,
      };
    });

    return c.json({ series });
  })

  /**
   * GET /api/stats/daily
   * Per-day aggregates (both games combined) for the last N days.
   * Query param: days (default 30, max 365)
   */
  .get("/daily", async (c) => {
    const { id: userId } = c.get("user") as User;
    const rawDays = Number(c.req.query("days") ?? "30");
    const days = Math.min(Math.max(1, rawDays), 365);

    const [spins, bjRounds] = await Promise.all([
      db.query.casinoSpin.findMany({
        where: eq(casinoSpin.userId, userId),
        columns: { totalBet: true, totalWin: true, createdAt: true },
        orderBy: asc(casinoSpin.createdAt),
      }),
      db.query.blackjackRound.findMany({
        where: eq(blackjackRound.userId, userId),
        columns: { totalBet: true, totalWin: true, createdAt: true },
        orderBy: asc(blackjackRound.createdAt),
      }),
    ]);

    type DayBucket = {
      wagered: number;
      won: number;
      rounds: number;
      wins: number;
    };
    const byDay = new Map<string, DayBucket>();

    const addToBucket = (
      createdAt: Date,
      totalBet: string,
      totalWin: string,
    ) => {
      const d = createdAt.toISOString().slice(0, 10);
      const existing = byDay.get(d) ?? {
        wagered: 0,
        won: 0,
        rounds: 0,
        wins: 0,
      };
      existing.wagered += Number(totalBet);
      existing.won += Number(totalWin);
      existing.rounds++;
      if (Number(totalWin) > 0) existing.wins++;
      byDay.set(d, existing);
    };

    for (const s of spins) addToBucket(s.createdAt, s.totalBet, s.totalWin);
    for (const r of bjRounds) addToBucket(r.createdAt, r.totalBet, r.totalWin);

    // Build a continuous series for the requested window
    const series = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const entry = byDay.get(key);

      series.push({
        date: key,
        wagered: entry ? Math.round(entry.wagered * 100) / 100 : 0,
        won: entry ? Math.round(entry.won * 100) / 100 : 0,
        profit: entry ? Math.round((entry.won - entry.wagered) * 100) / 100 : 0,
        rounds: entry?.rounds ?? 0,
        winRate:
          entry && entry.rounds > 0
            ? Math.round((entry.wins / entry.rounds) * 100)
            : 0,
      });
    }

    return c.json({ series });
  })

  /**
   * GET /api/stats/hourly-heatmap
   * Activity heatmap: per hour-of-day (0–23), combining both game types.
   */
  .get("/hourly-heatmap", async (c) => {
    const { id: userId } = c.get("user") as User;

    const [spins, bjRounds] = await Promise.all([
      db.query.casinoSpin.findMany({
        where: eq(casinoSpin.userId, userId),
        columns: { totalBet: true, totalWin: true, createdAt: true },
      }),
      db.query.blackjackRound.findMany({
        where: eq(blackjackRound.userId, userId),
        columns: { totalBet: true, totalWin: true, createdAt: true },
      }),
    ]);

    const hours = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      rounds: 0,
      wagered: 0,
      won: 0,
      wins: 0,
    }));

    const addToHour = (createdAt: Date, totalBet: string, totalWin: string) => {
      const h = createdAt.getHours();
      hours[h].rounds++;
      hours[h].wagered += Number(totalBet);
      hours[h].won += Number(totalWin);
      if (Number(totalWin) > 0) hours[h].wins++;
    };

    for (const s of spins) addToHour(s.createdAt, s.totalBet, s.totalWin);
    for (const r of bjRounds) addToHour(r.createdAt, r.totalBet, r.totalWin);

    const series = hours.map((h) => ({
      hour: h.hour,
      label: `${String(h.hour).padStart(2, "0")}:00`,
      rounds: h.rounds,
      profit: Math.round((h.won - h.wagered) * 100) / 100,
      winRate: h.rounds > 0 ? Math.round((h.wins / h.rounds) * 100) : 0,
    }));

    return c.json({ series });
  })

  /**
   * GET /api/stats/game-breakdown
   * Per-game-type summary: rounds, wagered, won, profit, win rate.
   */
  .get("/game-breakdown", async (c) => {
    const { id: userId } = c.get("user") as User;

    const [spins, bjRounds] = await Promise.all([
      db.query.casinoSpin.findMany({
        where: eq(casinoSpin.userId, userId),
        columns: { totalBet: true, totalWin: true },
      }),
      db.query.blackjackRound.findMany({
        where: eq(blackjackRound.userId, userId),
        columns: { totalBet: true, totalWin: true },
      }),
    ]);

    const summarise = (
      rounds: { totalBet: string; totalWin: string }[],
      gameName: string,
    ) => {
      let wagered = 0;
      let won = 0;
      let wins = 0;
      for (const r of rounds) {
        wagered += Number(r.totalBet);
        won += Number(r.totalWin);
        if (Number(r.totalWin) > 0) wins++;
      }
      return {
        game: gameName,
        rounds: rounds.length,
        wagered: Math.round(wagered * 100) / 100,
        won: Math.round(won * 100) / 100,
        profit: Math.round((won - wagered) * 100) / 100,
        winRate:
          rounds.length > 0 ? Math.round((wins / rounds.length) * 100) : 0,
      };
    };

    const games = [
      summarise(spins, "Roulette"),
      summarise(bjRounds, "Blackjack"),
    ].filter((g) => g.rounds > 0); // omit games never played

    return c.json({ games });
  })

  /**
   * GET /api/stats/recent
   * Last N rounds across all games, newest first.
   * Query param: limit (default 20, max 100)
   */
  .get("/recent", async (c) => {
    const { id: userId } = c.get("user") as User;
    const rawLimit = Number(c.req.query("limit") ?? "20");
    const limit = Math.min(Math.max(1, rawLimit), 100);

    const [spins, bjRounds] = await Promise.all([
      db.query.casinoSpin.findMany({
        where: eq(casinoSpin.userId, userId),
        orderBy: desc(casinoSpin.createdAt),
        // Fetch more than limit from each source so the merge is accurate
        limit: limit,
        columns: {
          id: true,
          number: true,
          color: true,
          totalBet: true,
          totalWin: true,
          createdAt: true,
        },
      }),
      db.query.blackjackRound.findMany({
        where: eq(blackjackRound.userId, userId),
        orderBy: desc(blackjackRound.createdAt),
        limit: limit,
        columns: {
          id: true,
          totalBet: true,
          totalWin: true,
          handsSnapshot: true,
          createdAt: true,
        },
      }),
    ]);

    type RecentRound = {
      id: string;
      game: "Roulette" | "Blackjack";
      /** Roulette pocket number, or -1 for blackjack */
      number: number;
      /** "red" | "black" | "green" | "blackjack" */
      color: string;
      bet: number;
      win: number;
      profit: number;
      /** Hand results for blackjack, empty for roulette */
      handResults: string[];
      createdAt: Date;
    };

    const rouletteRounds: RecentRound[] = spins.map((s) => ({
      id: s.id,
      game: "Roulette",
      number: s.number,
      color: s.color,
      bet: Number(s.totalBet),
      win: Number(s.totalWin),
      profit: Number(s.totalWin) - Number(s.totalBet),
      handResults: [],
      createdAt: s.createdAt,
    }));

    const blackjackRounds: RecentRound[] = bjRounds.map((r) => {
      const snapshot = r.handsSnapshot as Array<{
        result: string;
        bet: number;
      }>;
      return {
        id: r.id,
        game: "Blackjack",
        number: -1,
        color: "blackjack",
        bet: Number(r.totalBet),
        win: Number(r.totalWin),
        profit: Number(r.totalWin) - Number(r.totalBet),
        handResults: snapshot.map((h) => h.result),
        createdAt: r.createdAt,
      };
    });

    const merged = [...rouletteRounds, ...blackjackRounds]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));

    return c.json({ rounds: merged });
  });
