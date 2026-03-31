# Casino App — Plan Ulepszen

Wszystko ponizej bazuje na pelnej analizie kodu z brancha `brancz` (2026-03-31).

---

## FAZA 1 — Stabilnosc (brak nowych ficzerow)

### 1.1 Shoe cache → Redis
**Problem**: `src/games/blackjack/engine/shoeManager.ts` trzyma talie kart w `Map<string, ...>` w pamieci procesu. Blokuje multi-instance, crash = utrata talii.

**Co zrobic**:
- Zamiast `shoeStore = new Map()` uzywac Redis (klucz `blackjack:shoe:{userId}`)
- Shoe juz jest persistowany do Postgres (`blackjackShoe` tabela) — to backup, nie primary store
- `getOrBuildShoe()`, `drawFromShoe()`, `getCachedShoe()` — przepisac na async + Redis GET/SET
- TTL w Redis: 24h (jak gry)
- Usunac `cleanupStaleShoes()` — Redis TTL to zalatwi
- `touchShoe` = `EXPIRE` na kluczu
- Pliki do zmiany: `src/games/blackjack/engine/shoeManager.ts`
- Uwaga: `drawFromShoe` i `getOrBuildShoe` sa synchroniczne — trzeba zmienic na async i zaktualizowac callsite'y w `gameLogic.ts`

### 1.2 Redis persistence (AOF)
**Problem**: `docker-compose.yml` Redis ma `--save 60 1` (RDB co 60s), ale brak AOF = do 60s utraty danych.

**Co zrobic**:
- Dodac `--appendonly yes --appendfsync everysec` do komendy Redis w docker-compose
- Linia 17: `command: redis-server --save 60 1 --appendonly yes --appendfsync everysec --loglevel warning`

### 1.3 Graceful shutdown
**Problem**: `src/index.ts` nie obsluguje SIGTERM/SIGINT. Restart = brutalne uciecie WS, niespojny stan.

**Co zrobic** (dodac na koncu `src/index.ts`):
```ts
let shuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`[server] ${signal} received, shutting down...`);
  
  // Stop accepting new connections
  server.stop();
  
  // Persist all active shoes to DB
  // (import getShoeCount + iterate is not exposed — add an exportAll helper to shoeManager)
  
  // Close Redis
  const redis = getRedis();
  await redis.quit();
  
  console.info("[server] shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
```

### 1.4 Health check endpoint
**Problem**: Docker/load balancer nie wie czy app zyje.

**Co zrobic** (dodac w `src/index.ts` PRZED auth middleware):
```ts
app.get("/health", async (c) => {
  try {
    await db.execute(sql`SELECT 1`);
    await getRedis().ping();
    return c.json({ status: "ok" });
  } catch (e) {
    return c.json({ status: "degraded", error: (e as Error).message }, 503);
  }
});
```

### 1.5 Env validation — dokonczyc
**Problem**: `src/lib/env.ts` istnieje (untracked file), jest importowany w `index.ts` linia 1. Plik juz dziala — waliduje `DATABASE_URL` i `BETTER_AUTH_SECRET`. Gotowe.

**Do zrobienia**: Dodac do git (`git add src/lib/env.ts`).

### 1.6 Wywalic `dist/` z repo
**Problem**: `dist/index.js` (66k linii) jest w git.

**Co zrobic**:
```bash
echo "dist/" >> .gitignore
git rm -r --cached dist/
```

---

## FAZA 2 — Bezpieczenstwo finansowe

### 2.1 Audit log — tabela `balance_audit`
**Problem**: Brak sladu kto/kiedy/ile zmienil balance. Niemozliwa rekoncyliacja.

**Schema** (dodac w `src/db/schema.ts`):
```ts
export const balanceAudit = pgTable("balance_audit", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  delta: numeric("delta").notNull(),
  balanceBefore: numeric("balance_before").notNull(),
  balanceAfter: numeric("balance_after").notNull(),
  reason: text("reason").notNull(), // "roulette_spin", "blackjack_deal", "blackjack_settle", "plinko_play"
  referenceId: text("reference_id"), // spinId / gameId / roundId
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("audit_user_id_idx").on(table.userId),
  index("audit_created_at_idx").on(table.createdAt),
]);
```

**Gdzie wstawiac**:
- `src/db/queries/balance.ts` → `applyBalanceDelta()` — po UPDATE, INSERT do audit
- `src/games/roulette/service.ts` → `createSpinWithBets()` — wewnatrz transakcji
- `src/games/blackjack/service.ts` → `applyDelta()` — wewnatrz lub po
- `src/games/plinko/service.ts` → wewnatrz transakcji (linia 57-90)

### 2.2 Server-side bet limits
**Problem**: Blackjack WS ma Zod 10-1M, ale roulette/plinko nie wymuszaja hard cap na backendzie.

**Co zrobic**:
- `src/games/roulette/service.ts` → `executeSpin()` — dodac na poczatku:
  ```ts
  const MAX_BET = 1_000_000;
  if (totalBet > MAX_BET || totalBet <= 0) return err(ErrorCode.VALIDATION_ERROR, "Bet out of range");
  ```
- `src/games/plinko/service.ts` → `play()` — dodac:
  ```ts
  if (bet < 10 || bet > 1_000_000) return err(ErrorCode.VALIDATION_ERROR, "Bet out of range");
  ```
