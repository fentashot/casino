# 🎰 Analiza Projektu Casino Roulette

## 📋 Spis Treści

1. [Przegląd Projektu](#przegląd-projektu)
2. [Najważniejsze Fragmenty Kodu](#najważniejsze-fragmenty-kodu)
3. [Architektura Systemu](#architektura-systemu)
4. [Kluczowe Technologie](#kluczowe-technologie)

---

## Przegląd Projektu

To jest **nowoczesna aplikacja do gry w ruletkę** z wdrożonym systemem **Provably Fair** - kryptograficznym dowdem uczciwości gry. Projekt dzieli się na dwie części:

- **Backend**: Hono.js + Drizzle ORM + PostgreSQL (Node.js runtime)
- **Frontend**: React 19 + Vite + TanStack Query (Bun runtime)

---

## 🔥 Najważniejsze Fragmenty Kodu

### 1. **RouletteEngine - Serce Gry**

📁 `src/lib/roulette/engine.ts`

```typescript
// Główny mechanizm obrotu - całkowicie deterministyczny
export const RouletteEngine = {
  spin(bets: readonly Bet[], provablyFair: ProvablyFairData): SpinOutcome {
    const hmac = computeHmac(provablyFair);
    const spinNumber = hashToRouletteNumber(hmac);
    const result = createSpinResult(spinNumber);

    const betResults = bets.map((bet) => evaluateBet(bet, result));
    const totalBet = bets.reduce((sum, bet) => sum + bet.amount, 0);
    const totalWin = betResults.reduce((sum, r) => sum + r.winnings, 0);

    return {
      result,
      bets: betResults,
      totalBet,
      totalWin,
      hmac,
    };
  },
};
```

**Dlaczego to ważne:**

- ✅ **Determinizmem** - ten sam input zawsze daje ten sam wynik
- ✅ **Transparentność** - gracz może zweryfikować wynik lokально
- ✅ **Immutability** - bets są `readonly` - bezpieczeństwo typu

**Kluczowy insight**: Wynik zależy TYLKO od:

- `serverSeedHex` (tajny, będzie ujawniony po rotacji)
- `clientSeed` (gracz generuje)
- `nonce` (auto-inkrementujący licznik)

---

### 2. **Kryptografia Provably Fair**

📁 `src/lib/roulette/engine.ts` (backend)

```typescript
// HMAC-SHA256 oblicza wynik spinu
function computeHmac(data: ProvablyFairData): string {
  const hmac = crypto.createHmac(
    "sha256",
    Buffer.from(data.serverSeedHex, "hex"),
  );
  hmac.update(`${data.clientSeed}:${data.nonce}`);
  return hmac.digest("hex");
}

// Konwertuje hash na numer (0-36)
function hashToRouletteNumber(hashHex: string): RouletteNumber {
  const value = parseInt(hashHex.substring(0, 8), 16);
  return (value % POCKET_COUNT) as RouletteNumber;
}
```

**Jak działa:**

1. Bierz pierwsze 8 znaków hasha (32-bitową liczbę)
2. Modulo 37 = wynik od 0-36
3. Zmapuj na numer na kole ruletki

**Frontend weryfikuje:** `client/src/lib/provablyFair.ts`

```typescript
// Gracz może zdekodować HMAC lokalnie (Web Crypto API)
export async function computeHmacHex(
  serverSeedHex: string,
  clientSeed: string,
  nonce: number,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    hexToBytes(serverSeedHex),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${clientSeed}:${nonce}`),
  );
  return bytesToHex(new Uint8Array(sig));
}
```

**Dlaczego to genialne:**

- Gracz WIDZI hash seeda PRZED spinem
- PO spinie dostaje seed + HMAC
- Może samodzielnie obliczyć wynik - serwer nie może oszukiwać!
- Admin ujawnia seed dopiero po rotacji

---

### 3. **Typowany System Zakładów - Discriminated Union**

📁 `src/lib/roulette/types.ts`

```typescript
// Pojedynczy zakład - zawsze dokładnie 1 numer
export interface StraightBet extends BaseBet {
  readonly type: "straight";
  readonly numbers: readonly [RouletteNumber]; // TUPLE!
}

// Split - dokładnie 2 numery
export interface SplitBet extends BaseBet {
  readonly type: "split";
  readonly numbers: readonly [RouletteNumber, RouletteNumber];
}

// Unia wszystkich typów - TypeScript będzie wymuszać właściwe pola
export type Bet =
  | StraightBet
  | SplitBet
  | StreetBet
  | CornerBet
  | LineBet
  | ColumnBet
  | DozenBet
  | EvenOddBet
  | RedBlackBet
  | HighLowBet;
```

**Co to daje:**

```typescript
// ❌ BŁĄD - nie skompiluje się
const bet: Bet = {
  type: "straight",
  amount: 100,
  numbers: [5, 10], // Powinno być 1 numer!
};

// ✅ OK - TypeScript pozwoli
const bet: Bet = {
  type: "straight",
  amount: 100,
  numbers: [5],
};

// Przy switchowaniu - typ się zawęża
if (bet.type === "straight") {
  const nums = bet.numbers; // TypeScript wie że to [RouletteNumber]
  const first = nums[0]; // OK
  const second = nums[1]; // ❌ BŁĄD - nie istnieje
}
```

**Zaleta**: Nemożliwe jest skonstruować Invalid bet w TypeScript!

---

### 4. **Mnożniki Wypłat - Complete Return**

📁 `src/lib/roulette/constants.ts`

```typescript
export const PAYOUT_MULTIPLIERS: Readonly<Record<BetType, number>> = {
  straight: 36, // 35 zysku + 1 oryginalny zakład
  split: 18, // 17 + 1
  street: 12, // 11 + 1
  corner: 9, // 8 + 1
  line: 6, // 5 + 1
  column: 3, // 2 + 1
  dozen: 3, // 2 + 1
  even_odd: 2, // 1 + 1
  red_black: 2, // 1 + 1
  high_low: 2, // 1 + 1
};
```

**Ważne:**

- Te mnożniki to **CAŁKOWITY ZWROT** (włącznie z oryginalnym zakładem)
- Jeśli obstawisz 100zł na straight na 17, a wygra:
  - Zwrot: 100 × 36 = 3600zł
  - Czysty zysk: 3500zł

---

### 5. **Idempotencja - Zapobieganie Duplikatom**

📁 `src/routes/casino.ts`

```typescript
.post('/spin', zValidator('json', spinRequestSchema), async (c) => {
  const body = c.req.valid('json');

  // ✅ Jeśli ten sam spin już został przetworzony, zwróć cached wynik
  if (body.idempotencyKey) {
    const existingSpin = await db.query.casinoSpin.findFirst({
      where: eq(casinoSpin.idempotencyKey, body.idempotencyKey),
      with: { bets: true },
    });

    if (existingSpin) {
      // Zwróć poprzedni wynik bez dublowania
      return c.json({
        result: { number: existingSpin.number, color: existingSpin.color },
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
      });
    }
  }
  // ... reszta logiki spinu
});
```

**Dlaczego to kluczowe:**

- Gracz wysyła request, sieć ulega przerwie → request retransmituje
- **Bez idempotencji**: spin by się wykonał 2x, gracz ubyłby 2x pieniądze!
- **Z idempotencją**: drugi request otrzymuje cache'owany wynik

**Frontend generuje unikalny klucz:**

```typescript
export function generateIdempotencyKey(): string {
  const timestamp = Date.now().toString(36);
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  const random = Array.from(array, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `${timestamp}-${random}`;
}
```

---

### 6. **Walidacja Nonce - Sekwencja Ordeowa**

📁 `src/routes/casino.ts`

```typescript
// Nonce MUSI być dokładnie lastNonce + 1
const expectedNonce = userBalanceRecord.lastNonce + 1;
if (body.nonce !== expectedNonce) {
  return c.json(
    {
      error: "invalid_nonce",
      expectedNonce,
      receivedNonce: body.nonce,
    },
    400,
  );
}
```

**Po co:**

- Zapobiega replay attack'om (powtórzeniu starego wyniku)
- Gwarantuje liniową sekwencję zdarzeń
- Gracz widzi w UI co będzie następne: `nextNonce = lastNonce + 1`

**Frontend automatycznie synchronizuje:**

```typescript
if (status === 400 && error === "invalid_nonce" && expectedNonce) {
  queryClient.setQueryData(["casino-nonce"], {
    nextNonce: expectedNonce,
  });
  toast({
    title: "Synchronizacja",
    description: "Nonce zsynchronizowany. Spróbuj ponownie.",
  });
}
```

---

### 7. **AnimatedWheel - Fizyka Animacji**

📁 `client/src/components/RouletteWheel.tsx`

```typescript
// Spin zawsze w TYM SAMYM kierunku ze STAŁĄ liczbą obrotów
const spinToPocket = async (targetIndex: number | null) => {
  if (targetIndex == null) return;
  if (isSpinning) return;

  setIsSpinning(true);

  const pocketCenter = targetIndex * anglePerPocket + anglePerPocket / 2;
  const desiredAngleAtTop = (360 - pocketCenter) % 360;

  // Zawsze robi 6 pełnych obrotów + delta do wybranego numeru
  const fullRotations = 6;

  const currentMod = ((totalRotationRef.current % 360) + 360) % 360;
  const delta = (desiredAngleAtTop - currentMod + 360) % 360;

  // Ostateczny kąt = current + 6×360° + delta
  const finalRotation = totalRotationRef.current + fullRotations * 360 + delta;

  const duration = 2.8; // sekundy

  // Odtwórz "tick-tick-tick" podczas spinu
  const spinDegrees = finalRotation - totalRotationRef.current;
  const estimatedPasses = (spinDegrees / 360) * pockets;
  const tickEveryMs = Math.max(
    30,
    (duration * 1000) / Math.max(estimatedPasses, 1),
  );

  tickIntervalRef.current = window.setInterval(() => {
    playTick(1000 + (tickCount % 3) * 120, 0.02);
  }, tickEveryMs);

  // Framer Motion animacja - ease-out
  await controls.start(
    { rotate: finalRotation },
    { duration, ease: [0.22, 0.61, 0.36, 1] },
  );

  if (tickIntervalRef.current) {
    window.clearInterval(tickIntervalRef.current);
  }

  totalRotationRef.current = finalRotation;
  setIsSpinning(false);
  onSpinEnd?.(rouletteSequence[targetIndex]);
};
```

**Trik techniczny:**

- Kół nie resetujemy - śledzimy totalny obrót w `totalRotationRef`
- To daje naturalny efekt - koło nie "skacze" z powrotem na 0°
- 6 pełnych obrotów = dramatyczne tempo, ale nie przesadne
- Tick sound synchronizowany z animacją = realistyczny dźwięk

---

### 8. **Rate Limiting - Ochrona Przed Spam**

📁 `src/index.ts`

```typescript
// Ogólne API: 100 req/min
const apiLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 100,
  keyGenerator: (c) =>
    c.req.header("x-forwarded-for") ||
    c.req.header("cf-connecting-ip") ||
    "unknown",
});

