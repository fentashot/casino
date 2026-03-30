# Game Module Structure — Design Spec

**Date:** 2026-03-30
**Status:** Approved
**Scope:** Full-stack restructure of casino game logic into self-contained feature folders

---

## Problem

Game logic is currently spread across five separate top-level directories with unnecessary layers:

- `src/routes/` — HTTP handlers
- `src/services/` — orchestration
- `src/repositories/` — thin DB wrappers (redundant layer)
- `src/lib/` — pure game engines
- `client/src/hooks/` — client-side game state
- `client/src/lib/{game}/api.ts` — hono client wrappers (redundant layer)

Adding a new game requires touching all five directories. The repository layer adds indirection with no benefit — DB queries belong directly in `service.ts`. The client `api.ts` files are just wrappers on hono client with no logic.

---

## Goal

Each game lives in one self-contained folder. The only public surface is a Hono router. DB access lives in `service.ts`. Client hooks call hono client directly.

---

## Approach: Feature Folders

Chosen over:
- **Index barrel modules** — same structure, adds 3 boilerplate files with no real enforcement benefit
- **Monorepo packages** — correct isolation mechanism but overkill overhead for a single-server app

---

## Server Structure

```
src/
  games/
    roulette/
      router.ts    ← Hono router (only public export, mounted in app entry)
      service.ts   ← orchestration + DB queries (no separate repository layer)
      engine.ts    ← pure provably-fair logic (from src/lib/roulette/)
      types.ts     ← all roulette-specific types
    blackjack/
      router.ts
      service.ts
      engine/
        cardEngine.ts
        gameLogic.ts
        gameStore.ts
        shoeManager.ts
      types.ts
    plinko/
      router.ts
      service.ts
      engine.ts
      types.ts
  shared/
    services/
      stats.service.ts
      expense.service.ts
    routes/
      stats.ts
      expenses.ts
    lib/
      errors.ts       ← Result<T>, ErrorCode, mapResultToResponse
      casinoHelpers.ts
      types.ts        ← Vars and app-wide TS types (from src/types.ts)
      zodTypes.ts     ← shared Zod schemas (from src/zodTypes.ts)
    db/               ← schema, client configs (postgres.ts, turso.ts)
    middleware/
    auth.ts
```

### File moves (server)

| From | To |
|------|----|
| `src/routes/casino.ts` | `src/games/roulette/router.ts` |
| `src/services/roulette.service.ts` | `src/games/roulette/service.ts` |
| `src/repositories/spin.repository.ts` | merged into `src/games/roulette/service.ts` |
| `src/repositories/seed.repository.ts` | merged into `src/games/roulette/service.ts` |
| `src/repositories/balance.repository.ts` | merged into each game's `service.ts` (inline) |
| `src/lib/roulette/engine.ts` + `constants.ts` + `utils.ts` + `index.ts` | `src/games/roulette/engine.ts` (flatten) |
| `src/lib/roulette/types.ts` | merged into `src/games/roulette/types.ts` |
| `src/routes/blackjack.ts` | `src/games/blackjack/router.ts` |
| `src/services/blackjack.service.ts` | `src/games/blackjack/service.ts` |
| `src/repositories/blackjackRound.repository.ts` | merged into `src/games/blackjack/service.ts` |
| `src/lib/blackjack/` | `src/games/blackjack/engine/` (all files moved as-is) |
| `src/routes/plinko.ts` | `src/games/plinko/router.ts` |
| `src/services/plinko.service.ts` | `src/games/plinko/service.ts` |
| `src/repositories/plinkoRound.repository.ts` | merged into `src/games/plinko/service.ts` |
| `src/lib/plinko/engine.ts` | `src/games/plinko/engine.ts` |
| `src/lib/plinko/index.ts` | deleted (re-export barrel) |
| `src/repositories/stats.repository.ts` | merged into `src/shared/services/stats.service.ts` |
| `src/repositories/expense.repository.ts` | merged into `src/shared/services/expense.service.ts` |
| `src/services/stats.service.ts` | `src/shared/services/stats.service.ts` |
| `src/services/expense.service.ts` | `src/shared/services/expense.service.ts` |
| `src/routes/stats.ts` | `src/shared/routes/stats.ts` |
| `src/routes/expenses.ts` | `src/shared/routes/expenses.ts` |
| `src/lib/errors.ts` | `src/shared/lib/errors.ts` |
| `src/lib/casinoHelpers.ts` | `src/shared/lib/casinoHelpers.ts` |
| `src/types.ts` | `src/shared/lib/types.ts` |
| `src/zodTypes.ts` | `src/shared/lib/zodTypes.ts` |
| `src/lib/RouletteEngine.ts` | deleted (backward-compat shim) |
| `src/repositories/index.ts` | deleted |
| `src/services/index.ts` | deleted |

---

## Client Structure

```
client/src/
  games/
    roulette/
      useRoulette.ts         ← calls hono client directly
      useSpinResult.ts
      useSpinNotifications.ts
      utils.ts               ← roulette client helpers (from lib/roulette/utils.ts)
      types.ts               ← roulette client types (from lib/roulette/types.ts)
    blackjack/
      useBlackjack.ts        ← calls hono client directly
      useBlackjackAnimation.ts
      useBlackjackNotifications.ts
      cardHelpers.ts         ← from lib/blackjack/cardHelpers.ts
      types.ts               ← from lib/blackjack/types.ts
    plinko/
      usePlinkoGame.ts       ← calls hono client directly
      usePlinkoCanvas.ts
  hooks/
    useStats.ts              ← calls hono client directly
    use-toast.ts
```

**Deleted client files (redundant wrappers):**
- `client/src/lib/roulette/api.ts`
- `client/src/lib/blackjack/api.ts`
- `client/src/lib/roulette/index.ts`
- `client/src/lib/blackjack/index.ts`

