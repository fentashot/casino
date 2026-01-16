// ANALIZA ARCHITEKTURY I REKOMENDACJE
// =====================================

/\*

## 🔴 ZIDENTYFIKOWANE PROBLEMY

### 1. KOMUNIKACJA FRONTEND-BACKEND

Problem: Frontend hardcoduje dane do spin API

client/src/routes/\_authenticated/games/roulette.tsx:

```tsx
const handlePlaceBets = async (bets: RouletteSelection[]) => {
  const res = await api.casino.spin.$post({
    json: {
      clientSeed: '8293yr8wehdu2',  // ❌ HARDCODED!
      nonce: 1,                      // ❌ ZAWSZE 1!
      bets: bets.map(...)
    }
  });
```

Skutki:

- nonce nigdy się nie inkrementuje → provably fair jest ZŁAMANA
- clientSeed zawsze taki sam → brak losowości
- Brak synchronizacji stanu między requestami

---

### 2. BRAK WALIDACJI NONCE NA KLIENCIE

Problem: Frontend nie zna aktualnego nonce użytkownika

Rozwiązanie:

- Pobierz nonce z serwera PRZED każdym spin
- Lub dodaj do odpowiedzi spin informacje o nextNonce

Obecnie:

```ts
// Serwer poprawia nonce jeśli jest zły:
if (body.nonce !== userBalanceRecord.lastNonce + 1) {
  body.nonce = userBalanceRecord.lastNonce + 1; // ❌ Cicho zmienia!
}
```

To maskuje błędy na froncie!

---

### 3. CLIENTSEED GENERATOR BRAKUJE

Problem: Frontend nie ma mechanizmu do generowania clientSeed

Rozwiązanie:

```ts
// Dodaj do client/src/lib/roulette/
export function generateClientSeed(): string {
  return crypto
    .getRandomValues(new Uint8Array(32))
    .reduce((s, b) => s + b.toString(16).padStart(2, "0"), "");
}
```

---

### 4. STATE MANAGEMENT SPINU

Problem: Frontend zarządza stanem ręcznie, bez synchronizacji z serwerem

Obecnie:

```ts
const [result, setResult] = useState<Result | null>(null);
const [data, setData] = useState<SpinResponse | null>(null);
const [showResult, setShowResult] = useState(false);
const [disableBetting, setDisableBetting] = useState(false);
const [balance, setBalance] = useState(user?.balance || 0);
```

Problem:

- Po refresh strony balance jest stary
- Desynchronizacja między UI a serwerem
- Brak realtime updates

Rozwiązanie:

- Użyj React Query do cachowania
- Re-fetch balance po spinie
- Obserwuj stan gry z serwera

---

### 5. BRAK OBSŁUGI BŁĘDÓW

Problem: API zwraca błędy ale frontend nie ma kompletnej obsługi

roulette.tsx:

```ts
const data = (await res.json()) as SpinResponse | { error: string };

if (!res.ok) {
  setDisableBetting(false);
  if (res.status === 402) {
    alert("Niewystarczające środki na koncie!"); // ❌ alert()!
  } else {
    // ...
  }
  return {
    success: false,
    error: "error" in data ? data.error : "Request failed",
  };
}
```

Problem:

- alert() zamiast toast
- Brak retry logiki
- Brak optimistic updates

---

### 6. BRAK VALIDACJI BETÓW NA KLIENCIE

Problem: RouletteControls buduje bety bez type-safety

RouletteControls.tsx:

```tsx
const sel = makeSelectionFromKey(key, addValue);
setBasket(prev => {
  const idx = prev.findIndex(b =>
    b.type === sel.type &&
    JSON.stringify(b.numbers || []) === JSON.stringify(sel.numbers || []) &&
    // ... problem: nie ma pewności że to Bet
  );
```

Rozwiązanie:

- Użyj RouletteEngine.validateBet() na kliencie
- Type-safe bet builder

---

### 7. BALANCE DESYNCHRONIZACJA

Problem: Frontend polegał na user.balance zamiast aktualnego salda

roulette.tsx:

```ts
const [balance, setBalance] = useState(user?.balance || 0);

// Po spinie:
setBalance(data?.newBalance || user?.balance || 0);
```

Problem:

- user.balance może być stary
- Po spinie balance aktualizuje się ręcznie
- Brak consistency

Rozwiązanie:

- Zawsze pobieraj balance z `/api/casino/balance`
- Cache z React Query
- Invalidate po spinie

---

### 8. NONCE TRACKING NIE DZIAŁĄ