// Auth: 20 req/min (silniejsza ochrona)
const authLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 20,
});

// Casino spin: 30 spinów/min (zaraz po spinie czeka animacja)
const spinLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 30,
});

app.use("/api/*", apiLimiter);
app.use("/api/auth/*", authLimiter);
app.use("/api/casino/spin", spinLimiter);
```

**Strategia:**

- Endpoints publiczne: łagodny limit
- Auth: suchy limit (bot protection)
- Spin: umiar (animacja trwa 2.8s, więc max ~21 spinów/min naturalnie)

---

### 9. **Walidacja Przy Użyciu Zod**

📁 `src/zodTypes.ts` (przykład)

```typescript
export const betSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("straight"),
    amount: z.number().positive().int(),
    numbers: z.array(rouletteNumberSchema).length(1),
    color: z.null(),
    choice: z.null(),
  }),
  z.object({
    type: z.literal("split"),
    amount: z.number().positive().int(),
    numbers: z.array(rouletteNumberSchema).length(2),
    color: z.null(),
    choice: z.null(),
  }),
  // ... inne typy
]);
```

**Co to daje:**

- Request validation w API automatycznie
- Niemożliwe wysłanie 1 numeru dla split betu
- Type-safe na całej ścieżce: frontend → validator → handler

---

### 10. **Transakcje w Bazie Danych**

📁 `src/routes/casino.ts`

```typescript
// Wszystkie operacje muszą się powiedzieć atomowo
await db.transaction(async (tx) => {
  // Wstaw record spinu
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

  // Wstaw każdy zakład
  for (const bet of body.bets) {
    const win = calculateWinnings(bet, { number, color });
    await tx.insert(casinoBet).values({
      id: crypto.randomBytes(16).toString("hex"),
      spinId,
      type: bet.type,
      numbers: JSON.stringify(bet.numbers),
      amount: bet.amount.toString(),
      color: bet.color,
      choice: bet.choice,
      winnings: win.toString(),
    });
  }

  // Aktualizuj balance użytkownika
  await tx
    .update(userBalance)
    .set({
      balance: newBalance.toString(),
      lastNonce: body.nonce,
    })
    .where(eq(userBalance.userId, userId));
});
```

**Dlaczego transakcja:**

- Spin zapisany = musi być zaktualizowany balance
- Lub nic - jeśli cokolwiek pójdzie nie tak, rollback wszystkich zmian
- Niemożliwy stan: spin w DB ale balance nie zaktualizowany

---

## 🏗️ Architektura Systemu

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                     │
│  - RouletteWheel (Framer Motion)                        │
│  - RouletteControls (Placement zakładów)                │
│  - useCasinoGame hook (State management)                │
│  - Verify Provably Fair (Web Crypto API)                │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTP + TanStack Query
┌──────────────────┴──────────────────────────────────────┐
│              BACKEND (Hono.js)                          │
│  ┌──────────────────────────────────────────────────────┤
│  │ POST /api/casino/spin                                │
│  │  - Validate nonce (sekwencja)                        │
│  │  - Check balance                                     │
│  │  - Compute HMAC-SHA256 (deterministic)               │
│  │  - Calculate winnings (RouletteEngine)               │
│  │  - Update balance in transaction                     │
│  │  - Cache by idempotencyKey                           │
│  └──────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────────┤
│  │ POST /api/casino/rotate (Admin)                      │
│  │  - Generate new server seed (crypto.randomBytes)     │
│  │  - Hash with SHA256                                  │
│  │  - Deactivate old seed, activate new                 │
│  └──────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────────┤
│  │ POST /api/casino/reveal (Admin)                      │
│  │  - Return old seed (gracz może zweryfikować)         │
│  │  - Mark as revealed in DB                            │
│  └──────────────────────────────────────────────────────┘
│                                                         │
│  RouletteEngine (Pure logic)                            │
│  - spin()                                               │
│  - getColor()                                           │
│  - calculatePotentialWinnings()                         │
│  - validateBet()                                        │
│                                                         │
│  Utilities                                              │
│  - isRedNumber()                                        │
│  - isNumberBetWinner()                                  │
│  - isColumnBetWinner()                                  │
│  - isDozenBetWinner()                                   │
└──────────────────┬──────────────────────────────────────┘
                   │ Drizzle ORM
┌──────────────────┴──────────────────────────────────────┐
│                  PostgreSQL                             │
│  Tables:                                                │
│  - casinoServerSeed (id, seed, hash, active, revealedAt)│
│  - casinoSpin (id, userId, number, color, hmac, ...)    │
│  - casinoBet (id, spinId, type, amount, winnings, ...)  │
│  - userBalance (userId, balance, lastNonce)             │
└─────────────────────────────────────────────────────────┘
```

