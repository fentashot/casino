FROM oven/bun:latest AS builder

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
FROM oven/bun:latest AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Kopiuj źródła zamiast dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json

COPY --from=builder /app/client/dist ./client/dist

EXPOSE 3000

# Skopiuj certyfikaty SSL (jeśli istnieją)
COPY certs ./certs

# Uruchom źródło TypeScript bezpośrednio przez Bun
CMD ["bun", "run", "src/index.ts"]