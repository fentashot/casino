# Game Module Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the casino codebase into self-contained `src/games/{game}/` feature folders, eliminating the repository layer (DB queries move into service files) and deleting client-side `api.ts` wrappers (hooks call `api.*.$method()` directly).

**Architecture:** Each game gets a folder with `router.ts`, `service.ts`, `engine.ts`/`engine/`, and `types.ts`. Everything else stays where it is: `src/db/`, `src/lib/`, `src/auth.ts`, `src/middleware/`, `src/types.ts`, `src/zodTypes.ts` are **not moved**. Client hooks move from `client/src/hooks/{game}/` to `client/src/games/{game}/` and call the hono client directly.

**Tech Stack:** Hono.js, Bun, TypeScript, Drizzle ORM, React, TanStack Query, Zod

**Spec:** `docs/superpowers/specs/2026-03-30-game-module-structure-design.md`

---

## File Map

### New server files (created from scratch)

| New path | Source |
|----------|--------|
| `src/games/roulette/types.ts` | `src/lib/roulette/types.ts` + service types from `src/services/roulette.service.ts` |
| `src/games/roulette/engine.ts` | flatten `src/lib/roulette/{constants,utils,engine,index}.ts` into one file |
| `src/games/roulette/service.ts` | `src/services/roulette.service.ts` + inline all queries from spin/seed/balance repos |
| `src/games/roulette/router.ts` | `src/routes/casino.ts` with updated imports |
| `src/games/blackjack/types.ts` | service types from `src/services/blackjack.service.ts` |
| `src/games/blackjack/engine/` | copy of `src/lib/blackjack/` (all files as-is) |
| `src/games/blackjack/service.ts` | `src/services/blackjack.service.ts` + inline balance/round repo queries |
| `src/games/blackjack/router.ts` | `src/routes/blackjack.ts` with updated imports |
| `src/games/plinko/types.ts` | `PlinkoPlayResult` interface |
| `src/games/plinko/engine.ts` | copy of `src/lib/plinko/engine.ts` |
| `src/games/plinko/service.ts` | `src/services/plinko.service.ts` + inline balance/round repo queries |
| `src/games/plinko/router.ts` | `src/routes/plinko.ts` with updated imports |
| `src/games/stats/router.ts` | `src/routes/stats.ts` with updated imports |
| `src/games/stats/service.ts` | `src/services/stats.service.ts` + inline all stats repo queries |
| `src/games/expenses/router.ts` | `src/routes/expenses.ts` with updated imports |
| `src/games/expenses/service.ts` | `src/services/expense.service.ts` + inline expense repo queries |

### Modified files

| File | Change |
|------|--------|
| `src/index.ts` | update imports to `./games/{game}/router` |

### Deleted server directories (after migration)

`src/routes/`, `src/services/`, `src/repositories/`

### NOT moved (stays in place)

`src/db/`, `src/lib/`, `src/auth.ts`, `src/middleware/`, `src/types.ts`, `src/zodTypes.ts`

### New client files

| New path | Source |
|----------|--------|
| `client/src/games/roulette/useRoulette.ts` | `client/src/hooks/roulette/useRoulette.ts` — replace api wrapper calls with direct `api.*.$get/post()` |
| `client/src/games/roulette/useSpinResult.ts` | `client/src/hooks/roulette/useSpinResult.ts` |
| `client/src/games/roulette/useSpinNotifications.ts` | `client/src/hooks/roulette/useSpinNotifications.ts` |
| `client/src/games/roulette/utils.ts` | `client/src/lib/roulette/utils.ts` (no `@server/` import changes needed — paths unchanged) |
| `client/src/games/blackjack/useBlackjack.ts` | `client/src/hooks/blackjack/useBlackjack.ts` — replace api wrapper calls with direct `api.*.$get/post()` |
| `client/src/games/blackjack/useBlackjackAnimation.ts` | `client/src/hooks/blackjack/useBlackjackAnimation.ts` — update barrel import |
| `client/src/games/blackjack/useBlackjackNotifications.ts` | `client/src/hooks/blackjack/useBlackjackNotifications.ts` |
| `client/src/games/blackjack/cardHelpers.ts` | `client/src/lib/blackjack/cardHelpers.ts` |
| `client/src/games/blackjack/types.ts` | `client/src/lib/blackjack/types.ts` |
| `client/src/games/plinko/usePlinkoGame.ts` | `client/src/hooks/plinko/usePlinkoGame.ts` — replace api wrapper call |
| `client/src/games/plinko/usePlinkoCanvas.ts` | `client/src/hooks/plinko/usePlinkoCanvas.ts` |
| `client/src/games/plinko/multipliers.ts` | `client/src/lib/plinko/multipliers.ts` |
| `client/src/games/stats/types.ts` | `client/src/lib/stats/types.ts` |

### Modified client files

| File | Change |
|------|--------|
| `client/src/hooks/useStats.ts` | replace `@/lib/stats/api` and `@/lib/stats/types` imports — inline fetch calls + import types from `@/games/stats/types` |

### Deleted client directories (after migration)

`client/src/lib/roulette/`, `client/src/lib/blackjack/`, `client/src/lib/plinko/`, `client/src/lib/stats/`, `client/src/hooks/roulette/`, `client/src/hooks/blackjack/`, `client/src/hooks/plinko/`

---

## Import path reference

Since `src/db/`, `src/lib/`, `src/auth.ts` etc. stay in place, game files use these relative paths:

