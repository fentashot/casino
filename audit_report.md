# Casino Project — Security & Architecture Audit Report

## Executive Summary: 4/10

Play-money casino with roulette, blackjack, and plinko. Clean separation (router → service → engine), type-safe API via Hono RPC, provably fair roulette. However, **every single game has a critical race condition on balance operations** — the fundamental financial primitive of the entire application is broken. Plinko is not provably fair. Blackjack shoe lives in-memory. Rate limiting is trivially bypassable. No tests exist. The codebase reads well but is structurally unsound for any environment where balance integrity matters.

---

## Critical Issues

### C1. Race Condition: Balance Read-Check-Write Not Atomic (ALL GAMES)

**Location:** `src/games/plinko/service.ts:26-42`, `src/games/roulette/service.ts:178-242`, `src/games/blackjack/service.ts:81-96`

**Problem:** Every game follows this pattern:
```
1. READ balance          ← T1 reads 1000
2. CHECK balance >= bet  ← T1: 1000 >= 500 ✓
3. COMPUTE new balance   ← T1: 1000 - 500 = 500
                         ← T2 reads 1000 (before T1 writes)
4. WRITE new balance     ← T1 writes 500
                         ← T2 writes 500 (should be 0)
```
Two concurrent requests each deduct from the same stale balance. User bets 500 twice with 1000 balance — ends up with 500 instead of 0 (or negative if they lost).

**Risk:** Users can drain the house by firing concurrent requests. Trivial exploit with a simple script.

**Fix:** Wrap the entire flow in a DB transaction with `SELECT ... FOR UPDATE` on `user_balance` row. Alternatively, use an atomic `UPDATE ... SET balance = balance - $bet WHERE balance >= $bet RETURNING balance` and check the affected row count.

**Roulette partially mitigates** this via nonce validation (concurrent requests with the same nonce will fail), but there's still a TOCTOU gap between the nonce check and the transaction commit. The nonce check and balance update must be inside the same transaction with a row lock.

**Plinko has zero mitigation** — no nonce, no idempotency, no transaction. This is the most exploitable game.

**Blackjack partially mitigates** via the "one active game per user" constraint (PK on userId), but the deal endpoint has the same read-check-write gap.

---

### C2. Plinko: Not Provably Fair, No Idempotency, No Transaction

**Location:** `src/games/plinko/service.ts:37-53`

**Problem:**
1. **Seed generated but never stored** — `crypto.randomBytes(16)` used for the drop, but the seed is not persisted in `plinko_round`. Users cannot verify results.
2. **No idempotency key** — duplicate requests create duplicate rounds and double-deduct balance.
3. **Balance update and round insert are separate queries** — if `createRound()` fails after `updateBalance()` succeeds, balance is deducted with no record.
4. **No nonce** — unlike roulette, there's no sequential ordering to prevent replays.

**Risk:** Unverifiable game results. Silent balance corruption on partial failures. Trivial double-spend via concurrent requests.

**Fix:**
1. Store seed in `plinko_round` table (add column).
2. Add idempotency key to the play request schema.
3. Wrap `updateBalance` + `createRound` in a single `db.transaction()`.
4. Consider adding nonce support or at minimum use `SELECT ... FOR UPDATE`.

---

### C3. Blackjack Shoe: In-Memory Map, Lost on Restart

**Location:** `src/games/blackjack/engine/shoeManager.ts:12`

**Problem:** `const shoeStore = new Map<string, UserShoe>()` — card shoes exist only in Node.js heap memory.

**Impact:**
1. Server restart = all shoes lost. Users get a fresh shoe mid-game, breaking card counting expectations and game integrity.
2. Multi-instance deployment impossible — each instance has independent shoe state.
3. Memory leak: shoes are never evicted for inactive users. `shoeStore` grows unbounded.

**Fix:** Persist shoe state to DB (add a `blackjack_shoe` table or store in `blackjack_active_game`). Alternatively, generate shoe deterministically from a seed stored in DB so it can be reconstructed.

---

### C4. Rate Limiter IP Spoofing

**Location:** `src/middleware/index.ts:17-23`

**Problem:**
```typescript
function clientIp(c: Context): string {
  return (
    c.req.header("x-forwarded-for") ||  // ← attacker-controlled
    c.req.header("cf-connecting-ip") ||
    "unknown"
  );
}
```
`x-forwarded-for` is client-settable unless stripped by a reverse proxy. Any attacker can send `X-Forwarded-For: random-ip-{N}` to bypass all rate limits entirely.

