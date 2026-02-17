# 🎰 Casino Roulette

> Nowoczesna aplikacja kasyna online z weryfikowalnym systemem Provably Fair, zbudowana na bazie Bun, Hono i React.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.x-black?logo=bun)](https://bun.sh)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)](https://react.dev)
[![Hono](https://img.shields.io/badge/Hono-4.10-E36002?logo=hono)](https://hono.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)

## 📋 Spis Treści

- [Opis Projektu](#-opis-projektu)
- [Stack Technologiczny](#-stack-technologiczny)
- [Główne Funkcjonalności](#-główne-funkcjonalności)
- [Architektura](#-architektura)
- [Instalacja i Uruchomienie](#-instalacja-i-uruchomienie)
- [Konfiguracja](#-konfiguracja)
- [Dokumentacja API](#-dokumentacja-api)
- [Schemat Bazy Danych](#-schemat-bazy-danych)
- [System Provably Fair](#-system-provably-fair)
- [Docker](#-docker)
- [Rozwój i Testing](#-rozwój-i-testing)

---

## 🎯 Opis Projektu

**Casino Roulette** to pełnoprawna aplikacja kasyna online z implementacją gry w ruletkę europejską (37 pól: 0-36). Projekt wyróżnia się:

- **Systemem Provably Fair** - każdy spin jest kryptograficznie weryfikowalny przez gracza
- **Zaawansowaną warstwą interaktywną** - unikalna siatka CSS Grid obsługująca wszystkie typy zakładów (inside/outside)
- **Real-time animacjami** - płynna symulacja fizyki koła ruletki z dźwiękami
- **Systemem autentykacji** - Better Auth z obsługą GitHub OAuth i email/password
- **Rate limiting** - zabezpieczenie przed nadużyciami (100 req/min API, 30 spinów/min)
- **Idempotency** - wielokrotne wysłanie tego samego żądania nie powoduje duplikacji

---

## 🛠 Stack Technologiczny

### Frontend

| Technologia         | Wersja | Opis                                         |
| ------------------- | ------ | -------------------------------------------- |
| **React**           | 18.3   | Biblioteka UI z hooks i concurrent rendering |
| **TypeScript**      | 5.6    | Statyczne typowanie dla bezpieczeństwa kodu  |
| **Vite**            | 7.1    | Ultraszybki bundler z HMR                    |
| **TanStack Router** | 1.133  | Type-safe routing z lazy loading             |
| **TanStack Query**  | 5.90   | Server state management z caching            |
| **Tailwind CSS**    | 3.4    | Utility-first CSS framework                  |
| **Framer Motion**   | 12.23  | Zaawansowane animacje i transitions          |
| **Radix UI**        | latest | Headless UI components (Toast, Label, Slot)  |
| **Lucide React**    | 0.469  | Biblioteka ikon                              |
| **Canvas Confetti** | 1.9    | Efekty wizualne wygranej                     |
| **Sonner**          | 2.0    | Toast notifications                          |
| **Zod**             | 3.25   | Runtime schema validation                    |
| **Better Auth**     | 1.3    | Client-side auth SDK                         |

### Backend

| Technologia           | Wersja | Opis                                   |
| --------------------- | ------ | -------------------------------------- |
| **Bun**               | 1.x    | Szybki runtime JavaScript/TypeScript   |
| **Hono**              | 4.10   | Ultraszybki web framework (Edge-ready) |
| **PostgreSQL**        | 16+    | Relacyjna baza danych                  |
| **Drizzle ORM**       | 0.45   | TypeScript-first ORM z migracje        |
| **Better Auth**       | 1.3    | Kompleksowy system autentykacji        |
| **Zod**               | 3.25   | Schema validation dla API              |
| **Hono Rate Limiter** | 0.5    | Middleware do rate limiting            |

### Tooling & DevOps

| Narzędzie        | Opis                                          |
| ---------------- | --------------------------------------------- |
| **ESLint**       | Linting z konfiguracją dla React i TypeScript |
| **Drizzle Kit**  | CLI do zarządzania migracjami bazy danych     |
| **Concurrently** | Równoczesne uruchamianie frontend/backend     |
| **Docker**       | Konteneryzacja aplikacji                      |
| **TSX**          | TypeScript execution dla Node.js              |

---

## ✨ Główne Funkcjonalności

### 🎲 System Zakładów

#### Inside Bets (zakłady wewnętrzne)

- **Straight Up** (1 numer) - 35:1 - bezpośrednie kliknięcie na numer
- **Split** (2 numery) - 17:1 - kliknięcie na linię między numerami
- **Street** (3 numery) - 11:1 - kliknięcie na dolną krawędź kolumny
- **Corner** (4 numery) - 8:1 - kliknięcie na skrzyżowanie czterech pól
- **Line/Six-line** (6 numerów) - 5:1 - kliknięcie między dwoma streetami

#### Outside Bets (zakłady zewnętrzne)

- **Red/Black** - 1:1 - kolor numeru
- **Even/Odd** - 1:1 - parzystość numeru (0 nie wygrywa)
- **High/Low** - 1:1 - 1-18 lub 19-36
- **Dozens** - 2:1 - 1-12, 13-24, 25-36
- **Columns** - 2:1 - jedna z trzech kolumn pionowych

### 🎨 Zaawansowana Warstwa Interaktywna

**RouletteInteractionLayer** - innowacyjny komponent oparty na CSS Grid:

- **Siatka 25×7** - precyzyjnie pokrywa cały stół (12 kolumn × 3 rzędy + linie)
- **Matematyczna kalkulacja** - automatyczne wykrywanie typu zakładu na podstawie współrzędnych
- **Hover preview** - podświetlanie wszystkich pól objętych zakładem
- **Multi-button support** - lewy przycisk (dodaj), prawy (usuń), środkowy (usuń wszystko)
- **Debug mode** - kolorowe strefy dla deweloperów

### 🔐 System Provably Fair

Każdy spin jest weryfikowalny kryptograficznie:

```typescript
HMAC = SHA256(serverSeed, `${clientSeed}:${nonce}`);
result = parseInt(HMAC.substring(0, 8), 16) % 37;
```

**Komponenty:**

- **Server Seed** - losowy hex generowany przez serwer, hashowany SHA-256
- **Client Seed** - generowany przez klienta przed każdym spinem
- **Nonce** - auto-inkrementowany licznik dla unikalności
- **HMAC** - kryptograficzny dowód uczciwości

**Weryfikacja:**

1. Gracz widzi hash server seed przed spinem
2. Po spinie otrzymuje HMAC i wszystkie parametry
3. Może zweryfikować wynik lokalnie
4. Admin może ujawnić server seed po rotacji

### 🎡 Fizyka i Animacje

- **Realistyczna symulacja** - koło obraca się zawsze w tym samym kierunku z easing curve
- **Dźwięki tick-tick** - audio feedback podczas wirowania (Web Audio API)
- **Smooth animations** - Framer Motion dla płynnych przejść
- **Konfetti** - efekt wizualny przy wygranej (Canvas Confetti)
- **Responsive design** - działa na wszystkich urządzeniach

### 💰 System Portfela

- **Real-time balance** - TanStack Query z automatycznym cache
- **Transaction history** - pełna historia spinów i zakładów
- **Initial balance** - 100,000 zł na start dla nowych użytkowników
- **Atomic updates** - Drizzle ORM transactions dla consistency

### 🔒 Bezpieczeństwo

- **Rate Limiting** - 100 req/min dla API, 30 spinów/min dla /spin
- **Secure Headers** - XSS, clickjacking protection (Hono middleware)
- **Session Management** - Better Auth z token rotation
- **Idempotency Keys** - zapobieganie duplikacji spinów
- **Input Validation** - Zod schemas na frontend i backend
- **CORS Protection** - konfiguracja dla production
- **SQL Injection Protection** - Drizzle ORM prepared statements

---

## 🏗 Architektura

### Komunikacja Frontend ↔ Backend

Projekt wykorzystuje **RPC-style API** z Hono:

```typescript
// Backend (Hono)
const app = new Hono()
  .get("/balance", async (c) => {
    /* ... */
  })
  .post("/spin", zValidator("json", spinRequestSchema), async (c) => {
    /* ... */
  });

// Frontend (Hono Client)
import { hc } from "hono/client";
const client = hc<typeof app>("http://localhost:3000/api");
const res = await client.casino.balance.$get();
```

**Zalety:**

- ✅ Type-safety end-to-end (typy dzielone między frontend/backend)
- ✅ Autocomplete w IDE dla wszystkich endpointów
- ✅ Brak potrzeby code generation (jak tRPC)
- ✅ Walidacja runtime z Zod na obu stronach

### Struktura Katalogów

```
expense-tracker/
├── src/                      # Backend (Hono + Bun)
│   ├── index.ts             # Entry point, middleware setup
│   ├── auth.ts              # Better Auth configuration
│   ├── types.ts             # Shared TypeScript types
│   ├── zodTypes.ts          # Zod validation schemas
│   ├── db/
│   │   ├── schema.ts        # Drizzle ORM schema
│   │   └── postgres.ts      # Database connection
│   ├── lib/
│   │   ├── casinoHelpers.ts # Legacy bridge
│   │   └── roulette/        # Roulette engine (Provably Fair)
│   │       ├── engine.ts    # Core logic
│   │       ├── constants.ts # Payout tables, wheel sequence
│   │       ├── types.ts     # TypeScript types
│   │       └── utils.ts     # Helper functions
│   └── routes/
│       ├── casino.ts        # Casino API endpoints
│       └── expenses.ts      # Expenses CRUD (legacy)
│
├── client/                   # Frontend (React + Vite)
│   ├── src/
│   │   ├── main.tsx         # Entry point
│   │   ├── auth-context.tsx # Auth state management
│   │   ├── components/
│   │   │   ├── RouletteWheel.tsx          # Animated wheel
│   │   │   ├── RouletteControls.tsx       # Betting table + overlay
│   │   │   ├── RouletteInteractionLayer.tsx # Inside bets grid
│   │   │   ├── RouletteBettingBoard.tsx   # Standalone board
│   │   │   ├── RouletteResult.tsx         # Result display
│   │   │   ├── SpinHistory.tsx            # Last spins
│   │   │   ├── ProvablyFairInfo.tsx       # Verification panel
│   │   │   ├── BalanceDisplay.tsx         # Wallet component
│   │   │   └── ui/                        # Radix UI components
│   │   ├── hooks/
│   │   │   ├── useCasinoGame.ts          # Main game logic
│   │   │   └── use-toast.ts              # Toast notifications
│   │   ├── lib/
│   │   │   ├── api.ts                    # Hono client setup
│   │   │   ├── bettingGrid.ts            # Grid calculation logic
│   │   │   ├── rouletteHelpers.ts        # Bet formatting helpers
│   │   │   └── roulette/                 # Client-side roulette utils
│   │   └── routes/
│   │       └── _authenticated/games/roulette.tsx
│   └── public/
│
├── drizzle/                 # Database migrations
├── docs/
│   └── API.md              # Kompletna dokumentacja API
├── .env.example            # Environment variables template
├── drizzle.config.ts       # Drizzle ORM config
├── Dockerfile              # Production container
└── package.json            # Root scripts (dev, build, docker)
```

---

## 🚀 Instalacja i Uruchomienie

### Wymagania

- **Bun** >= 1.0.0 ([instalacja](https://bun.sh))
- **PostgreSQL** >= 16 (lokalnie lub Docker)
- **Node.js** >= 18 (opcjonalnie, Bun jest preferowany)

### Krok 1: Klonowanie Repozytorium

```bash
git clone https://github.com/fentashot/casino.git
cd casino
```

### Krok 2: Instalacja Zależności

```bash
# Root (backend)
bun install

# Frontend
cd client
bun install
cd ..
```

### Krok 3: Konfiguracja Bazy Danych

#### Opcja A: Lokalny PostgreSQL

```bash
# Utwórz bazę danych
psql -U postgres
CREATE DATABASE casino;
\q
```

#### Opcja B: Docker PostgreSQL

```bash
docker run --name casino-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=casino \
  -p 5432:5432 \
  -d postgres:16
```

### Krok 4: Konfiguracja Zmiennych Środowiskowych

```bash
cp .env.example .env
```

Edytuj `.env` (patrz [Konfiguracja](#-konfiguracja))

### Krok 5: Migracje Bazy Danych

```bash
# Generuj migracje (jeśli zmieniłeś schema)
bun run db:gen

# Aplikuj migracje
bun run db:push
```

### Krok 6: Inicjalizacja Server Seed (pierwsza konfiguracja)

```bash
# Uruchom backend
bun run dev:server

# W osobnym terminalu, zainicjuj pierwszy server seed (POST /api/casino/rotate)
curl -X POST http://localhost:3000/api/casino/rotate \
  -H "Content-Type: application/json" \
  -b "better-auth.session_token=<ADMIN_TOKEN>"
```

> **Uwaga:** Potrzebujesz konta administratora. Pierwszy użytkownik może być ręcznie ustawiony jako admin w bazie:
>
> ```sql
> UPDATE "user" SET role = 'admin' WHERE email = 'twoj@email.com';
> ```

### Krok 7: Uruchomienie Development

```bash
# Root directory - uruchamia backend + frontend jednocześnie
bun run dev
```

**Aplikacja dostępna pod:**

- Frontend: http://localhost:3000
- Backend API: http://localhost:3000/api
- TanStack Router DevTools: http://localhost:3000/**devtools**
- TanStack Query DevTools: wbudowane w aplikację

### Krok 8: Build Production

```bash
# Backend
bun run build

# Frontend
cd client
bun run build
cd ..

# Uruchom production build
bun run start
```

---

## ⚙️ Konfiguracja

### Zmienne Środowiskowe (`.env`)

```bash
# ============ Database ============
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/casino

# ============ GitHub OAuth (opcjonalne) ============
# Uzyskaj z https://github.com/settings/developers
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# ============ Better Auth ============
# Generuj: openssl rand -hex 32
BETTER_AUTH_SECRET=your_random_secret_min_32_chars
BETTER_AUTH_URL=http://localhost:3000

# ============ Server (opcjonalne) ============
PORT=3000  # default: 3000
```

### Drizzle Config (`drizzle.config.ts`)

```typescript
export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
};
```

### Tailwind Config

TailwindCSS skonfigurowany z:

- **Animacje** - `tailwindcss-animate`
- **Custom kolory** - green/red/black cells dla ruletki
- **CSS Variables** - zgodność z Radix UI

---

## 📚 Dokumentacja API

> Pełna dokumentacja dostępna w [docs/API.md](docs/API.md)

### Główne Endpointy

#### **Autentykacja** (Better Auth)

| Method | Endpoint                    | Opis                       | Auth |
| ------ | --------------------------- | -------------------------- | ---- |
| `POST` | `/api/auth/sign-up/email`   | Rejestracja email/password | ❌   |
| `POST` | `/api/auth/sign-in/email`   | Logowanie email/password   | ❌   |
| `POST` | `/api/auth/sign-out`        | Wylogowanie                | ✅   |
| `GET`  | `/api/auth/session`         | Pobierz aktualną sesję     | ✅   |
| `GET`  | `/api/auth/callback/github` | GitHub OAuth callback      | ❌   |

#### **Casino**

| Method | Endpoint                  | Opis                               | Auth | Rate Limit |
| ------ | ------------------------- | ---------------------------------- | ---- | ---------- |
| `GET`  | `/api/casino/balance`     | Pobierz saldo użytkownika          | ✅   | 100/min    |
| `GET`  | `/api/casino/seed`        | Pobierz hash aktywnego server seed | ✅   | 100/min    |
| `GET`  | `/api/casino/nonce`       | Pobierz następny nonce             | ✅   | 100/min    |
| `POST` | `/api/casino/spin`        | Wykonaj spin ruletki               | ✅   | **30/min** |
| `POST` | `/api/casino/rotate`      | Rotuj server seed (admin)          | ✅🔑 | 100/min    |
| `POST` | `/api/casino/reveal`      | Ujawnij nieaktywny seed (admin)    | ✅🔑 | 100/min    |
| `GET`  | `/api/casino/history`     | Historia spinów                    | ✅   | 100/min    |
| `GET`  | `/api/casino/history/:id` | Szczegóły spinu                    | ✅   | 100/min    |
| `POST` | `/api/casino/admin/seed`  | Załaduj nowy seed (admin)          | ✅🔑 | 100/min    |

**Legenda:** ✅ = wymagana autentykacja, 🔑 = tylko admin

### Przykład: POST /api/casino/spin

**Request:**

```json
{
  "bets": [
    {
      "type": "straight",
      "numbers": [17],
      "amount": 100,
      "color": null,
      "choice": null
    },
    {
      "type": "red_black",
      "numbers": [],
      "amount": 50,
      "color": "red",
      "choice": null
    }
  ],
  "clientSeed": "a1b2c3d4e5f6...",
  "nonce": 42,
  "idempotencyKey": "uuid-v4-string" // opcjonalne
}
```

**Response:**

```json
{
  "result": {
    "number": 17,
    "color": "black"
  },
  "totalBet": 150,
  "totalWin": 3500,
  "newBalance": 103350,
  "provablyFair": {
    "clientSeed": "a1b2c3d4e5f6...",
    "serverSeedHash": "sha256-hash...",
    "nonce": 42,
    "hmac": "hmac-sha256..."
  }
}
```

### Walidacja Zod

Wszystkie endpointy API używają Zod schemas:

```typescript
// src/zodTypes.ts
export const betSchema = z.object({
  type: z.enum(['straight', 'split', 'street', 'corner', 'line',
                'column', 'dozen', 'even_odd', 'red_black', 'high_low']),
  numbers: z.array(z.number().int().min(0).max(36)),
  amount: z.number().int().positive(),
  color: z.enum(['red', 'black']).optional(),
  choice: z.union([...]).optional(),
});

export const spinRequestSchema = z.object({
  bets: z.array(betSchema),
  clientSeed: z.string().min(1),
  nonce: z.number().int().nonnegative(),
  idempotencyKey: z.string().min(16).max(64).optional(),
});
```

---

## 🗄 Schemat Bazy Danych

### Diagram ERD

```
┌──────────────┐       ┌─────────────────┐       ┌──────────────────┐
│     user     │───┬───│  user_balance   │       │ casino_spin      │
├──────────────┤   │   ├─────────────────┤   ┌───├──────────────────┤
│ id (PK)      │   │   │ userId (PK, FK) │   │   │ id (PK)          │
│ name         │   │   │ balance         │   │   │ userId (FK)      │
│ email        │   │   │ lastNonce       │   │   │ serverSeedId (FK)│
│ role         │   │   │ updatedAt       │   │   │ clientSeed       │
│ createdAt    │   │   └─────────────────┘   │   │ nonce            │
└──────────────┘   │                         │   │ hmac             │
       │           │   ┌─────────────────┐   │   │ number           │
       │           └───│    session      │   │   │ color            │
       │               ├─────────────────┤   │   │ totalBet         │
       │               │ id (PK)         │   │   │ totalWin         │
       │               │ userId (FK)     │   │   │ idempotencyKey   │
       │               │ token           │   │   │ createdAt        │
       │               │ expiresAt       │   │   └──────────────────┘
       │               └─────────────────┘   │            │
       │                                     │            │
       │   ┌─────────────────────────┐       │   ┌────────┴────────┐
       └───│    expense_table        │       │   │  casino_bet     │
           ├─────────────────────────┤       │   ├─────────────────┤
           │ id (PK)                 │       └───│ id (PK)         │
           │ userId (FK)             │           │ spinId (FK)     │
           │ title                   │           │ type            │
           │ amount                  │           │ numbers (JSON)  │
           │ date                    │           │ amount          │
           └─────────────────────────┘           │ win             │
                                                 └─────────────────┘
           ┌──────────────────────┐
           │ casino_server_seed   │
           ├──────────────────────┤
           │ id (PK)              │
           │ seed                 │
           │ hash                 │
           │ active               │
           │ createdAt            │
           │ revealedAt           │
           └──────────────────────┘
```

### Kluczowe Tabele

#### **user** - Użytkownicy (Better Auth)

```sql
CREATE TABLE "user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  image TEXT,
  role TEXT DEFAULT 'user', -- 'user' | 'admin'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **user_balance** - Portfele użytkowników

```sql
CREATE TABLE user_balance (
  user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL DEFAULT 0,
  last_nonce INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **casino_server_seed** - Server Seeds (Provably Fair)

```sql
CREATE TABLE casino_server_seed (
  id TEXT PRIMARY KEY,
  seed TEXT NOT NULL,           -- Sekret, ujawniany po rotacji
  hash TEXT NOT NULL,            -- SHA-256(seed), widoczny dla graczy
  active BOOLEAN DEFAULT true,   -- Tylko jeden może być aktywny
  created_at TIMESTAMP DEFAULT NOW(),
  revealed_at TIMESTAMP          -- Czas ujawnienia
);
```

#### **casino_spin** - Historia Spinów

```sql
CREATE TABLE casino_spin (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE,
  server_seed_id TEXT REFERENCES casino_server_seed(id),
  client_seed TEXT NOT NULL,
  nonce INTEGER NOT NULL,
  hmac TEXT NOT NULL,            -- HMAC-SHA256 dla weryfikacji
  number INTEGER NOT NULL,       -- 0-36
  color TEXT NOT NULL,           -- 'red' | 'black' | 'green'
  total_bet NUMERIC NOT NULL,
  total_win NUMERIC NOT NULL,
  idempotency_key TEXT UNIQUE,   -- Zapobiega duplikacji
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX spin_user_id_idx ON casino_spin(user_id);
CREATE INDEX spin_idempotency_key_idx ON casino_spin(idempotency_key);
```

#### **casino_bet** - Szczegóły Zakładów

```sql
CREATE TABLE casino_bet (
  id TEXT PRIMARY KEY,
  spin_id TEXT REFERENCES casino_spin(id) ON DELETE CASCADE,
  type TEXT NOT NULL,            -- 'straight', 'split', etc.
  numbers TEXT NOT NULL,         -- JSON array [1,2,3]
  amount NUMERIC NOT NULL,
  color TEXT,                    -- dla red/black
  choice TEXT,                   -- dla dozen/column/etc.
  win NUMERIC NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX bet_spin_id_idx ON casino_bet(spin_id);
```

### Migracje

Zarządzane przez **Drizzle Kit**:

```bash
# Generuj nową migrację po zmianie schema.ts
bun run db:gen

# Aplikuj migracje do bazy
bun run db:push

# Sprawdź status migracji
bun run drizzle-kit studio
```

---

## 🔐 System Provably Fair

### Jak to Działa?

#### 1. Inicjalizacja Server Seed

```typescript
// Backend: Generowanie nowego seed
const serverSeed = crypto.randomBytes(32).toString("hex");
const serverSeedHash = crypto
  .createHash("sha256")
  .update(serverSeed)
  .digest("hex");

// Zapisz w bazie
await db.insert(casinoServerSeed).values({
  seed: serverSeed, // SEKRET, nie ujawniaj graczom
  hash: serverSeedHash, // PUBLICZNY, pokazuj przed spinem
  active: true,
});
```

#### 2. Gracz Generuje Client Seed

```typescript
// Frontend: Przed każdym spinem
const clientSeed = crypto.randomUUID(); // lub dowolny string
const nonce = lastNonce + 1; // auto-inkrement
```

#### 3. Obliczanie Wyniku

```typescript
// Backend: Spin
const hmac = crypto
  .createHmac("sha256", Buffer.from(serverSeed, "hex"))
  .update(`${clientSeed}:${nonce}`)
  .digest("hex");

const number = parseInt(hmac.substring(0, 8), 16) % 37;
// 0-36 (European Roulette)
```

#### 4. Weryfikacja przez Gracza

Po rotacji server seed, gracz może zweryfikować wszystkie poprzednie spiny:

```javascript
// Pobierz ujawniony server seed
const revealedSeed = "abc123..."; // z /api/casino/reveal

// Dla każdego spinu
spins.forEach((spin) => {
  const hmac = crypto
    .createHmac("sha256", Buffer.from(revealedSeed, "hex"))
    .update(`${spin.clientSeed}:${spin.nonce}`)
    .digest("hex");

  const calculatedNumber = parseInt(hmac.substring(0, 8), 16) % 37;

  console.log(
    `Spin ${spin.id}: ${calculatedNumber === spin.number ? "✅ OK" : "❌ FAIL"}`,
  );
});
```

### Komponenty UI

**ProvablyFairInfo.tsx** - Panel weryfikacji:

- Wyświetla server seed hash przed spinem
- Pokazuje HMAC po spinie
- Link do zewnętrznego verifier'a
- Tutorial jak zweryfikować

**AdminSeedPanel.tsx** - Panel admina:

- Rotacja server seed
- Ujawnienie nieaktywnych seedów
- Historia seedów

---

## 🐳 Docker

### Build i Uruchomienie

```bash
# Build image
bun run d:build

# Uruchom kontener (produkcja)
bun run d:runp

# Uruchom kontener (dev z hotreload)
bun run d:dev
```

### Dockerfile

```dockerfile
FROM oven/bun:1

WORKDIR /app

# Dependencies
COPY package.json bun.lock ./
COPY client/package.json client/bun.lock ./client/
RUN bun install

# Copy source
COPY . .

# Build frontend
RUN cd client && bun run build

# Build backend
RUN bun run build

EXPOSE 3000

CMD ["bun", "run", "start"]
```

### Docker Compose (opcjonalnie)

```yaml
version: "3.8"
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: casino
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      - postgres

volumes:
  pgdata:
```

---

## 🧪 Rozwój i Testing

### Skrypty NPM/Bun

```json
{
  "scripts": {
    "dev": "concurrently -n api,web \"bun run dev:server\" \"bun run dev:client\"",
    "dev:server": "bun --bun run --hot src/index.ts",
    "dev:client": "bun run --cwd client dev",
    "build": "bun build src/index.ts --outdir dist",
    "start": "bun run dist/index.js",
    "db:gen": "bun run drizzle-kit generate",
    "db:push": "bun run drizzle-kit push",
    "lint": "eslint .",
    "d:build": "docker build -t casino .",
    "d:runp": "docker run --rm -p 0.0.0.0:3000:3000 --env-file .env casino"
  }
}
```

### Hot Reload

- **Backend:** `bun --hot` - automatyczny restart przy zmianie plików
- **Frontend:** Vite HMR - instant updates bez reload

### Debugging

#### Backend (Bun)

```bash
# Z breakpoints (VS Code)
bun --inspect src/index.ts
```

#### Frontend (React DevTools)

- Zainstaluj React DevTools extension
- Otwórz DevTools w przeglądarce
- TanStack Query DevTools: wbudowane w dev mode

### Linting

```bash
# Frontend
cd client
bun run lint

# Automatyczne fixowanie
bun run lint --fix
```

### Database Studio (Drizzle Kit)

```bash
# Uruchom web UI do przeglądania bazy
bunx drizzle-kit studio

# Otworzy: https://local.drizzle.studio
```

---

## 📝 Licencja

Ten projekt jest licencjonowany na warunkach MIT License.

---