| From game file | To | Import |
|---|---|---|
| `src/games/roulette/service.ts` | `src/lib/errors.ts` | `../../lib/errors` |
| `src/games/roulette/service.ts` | `src/db/postgres.ts` | `../../db/postgres` |
| `src/games/roulette/service.ts` | `src/db/schema.ts` | `../../db/schema` |
| `src/games/roulette/service.ts` | `src/lib/casinoHelpers.ts` | `../../lib/casinoHelpers` |
| `src/games/roulette/service.ts` | `src/zodTypes.ts` | `../../zodTypes` |
| `src/games/roulette/service.ts` | `src/types.ts` | `../../types` |
| `src/games/roulette/router.ts` | `src/auth.ts` | `../../auth` |
| `src/games/roulette/router.ts` | `src/lib/errors.ts` | `../../lib/errors` |
| `src/games/roulette/router.ts` | `src/zodTypes.ts` | `../../zodTypes` |
| `src/games/roulette/router.ts` | `src/types.ts` | `../../types` |

Same `../../` prefix for blackjack and plinko.

For stats/expenses (`src/games/stats/` and `src/games/expenses/`):
- Same `../../lib/errors`, `../../db/postgres`, `../../types`, `../../zodTypes`

---

## Task 1: Migrate roulette

**Files:**
- Create: `src/games/roulette/types.ts`
- Create: `src/games/roulette/engine.ts`
- Create: `src/games/roulette/service.ts`
- Create: `src/games/roulette/router.ts`

- [ ] **Step 1: Create src/games/roulette/types.ts**

Merge `src/lib/roulette/types.ts` content with service-level types from `src/services/roulette.service.ts`.

The file should export:
- Everything currently in `src/lib/roulette/types.ts` (BetType, RouletteNumber, BetChoice, all Bet variants, SpinResult, ProvablyFairData, BetResult, SpinOutcome)
- Service result types: `SeedHashResult`, `RotateSeedResult`, `BalanceResult`, `RevealSeedResult`, `NonceResult`, `SpinInput`
- `SeedSummary` (was in `src/repositories/seed.repository.ts`):

```ts
export interface SeedSummary {
  id: string; hash: string; active: boolean; createdAt: Date; revealedAt: Date | null;
}
```

The `SpinInput` type needs `betSchema` — import from `../../zodTypes`.

- [ ] **Step 2: Create src/games/roulette/engine.ts**

Flatten `src/lib/roulette/{constants,utils,engine}.ts` into one file. Export everything that `src/lib/roulette/index.ts` currently re-exports. Remove the barrel indirection.

Read `src/lib/roulette/index.ts` to see exactly what it exports, then copy the actual implementations from constants/utils/engine.ts into a single `engine.ts` file.

- [ ] **Step 3: Create src/games/roulette/service.ts**

Take `src/services/roulette.service.ts` and:

1. Update imports:
```ts
import { type Result, ok, err, ErrorCode } from "../../lib/errors";
import { db } from "../../db/postgres";
import { casinoServerSeed, casinoSpin, casinoBet, userBalance } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { betSchema } from "../../zodTypes";
import { calculateWinnings, computeHmac, hashToNumber, redNumbers } from "../../lib/casinoHelpers";
import type { SpinResponse } from "../../types";
import type { SeedHashResult, RotateSeedResult, BalanceResult, RevealSeedResult, NonceResult, SpinInput, SeedSummary } from "./types";
// Remove all BalanceRepo, SeedRepo, SpinRepo imports
```

2. Add private inline DB functions (replacing the 3 repository imports):

From `src/repositories/seed.repository.ts`:
```ts
async function findActiveSeed() {
  const record = await db.query.casinoServerSeed.findFirst({ where: eq(casinoServerSeed.active, true) });
  return record ?? null;
}
async function findActiveSeedHash() {
  const record = await db.query.casinoServerSeed.findFirst({ where: eq(casinoServerSeed.active, true), columns: { hash: true } });
  return record ?? null;
}
async function findSeedById(seedId: string) {
  const record = await db.query.casinoServerSeed.findFirst({ where: eq(casinoServerSeed.id, seedId) });
  return record ?? null;
}
async function findAllSeedSummaries(): Promise<SeedSummary[]> {
  return db.query.casinoServerSeed.findMany({ orderBy: desc(casinoServerSeed.createdAt), columns: { id: true, hash: true, active: true, createdAt: true, revealedAt: true } });
}
async function deactivateAllSeeds() {
  await db.update(casinoServerSeed).set({ active: false }).where(eq(casinoServerSeed.active, true));
}
async function createSeed(id: string, seed: string, hash: string) {
  await db.insert(casinoServerSeed).values({ id, seed, hash, active: true });
}
async function markSeedRevealed(seedId: string) {
  await db.update(casinoServerSeed).set({ revealedAt: new Date() }).where(eq(casinoServerSeed.id, seedId));
}
```

From `src/repositories/spin.repository.ts`:
```ts
interface SpinInsert { id: string; userId: string; clientSeed: string; nonce: number; hmac: string; serverSeedId: string; number: number; color: string; totalBet: string; totalWin: string; idempotencyKey: string | null; }
interface BetInsert { id: string; spinId: string; type: string; numbers: string; amount: string; color?: string; choice?: string; win: string; }

async function findSpinByIdempotencyKey(key: string) {
  const record = await db.query.casinoSpin.findFirst({ where: eq(casinoSpin.idempotencyKey, key), with: { bets: true } });
  return (record as any) ?? null;
}
async function findSpinHistory(userId: string, limit: number, offset: number) {
  return db.query.casinoSpin.findMany({ where: eq(casinoSpin.userId, userId), orderBy: desc(casinoSpin.createdAt), limit, offset, with: { bets: true } });
}
async function createSpinWithBets(spin: SpinInsert, bets: BetInsert[], userId: string, newBalance: string, nonce: number) {
  await db.transaction(async (tx) => {
    await tx.insert(casinoSpin).values(spin);
    for (const bet of bets) await tx.insert(casinoBet).values(bet);
    await tx.update(userBalance).set({ balance: newBalance, lastNonce: nonce }).where(eq(userBalance.userId, userId));
  });
}
```

