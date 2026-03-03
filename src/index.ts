import { Hono } from "hono";
import { logger } from "hono/logger";
import { serveStatic } from "hono/bun";
import { auth, useAuthMiddleware, type AuthUser } from "./auth";
import { expensesRoutes } from "./routes/expenses";
import { casinoRoutes } from "./routes/casino";
import { blackjackRoutes } from "./routes/blackjack";
import { statsRoutes } from "./routes/stats";
import {
  securityHeaders,
  authCors,
  apiLimiter,
  authLimiter,
  spinLimiter,
  blackjackLimiter,
} from "./middleware";

interface Vars {
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session | null;
  };
}

const app = new Hono<Vars>();

/* ============================================================================
   Global Middleware
   ============================================================================ */

app.use("*", securityHeaders);
app.use("*", logger());

/* ============================================================================
   Rate Limiting
   ============================================================================ */

app.use("/api/*", apiLimiter);
app.use("/api/auth/*", authLimiter);
app.use("/api/casino/spin", spinLimiter);
app.use("/api/blackjack/*", blackjackLimiter);

/* ============================================================================
   CORS & Auth
   ============================================================================ */

app.use("/api/auth/*", authCors);

app.use("/api/expenses/*", useAuthMiddleware);
app.use("/api/casino/*", useAuthMiddleware);
app.use("/api/blackjack/*", useAuthMiddleware);
app.use("/api/stats/*", useAuthMiddleware);
app.use("/api/me", useAuthMiddleware);

// Get current user info with role
app.get("/api/me", (c) => {
  const user = c.get("user") as AuthUser;
  return c.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});

const apiRoutes = app
  .basePath("/api")
  .route("/expenses", expensesRoutes)
  .route("/casino", casinoRoutes)
  .route("/blackjack", blackjackRoutes)
  .route("/stats", statsRoutes);

app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

app.get(
  "*",
  serveStatic({
    root: "./client/dist",
    onNotFound(path, c) {
      c.text("Not Found", 404);
    },
  }),
);

app.get("*", serveStatic({ path: "./client/dist/index.html" }));

const port = Number(process.env.PORT) || 2137;

export default {
  port,
  fetch: app.fetch,
};
export type ApiRoutes = typeof apiRoutes;
