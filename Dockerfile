FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./
COPY client/package.json ./client/

COPY src ./src
COPY client ./client
COPY tsconfig.json ./tsconfig.json
COPY client/tsconfig.json ./client/tsconfig.json
COPY client/vite.config.ts ./client/vite.config.ts

RUN bun install

WORKDIR /app/client
RUN bun install
RUN bun x tsc && bun x vite build


# Runtime image with Bun (bez buildowania serwera - uruchomimy źródło)
FROM oven/bun:1 AS runtime
WORKDIR /app

# Non-root user for security
RUN addgroup --system --gid 1001 app && adduser --system --uid 1001 --ingroup app app

# Kopiuj źródła zamiast dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json

COPY --from=builder /app/client/dist ./client/dist

USER app
EXPOSE 3000

# Uruchom źródło TypeScript bezpośrednio przez Bun
CMD ["bun", "run", "src/index.ts"]