**Risk:** All rate limiting is effectively disabled against a motivated attacker.

**Fix:** If behind Cloudflare, trust only `cf-connecting-ip`. If behind a custom proxy, configure it to overwrite (not append) `x-forwarded-for`. Add a config option to select the trusted header. Fallback to socket remote address, not `"unknown"` (all unknown IPs share one bucket).

---

### C5. `findOrCreateBalance` Has a Race Condition (Double Insert)

**Location:** `src/db/queries/balance.ts:18-36`

**Problem:**
```typescript
const existing = await db.query.userBalance.findFirst(...);
if (existing) return { balance: Number(existing.balance) };
await db.insert(userBalance).values({ userId, balance: DEFAULT_BALANCE, ... });
```
Two concurrent requests for a new user: both read `null`, both insert → unique constraint violation on `userId` PK, unhandled error crashes the request.

**Fix:** Use `INSERT ... ON CONFLICT DO NOTHING` followed by a `SELECT`. Or use a single upsert.

---

## High Severity Issues

### H1. Roulette: Idempotency Key Is Optional

**Location:** `src/zodTypes.ts` — `idempotencyKey: z.string().min(16).max(64).optional()`

**Problem:** Without an idempotency key, there is no protection against accidental double-submits (network retry, user double-click). The nonce provides ordering but not idempotency if the client retries with an incremented nonce.

**Fix:** Make `idempotencyKey` required.

---

### H2. Roulette: No Maximum Bet Validation

**Location:** `src/zodTypes.ts` — `amount: z.number().int().positive()`

**Problem:** No upper bound on bet amount. A user with 100,000 balance can place a single 100,000 straight bet (35:1 payout = 3,500,000 win). Blackjack has `max(1_000_000)` but roulette has none.

**Fix:** Add `.max(MAX_BET)` to the roulette bet schema. Define per-bet-type limits if needed.

---

### H3. Error Responses Leak Internal State

**Location:** `src/games/roulette/service.ts:182-184,191-196`

**Problem:**
```typescript
return err(ErrorCode.INSUFFICIENT_FUNDS, `...need ${totalBet}, have ${current}`, { required: totalBet, current });
return err(ErrorCode.INVALID_NONCE, `...expected ${expectedNonce}, got ${input.nonce}`, { expectedNonce, receivedNonce: input.nonce });
```
Error details expose exact balance and expected nonce to the client. An attacker can:
- Probe balance without calling the balance endpoint.
- Discover nonce to craft valid spin requests.

**Fix:** Remove `details` objects and internal values from error messages in production. Return generic messages; log details server-side.

---

### H4. Blackjack: `persistRound` Race Condition

**Location:** `src/games/blackjack/service.ts:248-249`

**Problem:**
```typescript
if (await isPersisted(game.id)) return;   // T1 reads false
await markPersisted(game.id);             // T1 marks true
// T2 reads false (before T1's write propagates)
// T2 also proceeds → duplicate blackjack_round insert
```
`isPersisted` + `markPersisted` is not atomic. Two concurrent requests (e.g., `getState` + `clearFinishedGame` racing) can both pass the check and insert duplicate rounds.

