import { Hono } from "hono";
import { logger } from "hono/logger";
import { expensesRoutes } from "./routes/expenses";
import { serveStatic } from "hono/bun";
import { auth, useAuthMiddleware } from "./auth";
import { cors } from "hono/cors";
import { casinoRoutes } from "./routes/casino";

interface Vars {
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session | null;
  };
}

const app = new Hono<Vars>();

app.use("*", logger());

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
