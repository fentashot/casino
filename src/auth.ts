import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/turso";
import { createMiddleware } from "hono/factory";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "sqlite",
    }),
    trustedOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],
    basePath: "/api/auth",
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        github: {
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        },
        // discord: {
        //     clientId: process.env.DISCORD_CLIENT_ID!,
        //     clientSecret: process.env.DISCORD_CLIENT_SECRET!,
        // },
        // google: {
        //     clientId: process.env.GOOGLE_CLIENT_ID!,
        //     clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        // },
    },
});



export const useAuthMiddleware = createMiddleware(async (c, next) => {
    try {
        const session = await auth.api.getSession({
            headers: c.req.raw.headers,
        });

        if (!session) {
            c.set("user", null);
            c.set("session", null);
            return c.json({ message: "Not authenticated" }, 401);
        }

        c.set("user", session.user);
        c.set("session", session);

        console.log("Authenticated user:", session.user.id);
        return next();
    } catch (error) {
        return c.json({ message: "Authentication error: " + error }, 500);
    }
});