Problem: lastNonce przechowywany w userBalance ale nie używany prawidłowo

casino.ts:

```ts
if (body.nonce !== userBalanceRecord.lastNonce + 1) {
  body.nonce = userBalanceRecord.lastNonce + 1; // ❌ Override!
}
```

Powinno być:

```ts
if (body.nonce !== userBalanceRecord.lastNonce + 1) {
  return c.json({ error: "invalid_nonce" }, 400); // ✅ Reject!
}
```

---

### 9. BRAK TRANSAKCJI W BAZIE

Problem: Spin nie jest atomowy

casino.ts:

```ts
await db.insert(casinoSpin).values({...});
for (const bet of body.bets) {
  await db.insert(casinoBet).values({...});
}
await db.update(userBalance).set({...});
```

Jeśli padnie między insertami → niespójność danych!

Rozwiązanie: Użyj database transaction

---

### 10. BRAK IDEMPOTENCY

Problem: Dwa identyczne requesty = dwa spiny

Jeśli network error w połowie:

- Spin został zapisany
- Frontend retry wysyła drugi spin
- Użytkownik stracił 2x stawkę!

Rozwiązanie: Idempotency key w requestzie

---

## 🟢 REKOMENDACJE ARCHITEKTUROWE

### A. FLOW SPIN POWINIEN BYĆ:

Frontend:

1. GET /api/casino/nonce → pobierz nextNonce
2. generateClientSeed()
3. Wyświetl bety do zatwierdzenia
4. POST /api/casino/spin { bety, clientSeed, nonce, idempotencyKey }
5. Czekaj na wynik
6. Invalidate balance cache
7. Pokaż wynik

Backend:

1. Waliduj auth
2. Waliduj nonce === lastNonce + 1
3. Waliduj idempotencyKey (czy już był spinn z tym keyem)
4. Waliduj bety
5. Waliduj saldo
6. Start transaction
7. Oblicz wynik (Provably Fair)
8. Uaktualnij balance
9. Zapisz spin + bety
10. Commit transaction
11. Zwróć wynik + newBalance + nextNonce
12. Frontend invalidates cache

### B. NOWE ENDPOINTY:

```ts
// 1. Pobierz nextNonce (musi być atomowy z lastNonce)
GET /api/casino/nonce
Response: { nextNonce: number }

// 2. Pobierz balance (fresh)
GET /api/casino/balance
Response: { balance: number, nonce: number }

// 3. Validuj bet (dry-run)
POST /api/casino/validate-bets
Request: { bets: Bet[] }
Response: { valid: boolean, totalStake: number }

// 4. Spin z idempotency
POST /api/casino/spin
Request: {
  bets: Bet[]
  clientSeed: string
  nonce: number
  idempotencyKey: string  // ✨ NEW
}
Response: {
  result: SpinResult
  totalBet: number
  totalWin: number
  newBalance: number
  nextNonce: number  // ✨ NEW
  spinId: string
  provablyFair: {...}
}
```

### C. FRONTEND STATE MANAGEMENT:

```ts
// Zamiast tego:
const [balance, setBalance] = useState(user?.balance || 0);
const [result, setResult] = useState(null);
const [data, setData] = useState(null);

// Rób to:
const { data: balance } = useQuery({
  queryKey: ["casino-balance"],
  queryFn: async () => {
    const res = await api.casino.balance.$get();
    return res.json();
  },
  staleTime: 5000, // Refresh co 5 sekund lub po spinie
});

const { data: nextNonce } = useQuery({
  queryKey: ["casino-nonce"],
  queryFn: async () => {
    const res = await api.casino.nonce.$get();
    return res.json();
  },
});

const spinMutation = useMutation({
  mutationFn: async (bets: Bet[]) => {
    const clientSeed = generateClientSeed();
    const res = await api.casino.spin.$post({
      json: {
        bets,
        clientSeed,
        nonce: nextNonce.nextNonce,
        idempotencyKey: generateId(),
      },
    });
    return res.json();
  },
  onSuccess: (data) => {
    queryClient.setQueryData(["casino-balance"], data.newBalance);
    queryClient.setQueryData(["casino-nonce"], { nextNonce: data.nextNonce });
    setSpinResult(data);
  },
  onError: (error) => {
    toast.error(error.message);
  },
});
```

### D. BACKEND TRANSAKCJE:

