# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (runs both server and client concurrently)
bun run dev

# Server only (hot reload via Bun)
bun run dev:server

# Client only (Vite on port 3000)
bun run dev:client

# Database migrations
bun run db:gen     # generate migration from schema changes
bun run db:push    # push schema directly to DB (dev only)

# Type-check client
cd client && bunx tsc --noEmit

# Lint + format (client) — biome excludes src/index.css and src/components/ui/**
cd client && bun run check

# Build
bun run build           # server
cd client && bun run build  # client (tsc + vite)
```

No test suite exists in this repo.

## Architecture

**Monorepo** – Bun/Hono backend (`src/`) + React/Vite client (`client/`). The server serves the built client as static files in production. In dev, Vite proxies API calls to the Hono server.

### Backend (`src/`)

Structured as: `router → service → engine (pure logic)`

- **`src/index.ts`** – Hono app entry. Registers per-route rate limiters, auth middleware, CORS, mounts all routers under `/api/*`, serves static files in production.
- **`src/games/`** – One directory per game (roulette, blackjack, plinko) plus stats and expenses. Each contains `router.ts`, `service.ts`, and an `engine/` subdirectory with pure functions.
- **`src/db/`** – Drizzle ORM with PostgreSQL (`postgres.ts`). Schema in `schema.ts`. No repository layer — DB queries are inlined in service files. Balance updates use `SELECT ... FOR UPDATE` row locking.
- **`src/lib/errors.ts`** – `Result<T>` pattern used throughout: `ok(data)` / `err(ErrorCode)`. Routers call `mapResultToResponse(c, result)` to convert to HTTP responses. **Never throw inside services — return `err(...)`.**
- **`src/lib/casinoHelpers.ts`** – HMAC computation, hash-to-number conversion, bet payout logic shared across games.
- **`src/auth.ts`** – Better Auth with Drizzle adapter. Supports GitHub/Google OAuth + email/password. Sessions validated via `useAuthMiddleware`; downstream handlers access user via `c.get("user")`.

**Type-safe API client**: `src/index.ts` exports `ApiRoutes` type. The client imports it via `@server/index` path alias and passes it to `hono/client`'s `hc<ApiRoutes>()`. All API calls go through `api` from `client/src/lib/api.ts` — full end-to-end type safety without code generation.

**Rate limits** (via `hono-rate-limiter`): general `/api/*` 100 req/min, auth 20 req/min, roulette spin 30/min, blackjack actions 60/min. IP detected via trusted proxy headers (`TRUSTED_PROXY_HEADER` env var).

### Frontend (`client/src/`)

Two parallel hook directories exist — `src/games/` (used by components) and `src/hooks/` (older structure). Components import from `src/games/`.

- **Routing** – TanStack Router with file-based routes in `src/routes/`. `routeTree.gen.ts` is auto-generated; never edit manually. `/_authenticated.tsx` is the protected layout — it redirects unauthenticated users to `/login` via `beforeLoad`.
- **Server state** – React Query (`@tanstack/react-query`). Shared `["casino-balance"]` query key is the single source of truth for balance across all games. After any game action that changes balance, call `queryClient.setQueryData(["casino-balance"], { balance: newValue })`.
- **Game hooks pattern**: Each game has an orchestrator hook (`useRoulette`, `usePlinkoGame`, `useBlackjack`) that composes sub-hooks for animation and notifications. Animation↔server synchronisation uses ref-based bridging (`pendingResultRef`) — results are buffered until the animation completes, then applied to React Query cache. A 10s safety timeout force-applies the result if the animation callback never fires.
- **Blackjack** uses `useMutation` for all actions (deal, insurance, hit/stand/double/split). `isLoading` is derived from `.isPending` of all mutations OR'd together.
- **`src/lib/blackjack/`** – Client-side blackjack types and API wrappers re-exported for components.

### Database Schema

Key tables: `user_balance` (balance + nonce per user), `casino_spin` + `casino_bet` (roulette history), `blackjack_round` (finished games), `blackjack_active_game` (in-progress game state as JSONB), `plinko_round`, `casino_server_seed`.

### Provably Fair

Spin result = HMAC-SHA256(serverSeed, `${clientSeed}:${nonce}`). Server seed hash is shown upfront; raw seed revealed after rotation. Nonce increments per spin and is tracked in `user_balance.lastNonce`. Plinko uses the same HMAC bytes to determine left/right at each row. Seed rotation via `/api/casino/rotate`, verification via `/api/casino/reveal`.

### Blackjack Engine

Pure state-transition functions in `src/games/blackjack/engine/`. Each action (`dealGame`, `hitHand`, `doubleDown`, `splitHand`, `resolveDealerAndSettle`) takes the current `BlackjackGameState` and returns a new one — no mutation. An 8-deck shoe is managed per-user in memory (`shoeManager`) and persisted to DB; it reshuffles at 75% penetration.

### Plinko Engine

`dropBall(bet, rows, difficulty, seed)` returns a `path` (array of left/right decisions per row), `finalBucket`, `multiplier`, and `win`. Difficulty controls the multiplier table variance — "expert" on 16 rows has a 10000x peak vs "low" at 5.6x. Buckets are symmetric; edges pay more.

### Environment Variables

See `.env.example`:
- `DATABASE_URL` – PostgreSQL connection string
- `BETTER_AUTH_SECRET` – min 32 chars random string
- `BETTER_AUTH_URL` – public URL (used for OAuth redirects)
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` – OAuth
- `TRUSTED_PROXY_HEADER` – e.g. `cf-connecting-ip` for production

### Path Aliases

- `@server/*` → `src/*` (used in client to import backend types)
- `@/*` → `client/src/*`