- Rozwazyc wspolna stala `MIN_BET = 10, MAX_BET = 1_000_000` w `src/lib/constants.ts`

### 2.3 Stats agregacja w DB zamiast JS
**Problem**: `src/games/stats/service.ts` laduje do 30k wierszy (3x10k) w pamiec i agreguje w JS.

**Co zrobic** (priorytet: `getOverview` i `getGameBreakdown`):
- Zamiast `findRouletteBetWins()` ktore zwraca 10k rows:
  ```sql
  SELECT COUNT(*) as rounds, SUM(total_bet) as wagered, SUM(total_win) as won,
         COUNT(*) FILTER (WHERE total_win > 0) as wins
  FROM casino_spin WHERE user_id = $1
  ```
- Analogicznie dla blackjack i plinko
- Pure functions `computeOverview()` itp. moga zostac jako fallback
- Heatmap/daily mozna zostawic na potem — te maja sens w JS

### 2.4 Idempotency key cross-game
**Problem**: Ten sam idempotency key moze byc uzyty w roulette I plinko.

**Opcja prosta**: Prefix key: `roulette:{key}`, `plinko:{key}` — juz nie koliduja. Albo dodac kolumne `game_type` do wspólnej tabeli idempotency.

---

## FAZA 3 — UX

### 3.1 Lazy routes (code splitting)
**Problem**: Wszystkie gry w jednym bundlu.

**Co zrobic** w `client/src/routes/_authenticated/games/`:
- Kazdy plik routu (roulette.tsx, blackjack.tsx, plinko.tsx) powinien uzywac `lazy`:
  ```ts
  export const Route = createFileRoute('/_authenticated/games/roulette')({
    component: () => import('./roulette-page').then(m => m.default),
    // LUB jesli TanStack Router file-based routing to obsluguje:
    // lazy: () => import('./roulette.lazy'),
  })
  ```
- TanStack Router file-based routing wspiera `.lazy.tsx` pliki natywnie — wystarczy wydzielic component do `roulette.lazy.tsx`

### 3.2 Balance sync przez WS broadcast
**Problem**: Sidebar ma `staleTime: Infinity` na `casino-balance`. Po wygranej sidebar nie odswierza.

**Opcja 1 — globalny WS event**:
- Backend: po kazdej zmianie balance wyslij WS `{ type: "balance_update", balance: number }`
- Client: w `BlackjackSocket.onMessage` + globalny handler aktualizuje `queryClient.setQueryData(["casino-balance"], ...)`

**Opcja 2 — invalidation w hookach** (prostsza):
- W `useBlackjack` po otrzymaniu `state` message:
  ```ts
  queryClient.setQueryData(["casino-balance"], { balance: msg.payload.balance });
  ```
- W `useRoulette` po spinie — juz to robi (sprawdzic)
- W `usePlinkoGame` po dropie — sprawdzic

**Opcja 3 — krotszy staleTime w sidebar**:
- Zmienic `staleTime: Infinity` na `staleTime: 10_000` (10s)

### 3.3 WS heartbeat + reconnect UI
**Problem**: Martwe polaczenia nie sa wykrywane. Brak feedbacku w UI.

**Backend** (`src/index.ts`):
```ts
// W websocket handler:
const PING_INTERVAL_MS = 30_000;
// Bun WS ma wbudowany ping/pong — wystarczy:
// setInterval(() => ws.ping(), PING_INTERVAL_MS) w open handler
// + clearInterval w close handler
```

**Client** (`client/src/lib/blackjackWs.ts`):
```ts
// W connect(), po onopen:
this.pingInterval = setInterval(() => {
  if (this.ws?.readyState === WebSocket.OPEN) {
    this.send({ type: "ping" });
  }
}, 25_000);

// Timeout detection:
this.pongTimeout = setTimeout(() => {
  this.ws?.close(); // force reconnect
}, 5_000);

// W onmessage, jesli msg.type === "pong":
clearTimeout(this.pongTimeout);
```

**UI indicator**: Expose `connected` z BlackjackSocket jako reactive state (np. przez callback), pokazac w komponencie maly dot zielony/czerwony.

### 3.4 Auth flow — parallel fetch
**Problem**: `auth-context.tsx` robi waterfall: session → balance → role.

**Co zrobic**: `Promise.all([getSession(), getBalance(), getMe()])` zamiast sekwencyjnego.

---

## Pliki do dodania do git (untracked)
- `src/lib/env.ts` — walidacja env vars (juz dziala, juz importowany)
- `client/src/components/shared/ErrorBoundary.tsx` — error boundary (juz uzywany w route.tsx)
- `src/games/blackjack/wsTypes.ts` — WS protocol types (juz importowany)
- `client/bun.lock` — nowy format lockfile

---

## Kolejnosc implementacji (od najwazniejszego)

1. `dist/` do .gitignore + git rm (2 min)
2. `git add` untracked files (1 min)
3. Redis AOF w docker-compose (1 linia)
4. Health check endpoint
5. Graceful shutdown
6. Server-side bet limits (roulette + plinko)
7. Balance audit log (schema + wstawki w transakcjach)
8. Shoe cache → Redis (najwieksze zadanie — wymaga zmiany sync→async)
9. Balance sync fix (sidebar staleTime lub invalidation)
10. WS heartbeat
11. Stats SQL agregacja
12. Lazy routes
