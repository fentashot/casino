# Expense Tracker - Docker & Deployment Documentation

## 📦 Docker Setup

Ten projekt używa wieloetapowego (multi-stage) Dockerfile do buildowania React client (Vite) i Hono server w jednym monorepo.

### Architektura

```
┌─────────────────────────────────────┐
│  Builder Stage (oven/bun:latest)   │
│  • Instaluje zależności root       │
│  • Builduje React client (Vite)    │
│  • Kopiuje źródła serwera          │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Runtime Stage (oven/bun:latest)   │
│  • Kopiuje zbudowany client        │
│  • Kopiuje źródła serwera          │
│  • Kopiuje node_modules            │
│  • Kopiuje certyfikaty SSL         │
│  • Uruchamia Bun runtime           │
└─────────────────────────────────────┘
```

## 🚀 Szybki Start

### Podstawowe użycie

```bash
# Zbuduj obraz Docker
bun run d:build

# Uruchom kontener (port 3000)
bun run d:run

# Rebuild + uruchom w jednej komendzie
bun run d:dev

# Uruchom z dostępem publicznym (0.0.0.0)
bun run d:runp
```

### Dostępne skrypty

| Komenda            | Opis                                                |
| ------------------ | --------------------------------------------------- |
| `bun run d:build`  | Buduje obraz Docker                                 |
| `bun run d:run`    | Uruchamia kontener na localhost:3000                |
| `bun run d:runp`   | Uruchamia kontener na 0.0.0.0:3000 (dostęp z sieci) |
| `bun run d:dev`    | Rebuild + run w jednej komendzie                    |
| `bun run cert:gen` | Generuje self-signed SSL certyfikaty                |

## 🔐 SSL/HTTPS Setup

Projekt obsługuje SSL przez self-signed certyfikaty dla bezpiecznego połączenia HTTPS.

### Generowanie certyfikatów

```bash
# Wygeneruj certyfikaty (jednorazowo)
bun run cert:gen
```

To utworzy:

- `certs/cert.pem` - Certyfikat publiczny
- `certs/key.pem` - Klucz prywatny (RSA 4096-bit)

### Włączanie SSL

**W pliku `.env`:**

```env
PORT=3000
USE_SSL=true
BETTER_AUTH_URL=https://localhost:3000
```

**Dostęp do aplikacji:**

- Z SSL: `https://localhost:3000`
- Bez SSL: `http://localhost:3000` (gdy `USE_SSL=false`)

### Obsługa ostrzeżenia "Not Secure"

Self-signed certyfikaty powodują ostrzeżenie w przeglądarce - to **normalne**.

#### Opcja 1: Zaakceptuj ostrzeżenie

1. Wejdź na `https://localhost:3000`
2. Kliknij "Advanced" → "Proceed to localhost (unsafe)"
3. Aplikacja działa bezpiecznie pomimo ostrzeżenia

#### Opcja 2: Dodaj certyfikat do zaufanych (Chrome/Edge)

1. Otwórz `chrome://settings/security`
2. Kliknij "Manage certificates" → "Authorities"
3. Kliknij "Import" i wybierz `certs/cert.pem`
4. Zaznacz "Trust this certificate for identifying websites"
5. Restart przeglądarki

#### Opcja 3: Dodaj certyfikat do zaufanych (Firefox)

1. Otwórz `about:preferences#privacy`
2. Scroll do "Certificates" → "View Certificates"
3. Zakładka "Authorities" → "Import"
4. Wybierz `certs/cert.pem`
5. Zaznacz "Trust this CA to identify websites"

## 🌐 Dostęp z sieci lokalnej

### Konfiguracja

**Krok 1: Znajdź swój lokalny IP**

```bash
# Linux
hostname -I

# macOS
ipconfig getifaddr en0

# Przykładowy output: 192.168.1.100
```

**Krok 2: Uruchom z publicznym dostępem**

```bash
bun run d:runp
```

**Krok 3: Zaktualizuj CORS**

W `src/index.ts` dodaj swój IP do allowed origins:

```typescript
cors({
  origin: [
    "http://localhost:3000",
    "https://localhost:3000",
    "http://192.168.1.100:3000", // Twój lokalny IP
    "https://192.168.1.100:3000", // Twój lokalny IP z SSL
  ],
  // ...
});
```

**Dostęp z innych urządzeń:**

- HTTP: `http://192.168.1.100:3000`
- HTTPS: `https://192.168.1.100:3000`

## 📁 Struktura plików

```
expense-tracker/
├── Dockerfile              # Konfiguracja obrazu Docker
├── .dockerignore          # Pliki ignorowane przy buildzie
├── docker-compose.yml     # (Opcjonalny) Orchestration
├── certs/                 # Certyfikaty SSL
│   ├── cert.pem          # Certyfikat publiczny
│   └── key.pem           # Klucz prywatny
├── src/                   # Kod serwera (Hono)
│   └── index.ts          # Entry point z konfiguracją SSL
├── client/               # Kod klienta (React + Vite)
│   ├── src/
│   └── dist/             # Zbudowane pliki (generowane)
└── .env                  # Zmienne środowiskowe
```