From `src/repositories/balance.repository.ts`:
```ts
async function findBalanceByUserId(userId: string) {
  const record = await db.query.userBalance.findFirst({ where: eq(userBalance.userId, userId) });
  return record ?? null;
}
async function getBalanceAmountOnly(userId: string) {
  const record = await db.query.userBalance.findFirst({ where: eq(userBalance.userId, userId), columns: { balance: true } });
  return record ?? null;
}
async function getBalanceNonce(userId: string) {
  const record = await db.query.userBalance.findFirst({ where: eq(userBalance.userId, userId), columns: { lastNonce: true } });
  return record ?? null;
}
async function createDefaultBalance(userId: string) {
  await db.insert(userBalance).values({ userId, balance: "100000.00", lastNonce: 0 });
  return { userId, balance: "100000.00", lastNonce: 0 };
}
async function findOrCreateBalance(userId: string): Promise<{ balance: number }> {
  const existing = await findBalanceByUserId(userId);
  if (existing) return { balance: Number(existing.balance) };
  await createDefaultBalance(userId);
  return { balance: 100000 };
}
```

3. Update calls in the service body:
- `SeedRepo.findActiveSeed()` → `findActiveSeed()`
- `SeedRepo.findActiveSeedHash()` → `findActiveSeedHash()`
- `SeedRepo.findById(id)` → `findSeedById(id)`
- `SeedRepo.findAllSummaries()` → `findAllSeedSummaries()`
- `SeedRepo.deactivateAll()` → `deactivateAllSeeds()`
- `SeedRepo.create(id, seed, hash)` → `createSeed(id, seed, hash)`
- `SeedRepo.markRevealed(id)` → `markSeedRevealed(id)`
- `SpinRepo.findByIdempotencyKey(key)` → `findSpinByIdempotencyKey(key)`
- `SpinRepo.findHistory(uid, lim, off)` → `findSpinHistory(uid, lim, off)`
- `SpinRepo.createSpinWithBets(...)` → `createSpinWithBets(...)`
- `BalanceRepo.findByUserId(uid)` → `findBalanceByUserId(uid)`
- `BalanceRepo.getBalanceAmount(uid)` → `getBalanceAmountOnly(uid)`
- `BalanceRepo.getNonce(uid)` → `getBalanceNonce(uid)`
- `BalanceRepo.findOrCreate(uid)` → `findOrCreateBalance(uid)`

4. Update `listSeeds` return type: `Promise<Result<{ seeds: SeedRepo.SeedSummary[] }>>` → `Promise<Result<{ seeds: SeedSummary[] }>>`

- [ ] **Step 4: Create src/games/roulette/router.ts**

Copy `src/routes/casino.ts` verbatim. Update imports:
```ts
// old → new
import { spinRequestSchema } from "../zodTypes"    → import { spinRequestSchema } from "../../zodTypes"
import type { User, Vars } from "../types"          → import type { User, Vars } from "../../types"
import { requireAdminMiddleware } from "../auth"    → import { requireAdminMiddleware } from "../../auth"
import { mapResultToResponse } from "../lib/errors" → import { mapResultToResponse } from "../../lib/errors"
import * as RouletteService from "../services/roulette.service" → import * as RouletteService from "./service"
```

Export name stays `casinoRoutes`.

- [ ] **Step 5: Typecheck roulette**

```bash
cd /home/fenta/Projects/casino && bunx tsc --noEmit 2>&1 | grep "src/games/roulette" | head -20
```

Expected: zero errors. Fix before continuing.

---

## Task 2: Migrate blackjack

**Files:**
- Create: `src/games/blackjack/types.ts`
- Create: `src/games/blackjack/engine/` (all files from `src/lib/blackjack/`)
- Create: `src/games/blackjack/service.ts`
- Create: `src/games/blackjack/router.ts`

- [ ] **Step 1: Copy blackjack engine**

```bash
mkdir -p src/games/blackjack
cp -r src/lib/blackjack src/games/blackjack/engine
```

Internal imports inside the engine files use relative paths between each other — they stay unchanged.

- [ ] **Step 2: Create src/games/blackjack/types.ts**

```ts
// src/games/blackjack/types.ts
import type { BlackjackGameState } from "./engine";

export interface GameStateResult {
  game: BlackjackGameState | null;
}
export interface ShoeInfoResult {
  cardsRemaining: number | null;
  penetration: number | null;
}
export type InsuranceDecision = "take" | "skip";
export type PlayerAction = "hit" | "stand" | "double" | "split";
```

- [ ] **Step 3: Create src/games/blackjack/service.ts**

Take `src/services/blackjack.service.ts`. Update imports:
```ts
import { type Result, ok, err, ErrorCode } from "../../lib/errors";
import { db } from "../../db/postgres";
import { userBalance, blackjackRound } from "../../db/schema";
import { eq } from "drizzle-orm";
import type { BlackjackGameState } from "./engine";
import {
  dealGame, resolveInsurance, hitHand, standHand, doubleDown, splitHand,
  resolveDealerAndSettle, shouldTriggerDealer, sanitizeGame, getActiveGame,
  getGameForUser, saveGame, clearGame, getShoeInfo, canSplit,
  markPersisted, isPersisted,
} from "./engine";
import type { GameStateResult, ShoeInfoResult, InsuranceDecision, PlayerAction } from "./types";
// Remove: BalanceRepo import, BlackjackRoundRepo import
```

