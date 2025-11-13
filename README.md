# Expense Tracker

An expense management application with a built-in casino system (roulette). The project uses a monorepo architecture with a Hono/Bun backend and React/Vite frontend.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Requirements](#-requirements)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the Application](#-running-the-application)
- [Project Structure](#-project-structure)
- [API Endpoints](#-api-endpoints)
- [Database](#-database)
- [Additional Documentation](#-additional-documentation)

## ✨ Features

### Expense Management

- ✅ Create, view, and delete expenses
- ✅ Track total expense amount
- ✅ Associate expenses with users
- ✅ Expense history with dates

### Casino System (Roulette)

- ✅ Roulette game with provably fair system
- ✅ Multiple bet types (color, number, even/odd)
- ✅ User balance system
- ✅ Game fairness verification (HMAC)
- ✅ Spin and bet history

### Authentication

- ✅ Registration and login (email/password)
- ✅ OAuth with GitHub
- ✅ User sessions
- ✅ Protected API routes

## 🛠 Tech Stack

### Backend

- **Runtime**: [Bun](https://bun.sh/) - Fast JavaScript runtime
- **Framework**: [Hono](https://hono.dev/) - Lightweight web framework
- **Database**: [Turso](https://turso.tech/) (LibSQL/SQLite)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: [Better Auth](https://www.better-auth.com/)
- **Validation**: Zod

### Frontend

- **Framework**: React 18
- **Build Tool**: Vite
- **Router**: TanStack Router
- **Data Fetching**: TanStack Query
- **Forms**: TanStack Form
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **Animations**: Framer Motion

### DevOps

- **Containerization**: Docker
- **SSL/TLS**: Self-signed certificates (development)

## 📦 Requirements

- **Bun** >= 1.0.0 (or Node.js >= 18.0.0)
- **Docker** (optional)
- **Turso CLI** (for database management)

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/fentashot/expense-tracker.git
cd expense-tracker
```

### 2. Install dependencies

```bash
# Root dependencies (backend)
bun install

# Client dependencies (frontend)
cd client
bun install
cd ..
```

## ⚙️ Configuration

### 1. Environment variables

Create a `.env` file in the root directory:

```env
# Database (Turso)
TURSO_DATABASE_URL=libsql://your-database-url.turso.io
TURSO_AUTH_TOKEN=your-auth-token

# Better Auth
BETTER_AUTH_SECRET=your-secret-key-min-32-chars
BETTER_AUTH_URL=http://localhost:2137

# GitHub OAuth (optional)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Admin Key (for casino operations)
ADMIN_KEY=your-admin-key

# Server Configuration
PORT=2137
USE_SSL=false
```

### 2. Turso database configuration

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login to Turso
turso auth login

# Create a new database
turso db create expense-tracker

# Get connection string
turso db show expense-tracker --url

# Create auth token
turso db tokens create expense-tracker
```

### 3. Database migrations

```bash
# Generate migrations
bun run db:gen

# Apply migrations
bun run db:push
```

### 4. SSL certificates (optional)

```bash
# Generate self-signed certificates
bun run cert:gen
```

## 🏃 Running the Application

### Development (local)

```bash
# Terminal 1 - Backend
bun run dev

# Terminal 2 - Frontend
cd client
bun run dev
```

- Backend: http://localhost:2137
- Frontend: http://localhost:3000

### Development (Docker)

```bash
# Build and run
docker compose up --build

# Or use scripts
bun run d:build
bun run d:run
```

### Production

```bash
# Build backend
bun run build

# Build frontend
cd client
bun run build
cd ..

# Start production server
bun run start
```

## 📁 Project Structure

```
expense-tracker/
├── src/                      # Backend (Hono server)
│   ├── index.ts             # Main server file
│   ├── auth.ts              # Better Auth configuration
│   ├── types.ts             # TypeScript types
│   ├── zodTypes.ts          # Zod validation schemas
│   ├── db/
│   │   ├── schema.ts        # Database schema (Drizzle)
│   │   └── turso.ts         # Turso DB configuration
│   ├── routes/
│   │   ├── expenses.ts      # Expense endpoints
│   │   └── casino.ts        # Casino endpoints
│   └── lib/
│       └── casinoHelpers.ts # Casino helper functions
├── client/                   # Frontend (React/Vite)
│   ├── src/
│   │   ├── main.tsx         # Entry point
│   │   ├── auth-context.tsx # Authentication context
│   │   ├── components/      # React components
│   │   ├── routes/          # Route definitions
│   │   └── lib/
│   │       ├── api.ts       # API client (Hono RPC)
│   │       ├── auth-client.ts # Better Auth client
│   │       └── utils.ts     # Utility functions
│   ├── public/              # Static files
│   └── dist/                # Build output
├── drizzle/                  # Database migrations
├── certs/                    # SSL certificates
├── Dockerfile               # Multi-stage Docker build
├── docker-compose.yml       # Docker Compose config
├── drizzle.config.ts        # Drizzle configuration
└── package.json             # Root dependencies

```

## 🔌 API Endpoints

### Authentication

```
POST   /api/auth/sign-up/email          # Sign up
POST   /api/auth/sign-in/email          # Sign in
POST   /api/auth/sign-out               # Sign out
GET    /api/auth/session                # Get session
GET    /api/auth/github                 # GitHub OAuth
```

### Expenses (requires authentication)

```
GET    /api/expenses                    # List user's expenses
POST   /api/expenses                    # Create expense
DELETE /api/expenses/:id                # Delete expense
GET    /api/expenses/total              # Total expenses
```

### Casino (requires authentication)

```
GET    /api/casino/seed                 # Get server seed hash
POST   /api/casino/rotate               # Rotate server seed (admin)
GET    /api/casino/balance              # User balance
POST   /api/casino/spin                 # Execute spin
POST   /api/casino/reveal               # Reveal server seed (admin)
GET    /api/casino/spins                # Spin history
GET    /api/casino/bets                 # Bet history
```

## 🗄 Database

### Table Schema

#### `expense_table`

- `id` - Primary key (auto-increment)
- `userId` - User ID
- `title` - Expense title
- `amount` - Amount (numeric)
- `date` - Expense date
- `createdAt` - Creation date

#### `user`

- `id` - Primary key
- `name` - User name
- `email` - Email (unique)
- `emailVerified` - Email verified status
- `image` - Avatar URL
- `createdAt` - Creation date
- `updatedAt` - Update date

#### `session`

- `id` - Primary key
- `token` - Session token (unique)
- `userId` - Foreign key to user
- `expiresAt` - Expiration date
- `ipAddress` - User IP
- `userAgent` - User agent

#### `casinoServerSeed`

- `id` - Primary key
- `seed` - Server seed
- `hash` - SHA-256 hash of seed
- `active` - Active status
- `createdAt` - Creation date

#### `casinoSpin`

- `id` - Primary key
- `userId` - User ID
- `clientSeed` - Client seed
- `nonce` - Sequential number
- `serverSeedId` - Server seed ID
- `result` - Result (0-36)
- `timestamp` - Spin timestamp

#### `casinoBet`

- `id` - Primary key
- `userId` - User ID
- `spinId` - Spin ID
- `betType` - Bet type
- `choice` - Choice
- `amount` - Bet amount
- `won` - Win status
- `winnings` - Winnings amount

#### `userBalance`

- `userId` - Primary key
- `balance` - Balance (numeric)
- `lastNonce` - Last used nonce

## 📚 Additional Documentation

- [DOCKER.md](./DOCKER.md) - Detailed Docker and deployment documentation
- [API.md](./docs/API.md) - Complete API documentation
- [CASINO.md](./docs/CASINO.md) - Casino system documentation
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Application architecture

## 🧪 Testing

```bash
# Backend tests (TODO)
bun test

# Frontend tests (TODO)
cd client
bun test
```

## 🔧 Available Scripts

### Backend (root)

```bash
bun run dev          # Run dev server with hot reload
bun run build        # Build for production
bun run start        # Run production server
bun run db:gen       # Generate Drizzle migrations
bun run db:push      # Apply migrations to database
bun run cert:gen     # Generate SSL certificates
```

### Frontend (client/)

```bash
bun run dev          # Run Vite dev server
bun run build        # Build for production
bun run preview      # Preview production build
bun run lint         # Run ESLint
```

### Docker

```bash
bun run d:build      # Build Docker image
bun run d:run        # Run container
bun run d:runp       # Run with public access
bun run d:dev        # Build + run in one command
```

## 📝 License

MIT

## 👥 Authors

- [fentashot](https://github.com/fentashot)