```ts
.post('/spin', zValidator('json', spinRequestSchema), async (c) => {
  const { id: userId } = c.get('user') as User;
  const body = c.req.valid('json');

  // ✨ Nowe walidacje
  if (!body.idempotencyKey) {
    return c.json({ error: 'missing_idempotency_key' }, 400);
  }

  // Sprawdź czy już był ten spin
  const existingSpin = await db.query.casinoSpin.findFirst({
    where: eq(casinoSpin.idempotencyKey, body.idempotencyKey),
  });

  if (existingSpin) {
    return c.json({
      result: {...},
      totalBet: existingSpin.totalBet,
      totalWin: existingSpin.totalWin,
      newBalance: existingSpin.newBalance,
      spinId: existingSpin.id,
    });
  }

  // ✨ Waliduj nonce ZARAZ
  const userBalance = await db.query.userBalance.findFirst({
    where: eq(userBalance.userId, userId),
  });

  if (body.nonce !== userBalance.lastNonce + 1) {
    return c.json({
      error: 'invalid_nonce',
      expectedNonce: userBalance.lastNonce + 1,
    }, 400);
  }

  // ✨ Transaction
  const result = await db.transaction(async (tx) => {
    // Waliduj saldo
    const balance = Number(userBalance.balance);
    const totalBet = calculateTotalBet(body.bets);

    if (balance < totalBet) {
      tx.rollback();
      throw new Error('insufficient_funds');
    }

    // Oblicz wynik
    const hmac = computeHmac(serverSeed, body.clientSeed, body.nonce);
    const number = hashToRouletteNumber(hmac);
    const color = getNumberColor(number);

    let totalWin = 0;
    for (const bet of body.bets) {
      totalWin += calculateBetWinnings(bet, { number, color });
    }

    // Zapisz spin
    const spinId = generateId();
    await tx.insert(casinoSpin).values({
      id: spinId,
      userId,
      clientSeed: body.clientSeed,
      nonce: body.nonce,
      hmac,
      number,
      color,
      totalBet,
      totalWin,
      idempotencyKey: body.idempotencyKey,
    });

    // Zapisz bety
    for (const bet of body.bets) {
      const win = calculateBetWinnings(bet, { number, color });
      await tx.insert(casinoBet).values({
        id: generateId(),
        spinId,
        type: bet.type,
        numbers: JSON.stringify(bet.numbers),
        amount: bet.amount,
        color: bet.color,
        choice: bet.choice,
        win,
      });
    }

    // Uaktualnij balance
    const newBalance = balance - totalBet + totalWin;
    await tx
      .update(userBalance)
      .set({
        balance: newBalance.toString(),
        lastNonce: body.nonce,
      })
      .where(eq(userBalance.userId, userId));

    return { spinId, number, color, totalBet, totalWin, newBalance };
  });

  return c.json({
    result: { number: result.number, color: result.color },
    totalBet: result.totalBet,
    totalWin: result.totalWin,
    newBalance: result.newBalance,
    nextNonce: body.nonce + 1,  // ✨ Powiedz co będzie następny
    spinId: result.spinId,
    provablyFair: {...}
  });
});
```

### E. SCHEMA UPDATES:

```ts
// Dodaj do casinoSpin:
export const casinoSpin = sqliteTable("casino_spin", {
  // ... istniejące pola
  idempotencyKey: text("idempotency_key").unique().notNull(), // ✨ NEW
});

// Dodaj do userBalance:
export const userBalance = sqliteTable("user_balance", {
  // ... istniejące pola
  nonce: integer("nonce").notNull().default(0), // ✨ Zmień z lastNonce
});
```

---

## 📋 CHECKLIST DO IMPLEMENTACJI

[✅] 1. Dodaj idempotencyKey do spinRequestSchema
[ ] 2. Dodaj nonce endpoint
[ ] 3. Zaimplementuj clientSeed generator na kliencie
[ ] 4. Refactor roulette.tsx do React Query
[ ] 5. Dodaj toast notifications zamiast alert()
[ ] 6. Zmień walidację nonce - reject zamiast override
[ ] 7. Dodaj database transaction do spin endpoint
[ ] 8. Dodaj idempotency check
[ ] 9. Update schema z nowymi polami
[ ] 10. Przetestuj całe flow: nonce → spin → nonce+1

---

## 🚀 KROKI NASTĘPNE (PRIORITY)

1. **HIGH** - Napraw nonce logic (teraz system jest inny niż powinien być)
2. **HIGH** - Dodaj clientSeed generator i pobieranie nonce
3. **HIGH** - Implement React Query caching
4. **MEDIUM** - Dodaj database transactions
5. **MEDIUM** - Dodaj idempotency
6. **LOW** - Wskaźniki UX (loading, toasts, etc)

\*/