Add private inline functions:
```ts
// Balance helpers (from balance.repository.ts)
async function findOrCreateBalance(userId: string): Promise<{ balance: number }> {
  const record = await db.query.userBalance.findFirst({ where: eq(userBalance.userId, userId) });
  if (record) return { balance: Number(record.balance) };
  await db.insert(userBalance).values({ userId, balance: "100000.00", lastNonce: 0 });
  return { balance: 100000 };
}
async function updateBalance(userId: string, newBalance: string): Promise<void> {
  await db.update(userBalance).set({ balance: newBalance }).where(eq(userBalance.userId, userId));
}

// Round persistence (from blackjackRound.repository.ts)
interface HandSnapshot { result: string; bet: number; doubled: boolean; splitAces: boolean; }
async function persistBlackjackRound(data: { userId: string; totalBet: number; totalWin: number; handsSnapshot: HandSnapshot[]; balanceAfter: number; }): Promise<void> {
  await db.insert(blackjackRound).values({
    id: crypto.randomBytes(16).toString("hex"),
    userId: data.userId,
    totalBet: data.totalBet.toString(),
    totalWin: data.totalWin.toString(),
    handsSnapshot: data.handsSnapshot,
    balanceAfter: data.balanceAfter.toString(),
  });
}
```

Also add `import * as crypto from "crypto";` at the top.

Replace calls:
- `BalanceRepo.findOrCreate(userId)` → `findOrCreateBalance(userId)`
- `BalanceRepo.updateBalance(userId, ...)` → `updateBalance(userId, ...)`
- `BlackjackRoundRepo.createRound({...})` → `persistBlackjackRound({...})`

The `syncBalance` internal helper becomes:
```ts
async function syncBalance(userId: string, newBalance: number): Promise<void> {
  await updateBalance(userId, newBalance.toString());
}
```

- [ ] **Step 4: Create src/games/blackjack/router.ts**

Copy `src/routes/blackjack.ts`. Update imports:
```ts
import type { User, Vars } from "../../types"
import { mapResultToResponse } from "../../lib/errors"
import * as BlackjackService from "./service"
```

Export name stays `blackjackRoutes`.

- [ ] **Step 5: Typecheck blackjack**

```bash
bunx tsc --noEmit 2>&1 | grep "src/games/blackjack" | head -20
```

Expected: zero errors.

---

## Task 3: Migrate plinko

**Files:**
- Create: `src/games/plinko/types.ts`
- Create: `src/games/plinko/engine.ts`
- Create: `src/games/plinko/service.ts`
- Create: `src/games/plinko/router.ts`

- [ ] **Step 1: Create src/games/plinko/types.ts**

```ts
export interface PlinkoPlayResult {
  path: number[];
  finalBucket: number;
  multiplier: number;
  win: number;
  balance: number;
}
```

- [ ] **Step 2: Create src/games/plinko/engine.ts**

Copy `src/lib/plinko/engine.ts` verbatim. No import changes needed (no external dependencies).

- [ ] **Step 3: Create src/games/plinko/service.ts**

```ts
import * as crypto from "crypto";
import { type Result, ok, err, ErrorCode } from "../../lib/errors";
import { db } from "../../db/postgres";
import { userBalance, plinkoRound } from "../../db/schema";
import { eq } from "drizzle-orm";
import { dropBall, type Difficulty } from "./engine";
import type { PlinkoPlayResult } from "./types";

async function findOrCreateBalance(userId: string): Promise<{ balance: number }> {
  const record = await db.query.userBalance.findFirst({ where: eq(userBalance.userId, userId) });
  if (record) return { balance: Number(record.balance) };
  await db.insert(userBalance).values({ userId, balance: "100000.00", lastNonce: 0 });
  return { balance: 100000 };
}

async function updateBalance(userId: string, newBalance: string): Promise<void> {
  await db.update(userBalance).set({ balance: newBalance }).where(eq(userBalance.userId, userId));
}

async function createPlinkoRound(data: {
  userId: string; bet: number; totalWin: number; rows: number; difficulty: string;
  finalBucket: number; multiplier: number; balanceAfter: number;
}): Promise<void> {
  await db.insert(plinkoRound).values({
    id: crypto.randomBytes(16).toString("hex"),
    userId: data.userId,
    bet: data.bet.toString(),
    totalWin: data.totalWin.toString(),
    rows: data.rows,
    difficulty: data.difficulty,
    finalBucket: data.finalBucket,
    multiplier: data.multiplier.toString(),
    balanceAfter: data.balanceAfter.toString(),
  });
}

export async function play(
  userId: string, bet: number, rows: number, difficulty: Difficulty,
): Promise<Result<PlinkoPlayResult>> {
  const { balance: currentBalance } = await findOrCreateBalance(userId);
  if (currentBalance < bet) return err(ErrorCode.INSUFFICIENT_FUNDS);

  const seed = crypto.randomBytes(16).toString("hex");
  const result = dropBall(bet, rows, difficulty, seed);
  const newBalance = currentBalance - bet + result.win;

  await updateBalance(userId, newBalance.toString());
  await createPlinkoRound({ userId, bet, totalWin: result.win, rows, difficulty, finalBucket: result.finalBucket, multiplier: result.multiplier, balanceAfter: newBalance });

  return ok({ path: result.path, finalBucket: result.finalBucket, multiplier: result.multiplier, win: result.win, balance: newBalance });
}
```

- [ ] **Step 4: Create src/games/plinko/router.ts**

Copy `src/routes/plinko.ts`. Update imports:
```ts
import type { User, Vars } from "../../types"
import { mapResultToResponse } from "../../lib/errors"
import * as PlinkoService from "./service"
```

Export name stays `plinkoRoutes`.

- [ ] **Step 5: Typecheck plinko**

```bash
bunx tsc --noEmit 2>&1 | grep "src/games/plinko" | head -20
```

---

## Task 4: Migrate stats + expenses

