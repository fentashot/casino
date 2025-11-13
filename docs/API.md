# API Documentation

Complete REST API documentation for the Expense Tracker application.

## 📋 Table of Contents

- [General Notes](#general-notes)
- [Authentication](#authentication)
- [Expenses](#expenses)
- [Casino](#casino)
- [Error Codes](#error-codes)

## General Notes

### Base URL

```
Development: http://localhost:2137/api
Production: https://your-domain.com/api
```

### Response Format

All responses are in JSON format.

### Authentication

Most endpoints require authentication. The session token is sent as a `better-auth.session_token` cookie.

---

## Authentication

### Sign Up (Email/Password)

Register a new user.

**Endpoint:** `POST /api/auth/sign-up/email`

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "Jan Kowalski"
}
```

**Response:** `200 OK`

```json
{
  "user": {
    "id": "usr_123456",
    "email": "user@example.com",
    "name": "Jan Kowalski",
    "emailVerified": false,
    "image": null
  },
  "session": {
    "id": "ses_123456",
    "userId": "usr_123456",
    "expiresAt": "2025-12-12T10:00:00.000Z",
    "token": "..."
  }
}
```

**Błędy:**

- `400 Bad Request` - Nieprawidłowe dane
- `409 Conflict` - Użytkownik już istnieje

---

### Logowanie (Email/Password)

Logowanie istniejącego użytkownika.

**Endpoint:** `POST /api/auth/sign-in/email`

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:** `200 OK`

```json
{
  "user": {
    "id": "usr_123456",
    "email": "user@example.com",
    "name": "Jan Kowalski"
  },
  "session": {
    "id": "ses_123456",
    "token": "..."
  }
}
```

**Błędy:**

- `401 Unauthorized` - Nieprawidłowe dane logowania

---

### OAuth GitHub

Przekierowanie do GitHub OAuth.

**Endpoint:** `GET /api/auth/github`

Przekierowuje do GitHub OAuth flow.

---

### Pobierz sesję

Pobiera informacje o aktualnej sesji użytkownika.

**Endpoint:** `GET /api/auth/session`

**Headers:**

```
Cookie: better-auth.session_token=...
```

**Response:** `200 OK`

```json
{
  "user": {
    "id": "usr_123456",
    "email": "user@example.com",
    "name": "Jan Kowalski"
  },
  "session": {
    "id": "ses_123456",
    "expiresAt": "2025-12-12T10:00:00.000Z"
  }
}
```

---

### Sign Out

Sign out user and remove session.

**Endpoint:** `POST /api/auth/sign-out`

**Response:** `200 OK`

```json
{
  "success": true
}
```

---

## Expenses

All expense endpoints require authentication.

### List Expenses

Get all expenses for the logged-in user.

**Endpoint:** `GET /api/expenses`

**Headers:**

```
Cookie: better-auth.session_token=...
```

**Response:** `200 OK`

```json
```json
{
  "expenses": [
    {
      "id": 1,
      "userId": "usr_123456",
      "title": "Groceries",
      "amount": "125.50",
      "date": "2025-11-10",
      "createdAt": "2025-11-10T14:30:00.000Z"
    },
    {
      "id": 2,
      "userId": "usr_123456",
      "title": "Gas",
      "amount": "200.00",
      "date": "2025-11-11",
      "createdAt": "2025-11-11T09:15:00.000Z"
    }
  ]
}
```

**Errors:**
- `401 Unauthorized` - Not authenticated

---

### Create Expense

Create a new expense for the logged-in user.

**Endpoint:** `POST /api/expenses`

**Headers:**
```

**Błędy:**

- `401 Unauthorized` - Brak autentykacji

---

### Utwórz wydatek

Tworzy nowy wydatek dla zalogowanego użytkownika.

**Endpoint:** `POST /api/expenses`

**Headers:**

```
Cookie: better-auth.session_token=...
Content-Type: application/json
```

**Request Body:**

```json
{
  "title": "Rachunki",
  "amount": 350.75,
  "date": "2025-11-12"
}
```

**Walidacja (Zod schema):**

- `title`: string, wymagany, min 1 znak, max 100 znaków
- `amount`: number, wymagany, min 0.01
- `date`: string, wymagany, format daty ISO

**Response:** `201 Created`

```json
{
  "id": 3,
  "userId": "usr_123456",
  "title": "Rachunki",
  "amount": "350.75",
  "date": "2025-11-12",
  "createdAt": "2025-11-12T10:20:00.000Z"
}
```

**Błędy:**

- `401 Unauthorized` - Brak autentykacji
- `400 Bad Request` - Nieprawidłowe dane
- `500 Internal Server Error` - Błąd tworzenia wydatku

---

### Usuń wydatek

Usuwa wydatek po ID.

**Endpoint:** `DELETE /api/expenses/:id`

**Headers:**

```
Cookie: better-auth.session_token=...
```

**URL Parameters:**

- `id` (number) - ID wydatku do usunięcia

**Response:** `200 OK`

```json
{
  "message": "Expense deleted"
}
```

**Błędy:**

- `401 Unauthorized` - Brak autentykacji
- `404 Not Found` - Wydatek nie istnieje

---

### Suma wydatków

Pobiera całkowitą sumę wszystkich wydatków użytkownika.

**Endpoint:** `GET /api/expenses/total`

**Headers:**

```
Cookie: better-auth.session_token=...
```

**Response:** `200 OK`

```json
{
  "total": 676.25
}
```

**Błędy:**

- `401 Unauthorized` - Brak autentykacji

---

## Casino

System kasyna z grą w ruletkę. Wszystkie endpointy wymagają autentykacji.

### Pobierz hash server seed

Pobiera hash aktywnego server seed dla weryfikacji provably fair.

**Endpoint:** `GET /api/casino/seed`

**Headers:**

```
Cookie: better-auth.session_token=...
```

**Response:** `200 OK`

```json
{
  "serverSeedHash": "a1b2c3d4e5f6..."
}
```

**Błędy:**

- `401 Unauthorized` - Brak autentykacji
- `500 Internal Server Error` - Brak aktywnego seeda

---

### Saldo użytkownika

Pobiera aktualne saldo użytkownika w kasynie.

**Endpoint:** `GET /api/casino/balance`

**Headers:**

```
Cookie: better-auth.session_token=...
```

**Response:** `200 OK`

```json
{
  "balance": 100000.0
}
```

**Uwaga:** Jeśli użytkownik nie ma salda, automatycznie tworzone jest z wartością 100000.00 (1000 jednostek).

**Błędy:**

- `401 Unauthorized` - Brak autentykacji

---

### Wykonaj spin

Wykonuje spin ruletki z zakładami.

**Endpoint:** `POST /api/casino/spin`

**Headers:**

```
Cookie: better-auth.session_token=...
Content-Type: application/json
```

**Request Body:**

```json
**Request Body:**
```json
{
  "clientSeed": "random-client-seed-123",
  "bets": [
    {
      "betType": "color",
      "choice": "red",
      "amount": 100.00
    },
    {
      "betType": "number",
      "choice": "17",
      "amount": 50.00
    }
  ]
}
```

**Bet Types (`betType`):**
- `color` - Color (red/black)
- `parity` - Parity (even/odd)
- `number` - Specific number (0-36)

**Validation:**
- `clientSeed`: string, required, min 1 char
- `bets`: array, required, min 1 bet, max 10 bets
- `bet.betType`: "color" | "parity" | "number"
- `bet.choice`: string (depends on betType)
- `bet.amount`: number, min 0.01

**Response:** `200 OK`
```

**Typy zakładów (`betType`):**

- `color` - Kolor (red/black)
- `parity` - Parzystość (even/odd)
- `number` - Konkretna liczba (0-36)

**Walidacja:**

- `clientSeed`: string, wymagany, min 1 znak
- `bets`: array, wymagany, min 1 zakład, max 10 zakładów
- `bet.betType`: "color" | "parity" | "number"
- `bet.choice`: string (zależy od betType)
- `bet.amount`: number, min 0.01

**Response:** `200 OK`

```json
{
  "result": 17,
  "serverSeedHash": "a1b2c3d4e5f6...",
  "clientSeed": "random-client-seed-123",
  "nonce": 1,
  "bets": [
    {
      "betType": "color",
      "choice": "red",
      "amount": 100.0,
      "won": true,
      "winnings": 200.0
    },
    {
      "betType": "number",
      "choice": "17",
      "amount": 50.0,
      "won": true,
      "winnings": 1800.0
    }
  ],
  "totalWinnings": 2000.0,
  "newBalance": 101950.0,
  "spinId": "spin_123456"
}
```

**Płatności:**

- Kolor (red/black): 2x stawka
- Parzystość (even/odd): 2x stawka
- Liczba (0-36): 36x stawka

**Błędy:**

- `401 Unauthorized` - Brak autentykacji
- `400 Bad Request` - Nieprawidłowe dane zakładu
- `403 Forbidden` - Niewystarczające saldo
- `500 Internal Server Error` - Błąd przetwarzania

---

### Historia spinów

Pobiera historię spinów użytkownika.

**Endpoint:** `GET /api/casino/spins`

**Headers:**

```
Cookie: better-auth.session_token=...
```

**Query Parameters:**

- `limit` (number, optional) - Limit wyników (default: 50, max: 100)

**Response:** `200 OK`

```json
{
  "spins": [
    {
      "id": "spin_123456",
      "userId": "usr_123456",
      "clientSeed": "random-client-seed-123",
      "nonce": 1,
      "serverSeedId": "seed_abc",
      "result": 17,
      "timestamp": "2025-11-12T10:30:00.000Z"
    }
  ]
}
```

---

### Historia zakładów

Pobiera historię zakładów użytkownika.

**Endpoint:** `GET /api/casino/bets`

**Headers:**

```
Cookie: better-auth.session_token=...
```

**Query Parameters:**

- `limit` (number, optional) - Limit wyników (default: 50, max: 100)
- `spinId` (string, optional) - Filtruj po ID spinu

**Response:** `200 OK`

```json
{
  "bets": [
    {
      "id": "bet_123456",
      "userId": "usr_123456",
      "spinId": "spin_123456",
      "betType": "color",
      "choice": "red",
      "amount": "100.00",
      "won": true,
      "winnings": "200.00"
    }
  ]
}
```

---

### Rotacja server seed (Admin)

Rotuje server seed (wymaga klucza admina).

**Endpoint:** `POST /api/casino/rotate`

**Headers:**

```
Content-Type: application/json
```

**Request Body:**

```json
{
  "adminKey": "your-admin-key"
}
```

**Response:** `200 OK`

```json
{
  "ok": true,
  "newSeedHash": "new-hash-value"
}
```

**Błędy:**

- `401 Unauthorized` - Nieprawidłowy klucz admina

---

### Ujawnienie server seed (Admin)

Ujawnia server seed po rotacji dla weryfikacji (wymaga klucza admina).

**Endpoint:** `POST /api/casino/reveal`

**Headers:**

```
Content-Type: application/json
```

**Request Body:**

```json
{
  "adminKey": "your-admin-key",
  "seedId": "seed_abc"
}
```

**Response:** `200 OK`

```json
{
  "seedId": "seed_abc",
  "seed": "revealed-server-seed-value",
  "hash": "a1b2c3d4e5f6...",
  "active": false
}
```

**Błędy:**

- `401 Unauthorized` - Nieprawidłowy klucz admina
- `400 Bad Request` - Brak seedId
- `403 Forbidden` - Seed nadal aktywny
- `404 Not Found` - Seed nie istnieje

---

## Kody błędów

### HTTP Status Codes

- `200 OK` - Sukces
- `201 Created` - Zasób utworzony
- `400 Bad Request` - Nieprawidłowe dane
- `401 Unauthorized` - Brak lub nieprawidłowa autentykacja
- `403 Forbidden` - Brak uprawnień
- `404 Not Found` - Zasób nie znaleziony
- `409 Conflict` - Konflikt (np. duplikat)
- `500 Internal Server Error` - Błąd serwera

### Przykładowa odpowiedź błędu

```json
{
  "error": "invalid_credentials",
  "message": "Email or password is incorrect"
}
```

---

## Rate Limiting

**Uwaga:** Rate limiting nie jest obecnie zaimplementowane, ale zalecane dla produkcji:

- Autentykacja: 5 req/min
- API endpoints: 100 req/min
- Casino spins: 10 req/min

---

## CORS

Dozwolone origins (development):

- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `http://0.0.0.0:3000`

Dla produkcji zaktualizuj w `src/index.ts`.