### File moves (client)

| From | To |
|------|----|
| `client/src/hooks/blackjack/useBlackjack.ts` | `client/src/games/blackjack/useBlackjack.ts` |
| `client/src/hooks/blackjack/useBlackjackAnimation.ts` | `client/src/games/blackjack/useBlackjackAnimation.ts` |
| `client/src/hooks/blackjack/useBlackjackNotifications.ts` | `client/src/games/blackjack/useBlackjackNotifications.ts` |
| `client/src/hooks/roulette/useRoulette.ts` | `client/src/games/roulette/useRoulette.ts` |
| `client/src/hooks/roulette/useSpinResult.ts` | `client/src/games/roulette/useSpinResult.ts` |
| `client/src/hooks/roulette/useSpinNotifications.ts` | `client/src/games/roulette/useSpinNotifications.ts` |
| `client/src/hooks/plinko/usePlinkoGame.ts` | `client/src/games/plinko/usePlinkoGame.ts` |
| `client/src/hooks/plinko/usePlinkoCanvas.ts` | `client/src/games/plinko/usePlinkoCanvas.ts` |
| `client/src/lib/roulette/utils.ts` | `client/src/games/roulette/utils.ts` |
| `client/src/lib/roulette/types.ts` | `client/src/games/roulette/types.ts` |
| `client/src/lib/blackjack/cardHelpers.ts` | `client/src/games/blackjack/cardHelpers.ts` |
| `client/src/lib/blackjack/types.ts` | `client/src/games/blackjack/types.ts` |
| `client/src/hooks/useStats.ts` | stays at `client/src/hooks/useStats.ts` |
| `client/src/hooks/use-toast.ts` | stays at `client/src/hooks/use-toast.ts` |

**Note:** The git working tree already has `client/src/hooks/useBlackjack.ts` deleted and `client/src/hooks/blackjack/useBlackjack.ts` as an untracked file. Treat `client/src/hooks/blackjack/useBlackjack.ts` as the source.

### Cross-boundary import updates (client → server)

After migration these `@server/` paths change:

| Old import | New import |
|-----------|-----------|
| `@server/lib/roulette` | `@server/games/roulette/engine` |
| `@server/lib/roulette/constants` | `@server/games/roulette/engine` |
| `@server/lib/roulette/utils` | `@server/games/roulette/engine` |
| `@server/zodTypes` | `@server/shared/lib/zodTypes` |
| `@server/types` | `@server/shared/lib/types` |

---

## App Entry Point

`src/index.ts` mounts only routers:

```ts
import { rouletteRouter } from './games/roulette/router'
import { blackjackRouter } from './games/blackjack/router'
import { plinkoRouter } from './games/plinko/router'
import { statsRouter } from './shared/routes/stats'
import { expensesRouter } from './shared/routes/expenses'

app.route('/casino', rouletteRouter)
app.route('/blackjack', blackjackRouter)
app.route('/plinko', plinkoRouter)
app.route('/stats', statsRouter)
app.route('/expenses', expensesRouter)
```

---

## Internal Module Convention

Each game folder:

| File | Responsibility |
|------|---------------|
| `router.ts` | HTTP layer: parse, validate (Zod), call service, respond |
| `service.ts` | Orchestration + DB queries (Drizzle calls inline, no separate repo layer) |
| `engine.ts` / `engine/` | Pure logic: no DB, no HTTP, deterministic |
| `types.ts` | All TypeScript types for this game |

**Import rules:**
- `router.ts` imports from `service.ts`, `shared/lib/errors.ts`, `shared/lib/types.ts`, `shared/auth.ts`
- `service.ts` imports from `engine.ts`, `shared/db/`, `shared/lib/`
- `engine.ts` imports only from `types.ts` — no DB, no HTTP, no side effects
- Cross-game imports are forbidden

---

## What Does NOT Change

- No logic changes — purely a file reorganization
- No API contract changes — all route paths stay the same
- No database schema changes
- No dependency changes
- Zod validation schemas stay in `router.ts`
- `gameStore.ts` stays inside `blackjack/engine/`

---

## Adding a New Game (After Migration)

1. Create `src/games/{game}/` with `router.ts`, `service.ts`, `engine.ts`, `types.ts`
2. Create `client/src/games/{game}/` with game hooks calling hono client directly
3. Mount `{game}Router` in `src/index.ts`
4. Done

---

## Migration Order

1. **Create `src/shared/`** — move errors, casinoHelpers, types, zodTypes, db, middleware, auth. Run `tsc --noEmit`.

2. **Migrate roulette** — create `src/games/roulette/`, move router, inline spin/seed/balance repo queries into service.ts, flatten lib/roulette into engine.ts + types.ts. Run `tsc --noEmit`.

3. **Migrate blackjack** — create `src/games/blackjack/`, move router, inline round/balance repo queries into service.ts, move lib/blackjack to engine/. Run `tsc --noEmit`.

4. **Migrate plinko** — create `src/games/plinko/`, move router, inline round/balance repo queries into service.ts, move lib/plinko/engine.ts to engine.ts. Run `tsc --noEmit`.

5. **Migrate shared services** — inline stats/expense repo queries into their services, delete all `src/repositories/`, `src/services/`, `src/routes/`, `src/lib/`. Run `tsc --noEmit`.

6. **Migrate client hooks** — move hooks/{game}/ → games/{game}/, move lib/{game}/ helpers into games/{game}/, delete api.ts wrappers and index barrels.

7. **Update cross-boundary imports** — update all `@server/lib/roulette/*`, `@server/types`, `@server/zodTypes` in client files.

8. **Final build verification** — `tsc --noEmit` on server and client both pass with zero errors.
