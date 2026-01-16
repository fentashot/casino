import {
    pgTable,
    text,
    integer,
    numeric,
    boolean,
    timestamp,
    index,
    serial,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============ Expenses ============
export const expenseTable = pgTable(
    "expense_table",
    {
        id: serial("id").primaryKey(),
        userId: text("user_id").notNull(),
        title: text("title").notNull(),
        amount: numeric("amount").notNull(),
        date: text("date").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [index("expense_user_id_idx").on(table.userId)]
);

// ============ Auth (Better-Auth) ============
export const userRoleEnum = ["user", "admin"] as const;
export type UserRole = typeof userRoleEnum[number];

export const user = pgTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    role: text("role").$type<UserRole>().default("user").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const session = pgTable("session", {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const verification = pgTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});

// ============ Casino ============
export const casinoServerSeed = pgTable("casino_server_seed", {
    id: text("id").primaryKey(),
    seed: text("seed").notNull(),
    hash: text("hash").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    revealedAt: timestamp("revealed_at"),
});

export const casinoSpin = pgTable(
    "casino_spin",
    {
        id: text("id").primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        clientSeed: text("client_seed").notNull(),
        nonce: integer("nonce").notNull(),
        hmac: text("hmac").notNull(),
        serverSeedId: text("server_seed_id")
            .notNull()
            .references(() => casinoServerSeed.id),
        number: integer("number").notNull(),
        color: text("color").notNull(),
        totalBet: numeric("total_bet").notNull(),
        totalWin: numeric("total_win").notNull(),
        idempotencyKey: text("idempotency_key").unique(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        index("spin_user_id_idx").on(table.userId),
        index("spin_idempotency_key_idx").on(table.idempotencyKey),
    ]
);

export const casinoBet = pgTable(
    "casino_bet",
    {
        id: text("id").primaryKey(),
        spinId: text("spin_id")
            .notNull()
            .references(() => casinoSpin.id, { onDelete: "cascade" }),
        type: text("type").notNull(),
        numbers: text("numbers").notNull(),
        amount: numeric("amount").notNull(),
        color: text("color"),
        choice: text("choice"),
        win: numeric("win").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [index("bet_spin_id_idx").on(table.spinId)]
);

export const userBalance = pgTable("user_balance", {
    userId: text("user_id")
        .primaryKey()
        .references(() => user.id, { onDelete: "cascade" }),
    lastNonce: integer("last_nonce").notNull().default(0),
    balance: numeric("balance").notNull().default("0"),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});

// ============ Relations ============
export const userRelations = relations(user, ({ many, one }) => ({
    sessions: many(session),
    accounts: many(account),
    expenses: many(expenseTable),
    spins: many(casinoSpin),
    balance: one(userBalance, {
        fields: [user.id],
        references: [userBalance.userId],
    }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
    user: one(user, {
        fields: [session.userId],
        references: [user.id],
    }),
}));

export const casinoSpinRelations = relations(casinoSpin, ({ one, many }) => ({
    user: one(user, {
        fields: [casinoSpin.userId],
        references: [user.id],
    }),
    serverSeed: one(casinoServerSeed, {
        fields: [casinoSpin.serverSeedId],
        references: [casinoServerSeed.id],
    }),
    bets: many(casinoBet),
}));

export const casinoBetRelations = relations(casinoBet, ({ one }) => ({
    spin: one(casinoSpin, {
        fields: [casinoBet.spinId],
        references: [casinoSpin.id],
    }),
}));

export const userBalanceRelations = relations(userBalance, ({ one }) => ({
    user: one(user, {
        fields: [userBalance.userId],
        references: [user.id],
    }),
}));