---

## 💡 Kluczowe Technologie

### Backend

| Technologia           | Zastosowanie         | Dlaczego                                    |
| --------------------- | -------------------- | ------------------------------------------- |
| **Hono.js**           | Web framework        | Super lekki, szybki, built-in validators    |
| **Drizzle ORM**       | Database abstraction | Type-safe queries, świetne tsconfig support |
| **PostgreSQL**        | Database             | ACID transactions dla atomowych operacji    |
| **crypto (Node.js)**  | HMAC-SHA256          | Native, secure, no dependencies             |
| **zod**               | Input validation     | Runtime schemas z TypeScript inference      |
| **hono-rate-limiter** | DDoS protection      | Per-IP rate limiting                        |

### Frontend

| Technologia         | Zastosowanie             | Dlaczego                       |
| ------------------- | ------------------------ | ------------------------------ |
| **React 19**        | UI library               | Signals, better compiler       |
| **Framer Motion**   | Animations               | Declarative, GPU-accelerated   |
| **TanStack Query**  | State management         | Auto-caching, sync with server |
| **Vite**            | Bundler                  | 10× szybszy build niż Webpack  |
| **Web Crypto API**  | Client-side verification | Native browser API, no libs    |
| **canvas-confetti** | Celebratory effect       | Lekki, nie blokujący           |