**Files:**
- Create: `src/games/stats/service.ts`
- Create: `src/games/stats/router.ts`
- Create: `src/games/expenses/service.ts`
- Create: `src/games/expenses/router.ts`

- [ ] **Step 1: Create src/games/stats/service.ts**

Take `src/services/stats.service.ts`. Remove `import * as StatsRepo` and inline all DB query functions from `src/repositories/stats.repository.ts`.

Update imports at top:
```ts
import { type Result, ok } from "../../lib/errors";
import { db } from "../../db/postgres";
import { casinoSpin, blackjackRound, plinkoRound } from "../../db/schema";
import { eq, asc, desc } from "drizzle-orm";
// Remove: import * as StatsRepo, import type { RoundRecord, RecentPlinkoRecord } from repos
```

Inline these types (were in `src/repositories/stats.repository.ts`):
```ts
export interface RoundRecord { totalBet: string; totalWin: string; createdAt: Date; }
export interface BetWinRecord { totalBet: string; totalWin: string; }
export interface RecentSpinRecord { id: string; number: number; color: string; totalBet: string; totalWin: string; createdAt: Date; }
export interface RecentBlackjackRecord { id: string; totalBet: string; totalWin: string; handsSnapshot: unknown; createdAt: Date; }
export interface RecentPlinkoRecord { id: string; bet: string; totalWin: string; multiplier: string; finalBucket: number; difficulty: string; createdAt: Date; }
```

Inline these private DB functions (verbatim from `src/repositories/stats.repository.ts`, just removing the `export` keyword):
```ts
async function findRouletteRounds(userId: string): Promise<RoundRecord[]> {
  return db.query.casinoSpin.findMany({ where: eq(casinoSpin.userId, userId), columns: { totalBet: true, totalWin: true, createdAt: true }, orderBy: asc(casinoSpin.createdAt) });
}
async function findBlackjackRounds(userId: string): Promise<RoundRecord[]> {
  return db.query.blackjackRound.findMany({ where: eq(blackjackRound.userId, userId), columns: { totalBet: true, totalWin: true, createdAt: true }, orderBy: asc(blackjackRound.createdAt) });
}
async function findAllRounds(userId: string): Promise<{ spins: RoundRecord[]; bjRounds: RoundRecord[] }> {
  const [spins, bjRounds] = await Promise.all([findRouletteRounds(userId), findBlackjackRounds(userId)]);
  return { spins, bjRounds };
}
async function findRecentSpins(userId: string, limit: number): Promise<RecentSpinRecord[]> {
  return db.query.casinoSpin.findMany({ where: eq(casinoSpin.userId, userId), orderBy: desc(casinoSpin.createdAt), limit, columns: { id: true, number: true, color: true, totalBet: true, totalWin: true, createdAt: true } });
}
async function findRecentBlackjackRounds(userId: string, limit: number): Promise<RecentBlackjackRecord[]> {
  return db.query.blackjackRound.findMany({ where: eq(blackjackRound.userId, userId), orderBy: desc(blackjackRound.createdAt), limit, columns: { id: true, totalBet: true, totalWin: true, handsSnapshot: true, createdAt: true } });
}
async function findRouletteBetWins(userId: string): Promise<BetWinRecord[]> {
  return db.query.casinoSpin.findMany({ where: eq(casinoSpin.userId, userId), columns: { totalBet: true, totalWin: true } });
}
async function findBlackjackBetWins(userId: string): Promise<BetWinRecord[]> {
  return db.query.blackjackRound.findMany({ where: eq(blackjackRound.userId, userId), columns: { totalBet: true, totalWin: true } });
}
async function findRouletteRoundsUnordered(userId: string): Promise<RoundRecord[]> {
  return db.query.casinoSpin.findMany({ where: eq(casinoSpin.userId, userId), columns: { totalBet: true, totalWin: true, createdAt: true } });
}
async function findBlackjackRoundsUnordered(userId: string): Promise<RoundRecord[]> {
  return db.query.blackjackRound.findMany({ where: eq(blackjackRound.userId, userId), columns: { totalBet: true, totalWin: true, createdAt: true } });
}
async function findPlinkoRounds(userId: string): Promise<RoundRecord[]> {
  const rows = await db.query.plinkoRound.findMany({ where: eq(plinkoRound.userId, userId), columns: { bet: true, totalWin: true, createdAt: true }, orderBy: asc(plinkoRound.createdAt) });
  return rows.map((r) => ({ totalBet: r.bet, totalWin: r.totalWin, createdAt: r.createdAt }));
}
async function findRecentPlinkoRounds(userId: string, limit: number): Promise<RecentPlinkoRecord[]> {
  return db.query.plinkoRound.findMany({ where: eq(plinkoRound.userId, userId), orderBy: desc(plinkoRound.createdAt), limit, columns: { id: true, bet: true, totalWin: true, multiplier: true, finalBucket: true, difficulty: true, createdAt: true } });
}
async function findPlinkoBetWins(userId: string): Promise<BetWinRecord[]> {
  const rows = await db.query.plinkoRound.findMany({ where: eq(plinkoRound.userId, userId), columns: { bet: true, totalWin: true } });
  return rows.map((r) => ({ totalBet: r.bet, totalWin: r.totalWin }));
}
async function findPlinkoRoundsUnordered(userId: string): Promise<RoundRecord[]> {
  const rows = await db.query.plinkoRound.findMany({ where: eq(plinkoRound.userId, userId), columns: { bet: true, totalWin: true, createdAt: true } });
  return rows.map((r) => ({ totalBet: r.bet, totalWin: r.totalWin, createdAt: r.createdAt }));
}
```

