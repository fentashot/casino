import { Hono } from "hono";
import { logger } from "hono/logger";
import { serveStatic } from "hono/bun";
import { auth, useAuthMiddleware, type AuthUser } from "./auth";
import { expensesRouter } from "./games/expenses/router";
import { rouletteRouter } from "./games/roulette/router";
import { blackjackRouter } from "./games/blackjack/router";
import { plinkoRouter } from "./games/plinko/router";
import { statsRouter } from "./games/stats/router";
import {
  securityHeaders,
  apiCors,
  apiLimiter,
  authLimiter,
  spinLimiter,
  blackjackLimiter,
} from "./middleware";
import { AppError, ErrorCode } from "./lib/errors";

interface Vars {
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session | null;
  };
}

const app = new Hono<Vars>();

/* ============================================================================
   Global Error Handler
   ============================================================================ */

app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json(err.toJSON(), err.statusCode as any);
  }
  console.error("[unhandled]", err);
  return c.json({ error: ErrorCode.INTERNAL_ERROR }, 500);
});

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

app.use("/api/*", apiCors);

app.use("/api/expenses/*", useAuthMiddleware);
app.use("/api/casino/*", useAuthMiddleware);
app.use("/api/blackjack/*", useAuthMiddleware);
app.use("/api/plinko/*", useAuthMiddleware);
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
  .route("/expenses", expensesRouter)
  .route("/casino", rouletteRouter)
  .route("/blackjack", blackjackRouter)
  .route("/plinko", plinkoRouter)
  .route("/stats", statsRouter);

app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

app.get(
  "*",
  serveStatic({
    root: "./client/dist",
    onNotFound(_, c) {
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