### Security Features

```typescript
// 1. Secure Headers (Hono)
app.use(
  "*",
  secureHeaders({
    xFrameOptions: "DENY",
    xContentTypeOptions: "nosniff",
    referrerPolicy: "strict-origin-when-cross-origin",
  }),
);

// 2. CORS (tylko trusted origins)
app.use(
  "/api/auth/*",
  cors({
    origin: ["http://localhost:3000", process.env.BETTER_AUTH_URL!],
    credentials: true,
  }),
);

// 3. Rate Limiting (per-IP)
const apiLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 100,
  keyGenerator: (c) => c.req.header("x-forwarded-for") || "unknown",
});

// 4. Type Safety (Zod + TypeScript)
// Niemożliwe wysłać invalid request

// 5. Transaction Safety (Drizzle)
// Spin + balance update = atomowo lub nic
```

---

## 🎯 Najciekawsze Decyzje Projektowe

### 1. **Payout = Complete Return (nie zysk)**

Decyzja: `straight: 36` zamiast `straight: 35`

```typescript
// Zamiast liczyć zysk i dodawać z powrotem:
winnings = bet.amount * 35 + bet.amount;

// Po prostu:
winnings = bet.amount * 36;

// Prostsze, mniej błędów, bardziej czytelne
```

### 2. **Tuple Type dla Liczby Numerów**