Replace `StatsRepo.*` calls in the orchestration functions:
- `StatsRepo.findAllRounds(uid)` → `findAllRounds(uid)`
- `StatsRepo.findPlinkoRounds(uid)` → `findPlinkoRounds(uid)`
- `StatsRepo.findRouletteRoundsUnordered(uid)` → `findRouletteRoundsUnordered(uid)`
- `StatsRepo.findBlackjackRoundsUnordered(uid)` → `findBlackjackRoundsUnordered(uid)`
- `StatsRepo.findPlinkoRoundsUnordered(uid)` → `findPlinkoRoundsUnordered(uid)`
- `StatsRepo.findRouletteBetWins(uid)` → `findRouletteBetWins(uid)`
- `StatsRepo.findBlackjackBetWins(uid)` → `findBlackjackBetWins(uid)`
- `StatsRepo.findPlinkoBetWins(uid)` → `findPlinkoBetWins(uid)`
- `StatsRepo.findRecentSpins(uid, lim)` → `findRecentSpins(uid, lim)`
- `StatsRepo.findRecentBlackjackRounds(uid, lim)` → `findRecentBlackjackRounds(uid, lim)`
- `StatsRepo.findRecentPlinkoRounds(uid, lim)` → `findRecentPlinkoRounds(uid, lim)`

Update function signatures that used `StatsRepo.*` type prefixes:
```ts
// old: export function computeGameBreakdown(spins: StatsRepo.BetWinRecord[], bjRounds: StatsRepo.BetWinRecord[], ...)
// new: export function computeGameBreakdown(spins: BetWinRecord[], bjRounds: BetWinRecord[], ...)
// same for StatsRepo.RecentSpinRecord, StatsRepo.RecentBlackjackRecord, StatsRepo.RecentPlinkoRecord
```

- [ ] **Step 2: Create src/games/stats/router.ts**

Copy `src/routes/stats.ts`. Update imports:
```ts
import type { User, Vars } from "../../types"
import { mapResultToResponse } from "../../lib/errors"
import * as StatsService from "./service"
```

Export name stays `statsRoutes`.

- [ ] **Step 3: Create src/games/expenses/service.ts**

```ts
import { type Result, ok, err, ErrorCode } from "../../lib/errors";
import { db } from "../../db/postgres";
import { expenseTable } from "../../db/schema";
import { eq, sql } from "drizzle-orm";

export interface CreateExpenseInput { title: string; amount: number; date: string; }

async function findExpensesByUserId(userId: string) {
  return db.query.expenseTable.findMany({ where: eq(expenseTable.userId, userId) });
}
async function getExpenseTotalByUserId(userId: string): Promise<number> {
  const result = await db.select({ sum: sql`SUM(amount)` }).from(expenseTable).where(eq(expenseTable.userId, userId));
  return (result[0].sum as number) ?? 0;
}
async function createExpenseRecord(data: { title: string; amount: string; date: string; userId: string }) {
  const result = await db.insert(expenseTable).values(data).returning();
  return result[0] ?? null;
}
async function deleteExpenseById(id: number): Promise<void> {
  await db.delete(expenseTable).where(sql`id = ${id}`);
}

export async function listExpenses(userId: string): Promise<Result<{ expenses: unknown[] }>> {
  return ok({ expenses: await findExpensesByUserId(userId) });
}
export async function createExpense(userId: string, input: CreateExpenseInput): Promise<Result<unknown>> {
  const created = await createExpenseRecord({ title: input.title, amount: input.amount.toString(), date: input.date, userId });
  if (!created?.id) return err(ErrorCode.EXPENSE_CREATE_FAILED, "Failed to create expense");
  return ok(created);
}
export async function deleteExpense(id: number): Promise<Result<{ message: string }>> {
  await deleteExpenseById(id);
  return ok({ message: "Expense deleted" });
}
export async function getTotal(userId: string): Promise<Result<{ total: number }>> {
  return ok({ total: await getExpenseTotalByUserId(userId) });
}
```

- [ ] **Step 4: Create src/games/expenses/router.ts**

Copy `src/routes/expenses.ts`. Update imports:
```ts
import { createExpenseSchema } from "../../zodTypes"
import type { User, Vars } from "../../types"
import { mapResultToResponse, mapResultToResponseWithStatus } from "../../lib/errors"
import * as ExpenseService from "./service"
```

Export name stays `expensesRoutes`.

- [ ] **Step 5: Typecheck stats + expenses**

```bash
bunx tsc --noEmit 2>&1 | grep "src/games/stats\|src/games/expenses" | head -20
```

---

## Task 5: Update src/index.ts and delete old directories

**Files:**
- Modify: `src/index.ts`
- Delete: `src/routes/`, `src/services/`, `src/repositories/`

- [ ] **Step 1: Update src/index.ts**

Replace route imports:
```ts
// old → new
import { expensesRoutes } from "./routes/expenses"   → import { expensesRoutes } from "./games/expenses/router"
import { casinoRoutes } from "./routes/casino"        → import { casinoRoutes } from "./games/roulette/router"
import { blackjackRoutes } from "./routes/blackjack"  → import { blackjackRoutes } from "./games/blackjack/router"
import { plinkoRoutes } from "./routes/plinko"        → import { plinkoRoutes } from "./games/plinko/router"
import { statsRoutes } from "./routes/stats"          → import { statsRoutes } from "./games/stats/router"
```

Everything else in `src/index.ts` stays unchanged (auth, middleware, rate limiters, `/api/me` handler, `auth.handler`, static serving, port).

- [ ] **Step 2: Full typecheck — must be clean**

```bash
bunx tsc --noEmit 2>&1 | head -30
```

Expected: zero errors. If errors exist, fix before deleting old files.

- [ ] **Step 3: Delete old directories**

```bash
rm -rf src/routes src/services src/repositories
```

- [ ] **Step 4: Typecheck after deletion**

