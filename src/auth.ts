import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/postgres";
import { createMiddleware } from "hono/factory";
import { user as userTable, type UserRole } from "./db/schema";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
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
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
    },
});

import { eq } from "drizzle-orm";

// Typ użytkownika z rolą (z bazy danych)
export interface AuthUser {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
}

// Helper do pobrania roli użytkownika z bazy
async function getUserRole(userId: string): Promise<UserRole> {
    const result = await db.select({ role: userTable.role })
        .from(userTable)
        .where(eq(userTable.id, userId))
        .limit(1);
    return result[0]?.role ?? "user";
}

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

        // Pobierz rolę z bazy danych (better-auth nie przechowuje custom fields)
        const role = await getUserRole(session.user.id);

        c.set("user", { ...session.user, role } as AuthUser);
        c.set("session", session);

        return next();
    } catch (error) {
        return c.json({ message: "Authentication error: " + error }, 500);
    }
});

// Middleware wymagający roli administratora
export const requireAdminMiddleware = createMiddleware(async (c, next) => {
    const user = c.get("user") as AuthUser | null;

    if (!user) {
        return c.json({ message: "Not authenticated" }, 401);
    }

    if (user.role !== "admin") {
        return c.json({ message: "Forbidden: Admin access required" }, 403);
    }

    return next();
});
