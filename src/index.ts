import { Hono } from "hono";
import { logger } from "hono/logger";
import { expensesRoutes } from "./routes/expenses";
import { serveStatic } from "hono/bun";
import { auth, useAuthMiddleware } from "./auth";
import { cors } from "hono/cors";

interface Vars {
    Variables: {
        user: typeof auth.$Infer.Session.user | null;
        session: typeof auth.$Infer.Session | null;
    };
}

export const app = new Hono<Vars>();

app.use("*", logger());

app.use(
    "/api/auth/*", // or replace with "*" to enable cors for all routes
    cors({
        origin: ["http://localhost:3000", "http://127.0.0.1:3000"], // allow both origins
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: ["POST", "GET", "OPTIONS"],
        exposeHeaders: ["Content-Length"],
        maxAge: 600,
        credentials: true,
    })
);

app.use("/api/expenses/*", useAuthMiddleware);

const apiRoutes = app.basePath("/api").route("/expenses", expensesRoutes);

app.on(["POST", "GET"], "/api/auth/*", (c) => {
    return auth.handler(c.req.raw);
});

app.get("*", serveStatic({ root: "./client/dist" }));
app.get("*", serveStatic({ path: "./client/dist/index.html" }));

export default {
    port: 2137,
    fetch: app.fetch,
};
export type ApiRoutes = typeof apiRoutes;