```bash
bunx tsc --noEmit 2>&1
```

Expected: zero errors.

- [ ] **Step 5: Verify server boots**

```bash
bun run src/index.ts 2>&1 | head -5
```

Expected: server starts on port 2137.

---

## Task 6: Migrate client games

**Files:**
- Create: `client/src/games/roulette/`
- Create: `client/src/games/blackjack/`
- Create: `client/src/games/plinko/`
- Create: `client/src/games/stats/`
- Modify: `client/src/hooks/useStats.ts`

- [ ] **Step 1: Migrate roulette client**

```bash
mkdir -p client/src/games/roulette
```

Copy `client/src/lib/roulette/utils.ts` → `client/src/games/roulette/utils.ts`. No `@server/` import changes needed (server paths unchanged).

Copy `client/src/hooks/roulette/useSpinResult.ts` → `client/src/games/roulette/useSpinResult.ts`. Update sub-hook import if needed (`./useSpinNotifications` → relative stays same since they'll be in same dir).

Copy `client/src/hooks/roulette/useSpinNotifications.ts` → `client/src/games/roulette/useSpinNotifications.ts`.

Create `client/src/games/roulette/useRoulette.ts` — copy from `client/src/hooks/roulette/useRoulette.ts` with these changes:

```ts
// Remove:
import { fetchBalance, fetchNonce, submitSpin } from "@/lib/roulette/api";
import { generateClientSeed, generateIdempotencyKey } from "@/lib/roulette/utils";
import { useSpinNotifications } from "./useSpinNotifications";
import { useSpinResult } from "./useSpinResult";

// Add:
import { api } from "@/lib/api";
import type { SpinResponse } from "@server/types";
import { generateClientSeed, generateIdempotencyKey } from "./utils";
import { useSpinNotifications } from "./useSpinNotifications";
import { useSpinResult } from "./useSpinResult";
```

Replace `fetchBalance` queryFn inline:
```ts
queryFn: async () => {
  const res = await api.casino.balance.$get();
  if (!res.ok) throw new Error("Failed to fetch balance");
  return res.json() as Promise<{ balance: number }>;
},
```

Replace `fetchNonce` queryFn inline:
```ts
queryFn: async () => {
  const res = await api.casino.nonce.$get();
  if (!res.ok) throw new Error("Failed to fetch nonce");
  return res.json() as Promise<{ nextNonce: number }>;
},
```

Replace `submitSpin(...)` call inline:
```ts
const res = await api.casino.spin.$post({ json: { clientSeed, nonce: nextNonce, idempotencyKey, bets: bets.map((b) => ({ type: b.type, amount: b.amount, color: b.color || undefined, choice: b.choice, numbers: b.numbers || [] })) } });
const data = (await res.json()) as SpinApiResult;
const status = res.status;
```

Also update the import of `SpinResponse` in `useSpinResult.ts`:
```ts
// old: import type { SpinResponse } from "@server/types";
// new: import type { SpinResponse } from "@server/types";   ← stays the same! src/types.ts not moved
```

- [ ] **Step 2: Migrate blackjack client**

```bash
mkdir -p client/src/games/blackjack
```

Copy `client/src/lib/blackjack/cardHelpers.ts` → `client/src/games/blackjack/cardHelpers.ts`.
Copy `client/src/lib/blackjack/types.ts` → `client/src/games/blackjack/types.ts`.

Copy `client/src/hooks/blackjack/useBlackjackNotifications.ts` → `client/src/games/blackjack/useBlackjackNotifications.ts`. Update import if it imports from `@/lib/blackjack`:
```ts
// old: import type { ... } from "@/lib/blackjack";
// new: import type { ... } from "./types";
```

Copy `client/src/hooks/blackjack/useBlackjackAnimation.ts` → `client/src/games/blackjack/useBlackjackAnimation.ts`. Update barrel import:
```ts
// old (single barrel):
import { type BlackjackGameState, buildDisplayState, countAllCards } from "@/lib/blackjack";
// new (two targeted):
import type { BlackjackGameState } from "./types";
import { buildDisplayState, countAllCards } from "./cardHelpers";
```

Create `client/src/games/blackjack/useBlackjack.ts` — copy from `client/src/hooks/blackjack/useBlackjack.ts` with these changes:

```ts
// Remove these imports:
import {
  submitAction as apiAction, clearGame as apiClear, deal as apiDeal,
  fetchShoeInfo as apiFetchShoeInfo, fetchState as apiFetchState,
  submitInsurance as apiInsurance,
  type BlackjackAction, type BlackjackGameState, canSplitHand,
  type InsuranceDecision, isApiError, type ShoeInfo,
} from "@/lib/blackjack";
import { fetchBalance } from "@/lib/roulette/api";
import { useBlackjackAnimation } from "./blackjack/useBlackjackAnimation";
import { ACTION_ERRORS, DEAL_ERRORS, INSURANCE_ERRORS, useBlackjackNotifications } from "./blackjack/useBlackjackNotifications";

// Also remove these re-export lines:
export type { BlackjackAction, BlackjackGameState, CardData, GamePhase, Hand, HandResult, InsuranceDecision, Rank, Suit } from "@/lib/blackjack";
export { canSplitHand, handTotal, isSoftHand } from "@/lib/blackjack";

// Add instead:
import { api } from "@/lib/api";
import {
  type BlackjackAction, type BlackjackGameState, canSplitHand,
  type InsuranceDecision, isApiError, type ShoeInfo,
} from "./types";
import { useBlackjackAnimation } from "./useBlackjackAnimation";
import { ACTION_ERRORS, DEAL_ERRORS, INSURANCE_ERRORS, useBlackjackNotifications } from "./useBlackjackNotifications";

// Re-exports (update to new locations):
export type { BlackjackAction, BlackjackGameState, CardData, GamePhase, Hand, HandResult, InsuranceDecision, Rank, Suit } from "./types";
export { canSplitHand, handTotal, isSoftHand } from "./cardHelpers";
```

Replace the `fetchBalance` queryFn:
```ts
queryFn: async () => {
  const res = await api.casino.balance.$get();
  if (!res.ok) throw new Error("Failed to fetch balance");
  return res.json() as Promise<{ balance: number }>;
},
```

Replace `apiFetchState()` call site:
```ts
const res = await api.blackjack.state.$get();
if (!res.ok) throw new Error(`GET /state failed: ${res.status}`);
const data = await res.json() as { game: BlackjackGameState | null };
```

Replace `apiDeal(bet)`:
```ts
const res = await api.blackjack.deal.$post({ json: { bet } });
const data = await res.json() as BlackjackApiResult;
```

Replace `apiInsurance(decision)`:
```ts
const res = await api.blackjack.insurance.$post({ json: { decision } });
const data = await res.json() as BlackjackApiResult;
```

Replace `apiAction(action)`:
```ts
const res = await api.blackjack.action.$post({ json: { action } });
const data = await res.json() as BlackjackApiResult;
```

Replace `apiClear()`:
```ts
await api.blackjack.clear.$post();
```

Replace `apiFetchShoeInfo()` (the queryFn):
```ts
queryFn: async () => {
  try {
    const res = await api.blackjack["shoe-info"].$get();
    if (!res.ok) throw new Error(`GET /shoe-info failed: ${res.status}`);
    return res.json() as Promise<ShoeInfo>;
  } catch {
    return { cardsRemaining: null, penetration: null };
  }
},
```

Note: `BlackjackApiResult` type is in `./types` (moved from `client/src/lib/blackjack/types.ts`).

- [ ] **Step 3: Migrate plinko client**

```bash
mkdir -p client/src/games/plinko
```

Copy `client/src/lib/plinko/multipliers.ts` → `client/src/games/plinko/multipliers.ts`.

Copy `client/src/hooks/plinko/usePlinkoCanvas.ts` → `client/src/games/plinko/usePlinkoCanvas.ts`. Update multipliers import if present:
```ts
// old: import { ... } from "@/lib/plinko/multipliers";
// new: import { ... } from "./multipliers";
```

Create `client/src/games/plinko/usePlinkoGame.ts` — copy from `client/src/hooks/plinko/usePlinkoGame.ts` with these changes:

```ts
// Remove:
import { type Difficulty, playPlinko } from "@/lib/plinko/api";

// Add:
import { api } from "@/lib/api";
export type Difficulty = "low" | "medium" | "high" | "expert";
```

Replace `playPlinko({ bet, rows, difficulty })` call:
```ts
const res = await api.plinko.play.$post({ json: { bet, rows, difficulty } });
if (!res.ok) {
  const errData = await res.json().catch(() => ({}));
  throw new Error((errData as { error?: string }).error ?? "Play failed");
}
const result = await res.json() as { path: number[]; finalBucket: number; multiplier: number; win: number; balance: number };
```

- [ ] **Step 4: Migrate stats types**

```bash
mkdir -p client/src/games/stats
cp client/src/lib/stats/types.ts client/src/games/stats/types.ts
```

- [ ] **Step 5: Update client/src/hooks/useStats.ts**

Replace imports:
```ts
// Remove:
import { fetchBalanceHistory, fetchDaily, fetchGameBreakdown, fetchHourlyHeatmap, fetchOverview, fetchRecent } from "@/lib/stats/api";
import type { BalanceHistoryResponse, DailyResponse, GameBreakdownResponse, HourlyHeatmapResponse, RecentResponse, StatsOverview } from "@/lib/stats/types";

// Add:
import type { BalanceHistoryResponse, DailyResponse, GameBreakdownResponse, HourlyHeatmapResponse, RecentResponse, StatsOverview } from "@/games/stats/types";

// Add inline fetch helper (after imports):
const BASE = "/api/stats";
async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(`GET ${BASE}${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}
```

Replace each `fetchXxx()` call:

| Old | New |
|-----|-----|
| `fetchOverview` | `() => get<StatsOverview>("/overview")` |
| `fetchBalanceHistory(limit)` | `() => get<BalanceHistoryResponse>(\`/balance-history?limit=${limit}\`)` |
| `fetchDaily(days)` | `() => get<DailyResponse>(\`/daily?days=${days}\`)` |
| `fetchHourlyHeatmap` | `() => get<HourlyHeatmapResponse>("/hourly-heatmap")` |
| `fetchGameBreakdown` | `() => get<GameBreakdownResponse>("/game-breakdown")` |
| `fetchRecent(limit)` | `() => get<RecentResponse>(\`/recent?limit=${limit}\`)` |

- [ ] **Step 6: Check for remaining consumers of deleted paths**

```bash
cd /home/fenta/Projects/casino && grep -r "@/lib/roulette\|@/lib/blackjack\|@/lib/plinko\|@/lib/stats" client/src --include="*.ts" --include="*.tsx"
grep -r "@/hooks/roulette\|@/hooks/blackjack\|@/hooks/plinko" client/src --include="*.ts" --include="*.tsx"
```

Expected: zero results. Fix any remaining consumers.

- [ ] **Step 7: Delete old client directories**

```bash
rm -rf client/src/lib/roulette client/src/lib/blackjack client/src/lib/plinko client/src/lib/stats
rm -rf client/src/hooks/roulette client/src/hooks/blackjack client/src/hooks/plinko
```

- [ ] **Step 8: Client typecheck**

```bash
cd /home/fenta/Projects/casino/client && bunx tsc --noEmit 2>&1 | head -30
```

Expected: zero errors.