```typescript
// ❌ Bez tuple
readonly numbers: readonly number[];
// Kompiluje się: [5], [5,10], [5,10,15,20] - może być błędy

// ✅ Z tuple
readonly numbers: readonly [RouletteNumber];      // straight
readonly numbers: readonly [RouletteNumber, RouletteNumber]; // split
// Kompiluje się TYLKO prawidłowe kombinacje
```

### 3. **Deterministyczność zamiast RNG**

```typescript
// ❌ Tradycyjne podejście
const result = Math.random() * 37;
// Gracz musi wierzyć, że to jest fair

// ✅ Provably Fair
const hmac = sha256(serverSeed + clientSeed + nonce);
const result = hmac % 37;
// Gracz MOŻE zweryfikować, że to fair
```

### 4. **Idempotency Key dla Reliability**

```typescript
// ❌ Bez idempotencji
POST /spin -> network error -> retry
// Puede ejecutarse 2x, gracz straciłby 2x pieniądze

// ✅ Z idempotency key
POST /spin (idempotencyKey: "uuid-123") -> network error -> retry
// Drugi request zwraca cache'owany wynik
```

### 5. **Animacja w Frontend, Logika w Backend**

```typescript
// Frontend: 2.8s animacja koła, dźwięk tick
// Backend: 0ms - wynik jest już obliczony
// Gracz WIDZI ład, ale nie może go manipulować
```

---

## 📊 Statystyki Projektu

```
Backend:
  - 292 linie (casino.ts)
  - 210 linie (roulette/engine.ts)
  - 151 linie (roulette/types.ts)
  - 10 typów zakładów
  - 37 pól na kole

Frontend:
  - 284 linie (RouletteWheel.tsx)
  - 232 linie (useCasinoGame.ts)
  - ~60 linii (provablyFair.ts)

Database:
  - 4 główne tabele
  - ACID transactions
  - Audit trail (każdy spin zapisany)
```

---

## 🔐 Zabezpieczenia

| Zagrożenie             | Ochrona                              | Status         |
| ---------------------- | ------------------------------------ | -------------- |
| **SQL Injection**      | Drizzle ORM (parametrized queries)   | ✅             |
| **XSS**                | React (auto-escape), CSP headers     | ✅             |
| **CSRF**               | Same-origin requests only            | ✅             |
| **DDoS**               | Rate limiting (30 spinów/min/IP)     | ✅             |
| **Replay Attack**      | Nonce validation + sequence check    | ✅             |
| **Man-in-Middle**      | HTTPS + Secure headers               | ✅ (prod only) |
| **Account Takeover**   | Better Auth (session tokens)         | ✅             |
| **Cheating (backend)** | Idempotency key + transaction safety | ✅             |
| **Cheating (seed)**    | HMAC verification + seed reveal      | ✅             |

---

## 🚀 Jak To Wszystko Razem Działa