**Fix:** Use a unique constraint on `blackjack_round.gameId` (if column doesn't exist, add it) combined with `INSERT ... ON CONFLICT DO NOTHING`. Or use `UPDATE ... WHERE persisted = false RETURNING *` as an atomic check-and-set.

---

### H5. N+1 Query: `getUserRole()` on Every Request

**Location:** `src/auth.ts` — `useAuthMiddleware`

**Problem:** Every authenticated request runs `getUserRole(session.user.id)` — a separate DB query. For a user playing blackjack (60 actions/min rate limit), that's 60 extra queries/min just for role checks.

**Fix:** Cache role in the session/JWT token. Only refetch on role change (admin promotion is rare).

---

### H6. Floating-Point Arithmetic on Financial Values

**Location:** `src/db/queries/balance.ts:26` — `Number(existing.balance)`, `src/games/plinko/service.ts:40` — `currentBalance - bet + result.win`

**Problem:** `balance` is stored as `numeric` (arbitrary precision) in Postgres but converted to JavaScript `Number` (IEEE 754 float64) for all arithmetic. For integer bets this is currently safe, but:
- `Number("99999999999999.99")` loses precision silently.
- Any future fractional bet support will introduce rounding errors.

**Fix:** Use a decimal library (e.g., `decimal.js`) or keep all arithmetic in integer cents. At minimum, add a comment/assertion that bets are always integers.

---

## Medium Severity Issues

### M1. CORS Only on `/api/auth/*`, Not on Game Endpoints

**Location:** `src/index.ts:61` — `app.use("/api/auth/*", authCors)`

**Problem:** CORS middleware is applied only to auth routes. Game API routes (`/api/casino/*`, `/api/blackjack/*`, `/api/plinko/*`) have no CORS configuration. In production (different origin), browser preflight will fail for game endpoints, or worse — no CORS means the browser's same-origin policy may be the only protection.

**Fix:** Apply CORS to all `/api/*` routes with a properly configured origin whitelist.

---

### M2. In-Memory Rate Limiting — Lost on Restart, No Multi-Instance

**Location:** `src/middleware/index.ts:59-88`

**Problem:** `hono-rate-limiter` defaults to in-memory storage. Server restart resets all counters. Multiple instances don't share state.

**Fix:** Use a Redis-backed store for rate limiting.

---

### M3. Trusted Origins Hardcoded

**Location:** `src/auth.ts` — `trustedOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"]`

**Problem:** No production origin configured. Deploying to a real domain will break Better-Auth CSRF protection or require code changes.

**Fix:** Read from `TRUSTED_ORIGINS` environment variable.

---

### M4. Stats Deduplication Uses Timestamp+Bet+Win Instead of ID

**Location:** `src/games/stats/service.ts`

**Problem:** Deduplication key is `${createdAt}|${totalBet}|${totalWin}`. Two identical bets at the same millisecond are incorrectly deduplicated.

**Fix:** Use the game round ID as the deduplication key.

---

### M5. No Centralized Logging

**Problem:** Only `console.error("[unhandled]", err)` for unhandled errors and Hono's stdout access logger. No structured logging, no log levels, no external log drain.

**Fix:** Add `pino` or similar. Log to stdout in structured JSON format for production log aggregation.

---

### M6. Blackjack JSONB State Not Validated on Read

**Location:** `src/games/blackjack/engine/gameStore.ts:31` — `row.state as BlackjackGameState`

**Problem:** Raw `as` cast on JSONB from Postgres. If the JSONB is corrupted or schema-drifted (e.g., after a code deployment that changes `BlackjackGameState` shape), this silently produces an invalid object.

**Fix:** Validate with Zod on read, or add a schema version field to the JSONB.

---

### M7. Seed Rotation Not Transactional

**Location:** `src/games/roulette/service.ts:108-117`

**Problem:**
```typescript
await seedQueries.deactivateAll();     // Step 1
const newSeed = crypto.randomBytes(32)...;
await seedQueries.create(newId, newSeed, newHash); // Step 2
```
If the process crashes between step 1 and step 2, there are zero active seeds. All spin requests fail until manual intervention.

**Fix:** Wrap in a transaction: deactivate old + insert new atomically.

---

### M8. `"unknown"` IP Key for All Headerless Requests

**Location:** `src/middleware/index.ts:22`

**Problem:** All requests without `x-forwarded-for` or `cf-connecting-ip` headers share the `"unknown"` rate limit bucket. One user hitting the limit blocks all users in the same bucket.

**Fix:** Fall back to the actual TCP socket remote address.

---

## Technical Debt & Refactoring

### D1. No Test Suite

The CLAUDE.md explicitly states "No test suite exists in this repo." For a financial application handling balance operations, this is unacceptable. At minimum:
- Engine unit tests (pure functions: `calculateWinnings`, `dropBall`, `dealGame`, card engine).
- Integration tests for balance race conditions.
- API endpoint tests for auth + validation.

### D2. Duplicated Balance Wrappers

Each service file re-wraps `balanceQueries.findOrCreateBalance` and `balanceQueries.updateBalance` with identical pass-through functions. Example: `src/games/blackjack/service.ts:232-236`, `src/games/plinko/service.ts:64-75`.

### D3. `expense_table` — Unrelated Feature

An expenses tracker exists alongside casino games (schema, router, service). Unclear purpose — should be a separate module or removed.

### D4. Global Error Handler Logs Full Error Object

`console.error("[unhandled]", err)` — in production this dumps stack traces to stdout. Fine for dev, noisy and potentially leaky in production.

### D5. No Health Check Endpoint

No `/healthz` or `/readyz` endpoint for container orchestration.

---

## Implementation Roadmap for Agents

Priority order. Each step is independent unless noted.

### Step 1: Fix Balance Race Conditions (CRITICAL)

**Files to modify:**
- `src/db/queries/balance.ts` — Add `deductBalanceAtomic(userId, amount)` function using raw SQL: `UPDATE user_balance SET balance = balance - $1 WHERE user_id = $2 AND balance >= $1 RETURNING balance`
- `src/games/plinko/service.ts` — Rewrite `play()`: wrap in `db.transaction()`, use atomic deduct, insert round inside same transaction.
- `src/games/roulette/service.ts` — Move balance check + nonce validation inside `createSpinWithBets` transaction. Use `SELECT ... FOR UPDATE` on `user_balance` row before reading.
- `src/games/blackjack/service.ts` — Wrap `deal()` balance check + deduct + `saveGame` in a transaction with row lock.
- `src/db/queries/balance.ts` — Fix `findOrCreateBalance` to use `INSERT ... ON CONFLICT DO NOTHING` then `SELECT`.

### Step 2: Fix Plinko Provably Fair + Idempotency

**Files to modify:**
- `src/db/schema.ts` — Add `seed` column to `plinko_round` table, add `idempotencyKey` column with unique constraint.
- `drizzle/` — Generate and run migration.
- `src/games/plinko/service.ts` — Store seed in round. Add idempotency check at start of `play()`.
- `src/zodTypes.ts` (or plinko-specific schema) — Add idempotency key to play request schema.

### Step 3: Fix Rate Limiter IP Extraction

**Files to modify:**
- `src/middleware/index.ts` — Add environment variable `TRUSTED_PROXY_HEADER` (default: none). Only trust configured header. Fall back to Bun's `c.env.remoteAddress` or equivalent socket address. Remove `"unknown"` fallback — use actual IP.

### Step 4: Fix Blackjack `persistRound` Race Condition

**Files to modify:**
- `src/db/schema.ts` — Add `gameId` column to `blackjack_round` with unique constraint (if not already present).
- `src/games/blackjack/service.ts` — Replace `isPersisted` + `markPersisted` pattern with `INSERT ... ON CONFLICT(gameId) DO NOTHING`.

### Step 5: Persist Blackjack Shoe

**Files to modify:**
- `src/db/schema.ts` — Add `blackjack_shoe` table or add `shoe` JSONB column to `blackjack_active_game`.
- `src/games/blackjack/engine/shoeManager.ts` — Replace `Map<string, UserShoe>` with DB-backed storage. Keep in-memory cache with DB as source of truth.
- Add shoe eviction for inactive users (TTL-based cleanup).

### Step 6: Sanitize Error Responses

**Files to modify:**
- `src/lib/errors.ts` — Add `NODE_ENV` check in `toJSON()`. In production, omit `details` and replace internal messages with generic ones.
- `src/games/roulette/service.ts` — Remove balance amount and nonce values from error messages.
- `src/games/plinko/service.ts` — Same.
- `src/games/blackjack/service.ts` — Same.

### Step 7: Add Missing Validation

**Files to modify:**
- `src/zodTypes.ts` — Add `.max(MAX_BET)` to roulette bet amount. Make `idempotencyKey` required (`.string().min(16).max(64)`). Add bet-type-specific validation (e.g., `straight` requires exactly 1 number).

### Step 8: Fix CORS and Auth Configuration

**Files to modify:**
- `src/middleware/index.ts` — Apply CORS to all `/api/*` routes. Read origins from environment variable.
- `src/auth.ts` — Read `trustedOrigins` from environment variable.

### Step 9: Add Seed Rotation Transaction

**Files to modify:**
- `src/games/roulette/service.ts` — Wrap `rotateSeed()` in `db.transaction()`.

### Step 10: Add Test Suite (Foundation)

**Create:**
- `tests/engine/roulette.test.ts` — Unit tests for `calculateWinnings`, `computeHmac`, `hashToNumber`.
- `tests/engine/blackjack.test.ts` — Unit tests for deal, hit, stand, double, split, settle.
- `tests/engine/plinko.test.ts` — Unit tests for `dropBall`.
- `tests/integration/balance-race.test.ts` — Concurrent balance operations test.
- `package.json` — Add test script using Bun's test runner.