## ⚙️ Zmienne środowiskowe

### Wymagane zmienne

```env
# Baza danych (Turso)
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token

# GitHub OAuth
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret

# Better Auth
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=https://localhost:3000

# Admin
ADMIN_KEY=your-admin-key

# Server
PORT=3000
USE_SSL=true
```

### Przekazywanie zmiennych do Docker

```bash
# Przez plik .env (ZALECANE)
docker run --rm -p 3000:3000 --env-file .env expense-tracker

# Bezpośrednio przez -e
docker run --rm -p 3000:3000 \
  -e PORT=3000 \
  -e USE_SSL=true \
  expense-tracker
```

**⚠️ WAŻNE:** **NIGDY** nie commituj pliku `.env` do repozytorium Git!

## 🐛 Troubleshooting

### Problem: "Not Found" na localhost:3000

**Rozwiązanie:** Upewnij się że `serveStatic` jest poprawnie skonfigurowany w `src/index.ts`:

```typescript
// Serve static files
app.use("*", serveStatic({ root: "./client/dist" }));

// SPA fallback
app.get("*", serveStatic({ path: "./client/dist/index.html" }));
```

### Problem: SSL nie działa

**Sprawdź:**

```bash
# 1. Czy certyfikaty istnieją lokalnie?
ls -la certs/

# 2. Czy certyfikaty są w kontenerze?
docker exec $(docker ps -q --filter ancestor=expense-tracker) ls -la /app/certs/

# 3. Czy USE_SSL=true w .env?
grep USE_SSL .env

# 4. Sprawdź logi kontenera
docker logs $(docker ps -q --filter ancestor=expense-tracker) | head -5
# Powinno pokazać: "Started server: https://0.0.0.0:3000"
```

### Problem: CORS errors

**Rozwiązanie:** Dodaj origin do CORS w `src/index.ts`:

```typescript
cors({
  origin: [
    "http://localhost:3000",
    "https://localhost:3000",
    // Dodaj swoje domeny/IP
  ],
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["POST", "GET", "OPTIONS"],
  credentials: true,
});
```

### Problem: Kontener nie startuje

```bash
# Sprawdź logi błędów
docker logs <container_id>

# Sprawdź czy port 3000 jest zajęty
sudo lsof -i :3000

# Wyczyść zatrzymane kontenery
docker container prune

# Przebuduj obraz od zera (bez cache)
docker build --no-cache -t expense-tracker .
```

## 📊 Monitoring

### Sprawdzanie działających kontenerów

```bash
# Lista wszystkich kontenerów
docker ps -a

# Tylko expense-tracker
docker ps --filter ancestor=expense-tracker

# Logi live
docker logs -f $(docker ps -q --filter ancestor=expense-tracker)
```

### Zatrzymywanie kontenerów

```bash
# Zatrzymaj kontener
docker stop <container_id>

# Zatrzymaj i usuń
docker rm -f <container_id>

# Zatrzymaj wszystkie kontenery expense-tracker
docker ps -q --filter ancestor=expense-tracker | xargs docker stop
```

## 🚢 Deployment

### Produkcja

Dla produkcji **NIE używaj** self-signed certyfikatów. Użyj:

1. **Let's Encrypt** (darmowy SSL od zaufanego CA)
2. **Cloudflare** (darmowy SSL + CDN)
3. **AWS Certificate Manager / Azure / GCP**

### Cloudflare Tunnel (zalecane dla łatwego deploymentu)

```bash
# Zainstaluj cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# Uruchom tunel
cloudflared tunnel --url http://localhost:3000

# Dostaniesz publiczny HTTPS URL z prawdziwym SSL:
# https://random-words-123.trycloudflare.com
```

## 📝 Best Practices

✅ **DO:**

- Używaj `--env-file .env` do przekazywania secrets
- Dodaj `.env` do `.gitignore`
- Regularnie aktualizuj certyfikaty (ważne 365 dni)
- Używaj `--rm` flag dla kontenerów dev/testowych
- Testuj build lokalnie przed deploymentem

❌ **DON'T:**

- Nie commituj `.env` do Git
- Nie kopiuj `.env` do obrazu Docker
- Nie używaj self-signed cert w produkcji
- Nie expose portów niepotrzebnie (tylko 3000)
- Nie używaj `latest` tagu w produkcji

## 🔗 Przydatne linki

- [Bun Documentation](https://bun.sh)
- [Hono Framework](https://hono.dev)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Let's Encrypt](https://letsencrypt.org)
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)

## 📄 Licencja

[Dodaj swoją licencję tutaj]

---

**Pytania?** Otwórz issue na GitHub lub skontaktuj się z zespołem dev.