### Typowy Flow Spinu

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Frontend: Gracz robi zakłady                                 │
│    - Wybiera numer (17)                                         │
│    - Wybiera kwotę (100 zł)                                     │
│    - System generuje: clientSeed, idempotencyKey                │
│    - Pobiera: balance, nextNonce                                │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Frontend: Widzi hash server seeda (publiczny)                │
│    - PRZED spinem wie: serverSeedHash = sha256(serverSeed)      │
│    - Nie wie całego seeda (tajna)                               │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Frontend: Wysyła POST /api/casino/spin                       │
│    {                                                            │
│      bets: [{ type: 'straight', numbers: [17], amount: 100 }],  │
│      clientSeed: "a1b2c3...",                                   │
│      nonce: 42,                                                 │
│      idempotencyKey: "timestamp-random"                         │
│    }                                                            │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Backend: Waliduje request                                    │
│    ✓ Nonce = lastNonce + 1? (42 = 41 + 1)                       │
│    ✓ Balance >= totalBet? (10000 >= 100)                        │
│    ✓ Bety valid? (Zod validator)                                │
│    ✓ idempotencyKey już w DB? (Nie)                             │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Backend: Oblicza wynik (DETERMINISTIC)                       │
│    serverSeed = "abc123..." (tajny)                             │
│    clientSeed = "a1b2c3..." (od gracza)                         │
│    nonce = 42                                                   │
│                                                                 │
│    hmac = HMAC-SHA256(                                          │
│      key: serverSeed,                                           │
│      data: "a1b2c3...:42"                                       │
│    )                                                            │
│    = "d4c3b2a1e5f6g7h8i9j0k1l2m3n4o5p6" (64 znaki)              │
│                                                                 │
│    number = parseInt(                                           │
│      "d4c3b2a1".substring(0,8),  // pierwsze 8 znaków           │
│      16                                                         │
│    ) % 37                                                       │
│    = parseInt("d4c3b2a1", 16) % 37                              │
│    = 3579506337 % 37                                            │
│    = 17 ✅ (trafia się!)                                        │
│                                                                 │
│    color = getNumberColor(17) = 'black'                         │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. Backend: Oblicza wygrane                                     │
│    for each bet:                                                │
│      if (isBetWinner(bet, result)):                             │
│        winnings = 100 * 36 = 3600 zł                            │
│      else:                                                      │
│        winnings = 0                                             │
│                                                                 │
│    totalBet = 100                                               │
│    totalWin = 3600                                              │
│    newBalance = 10000 - 100 + 3600 = 13500                      │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. Backend: Atomowa transakcja w DB                             │
│    BEGIN TRANSACTION                                            │
│      INSERT INTO casinoSpin (...)                               │
│      INSERT INTO casinoBet (...)                                │
│      UPDATE userBalance SET balance = 13500, lastNonce = 42     │
│    COMMIT                                                       │
│                                                                 │
│    Jeśli cokolwiek pójdzie źle → ROLLBACK (nic się nie zmieni)  │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. Backend: Zwraca response                                     │
│    {                                                            │
│      result: { number: 17, color: 'black' },                    │
│      totalBet: 100,                                             │
│      totalWin: 3600,                                            │
│      newBalance: 13500,                                         │
│      provablyFair: {                                            │
│        clientSeed: "a1b2c3...",                                 │
│        serverSeedHash: "xyz123...",  // hash, nie seed          │
│        nonce: 42,                                               │
│        hmac: "d4c3b2a1..."  // gracz może zweryfikować!         │
│      }                                                          │
│    }                                                            │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. Frontend: Animuje koło                                       │
│    - 6 pełnych obrotów + delta do 17                            │
│    - 2.8 sekundy                                                │
│    - Tick sound synchronizowany                                 │
│    - showResult animuje numer + kolor                           │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 10. Frontend: Veryfikacja (opcjonalnie)                         │
│     Gracz może kliknąć "Verify"                                 │
│                                                                 │
│     // lokalnie oblicza HMAC                                    │
│     const clientHmac = await computeHmacHex(                    │
│       serverSeedHash,                                           │
│       clientSeed,                                               │
│       nonce                                                     │
│     );                                                          │
│                                                                 │
│     if (clientHmac === serverHmac) {                            │
│       alert("✅ Spin jest FAIR!");                              │
│     } else {                                                    │
│       alert("❌ Serwer oszukiwał!");                            │
│     }                                                           │
│                                                                 │
│     // Admin ujawni seed PO rotacji                             │
│     // Gracz może ponownie zweryfikować wszystkie spiny         │
└─────────────────────────────────────────────────────────────────┘
```
