import { Hono } from "hono";
import { logger } from "hono/logger";
import { expensesRoutes } from "./routes/expenses";
import { serveStatic } from "hono/bun";
import { auth, useAuthMiddleware, type AuthUser } from "./auth";
import { cors } from "hono/cors";
import { casinoRoutes } from "./routes/casino";
import { secureHeaders } from "hono/secure-headers";
import { rateLimiter } from "hono-rate-limiter";

interface Vars {
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session | null;
  };
}

const app = new Hono<Vars>();

// Security headers
app.use("*", secureHeaders({
  xFrameOptions: "DENY",
  xContentTypeOptions: "nosniff",
  referrerPolicy: "strict-origin-when-cross-origin",
  crossOriginEmbedderPolicy: false, // Needed for some assets
}));

app.use("*", logger());

// Rate limiting for API endpoints (100 requests per minute per IP)
const apiLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 100,
  standardHeaders: "draft-6",
  keyGenerator: (c) => c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip") || "unknown",
});

// Stricter rate limit for auth endpoints (20 requests per minute)
const authLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-6",
  keyGenerator: (c) => c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip") || "unknown",
});

// Stricter rate limit for casino spin (30 spins per minute)
const spinLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-6",
  keyGenerator: (c) => c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip") || "unknown",
});

app.use("/api/*", apiLimiter);
app.use("/api/auth/*", authLimiter);
app.use("/api/casino/spin", spinLimiter);

app.use(
  "/api/auth/*",
  cors({
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://0.0.0.0:3000",
      process.env.BETTER_AUTH_URL!,
    ],
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  })
);

app.use("/api/expenses/*", useAuthMiddleware);
app.use("/api/casino/*", useAuthMiddleware);
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
  .route("/casino", casinoRoutes);

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
  })
);

app.get("*", serveStatic({ path: "./client/dist/index.html" }));

const port = Number(process.env.PORT) || 2137;

export default {
  port,
  fetch: app.fetch,
};
export type ApiRoutes = typeof apiRoutes;
