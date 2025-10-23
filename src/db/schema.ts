import {
    sqliteTable,
    text,
    integer,
    numeric,
    index,
} from "drizzle-orm/sqlite-core";

export const expenseTable = sqliteTable(
    "expense_table",
    {
        id: integer().primaryKey({ autoIncrement: true }),
        userId: text().notNull(),
        title: text().notNull(),
        amount: numeric().notNull(),
        date: text().notNull(),
        createdAt: text().notNull(),
    },
    (table) => {
        return [index("userIdIndex").on(table.userId)];
    }
);

export const user = sqliteTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: integer("email_verified", { mode: "boolean" })
        .default(false)
        .notNull(),
    image: text("image"),
    createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
    updatedAt: text("updated_at")
        .default("CURRENT_TIMESTAMP")
        .$onUpdate(() => "CURRENT_TIMESTAMP")
        .notNull(),
});

export const session = sqliteTable("session", {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
    updatedAt: text("updated_at")
        .default("CURRENT_TIMESTAMP")
        .$onUpdate(() => "CURRENT_TIMESTAMP")
        .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
        mode: "timestamp",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
        mode: "timestamp",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
    updatedAt: text("updated_at")
        .default("CURRENT_TIMESTAMP")
        .$onUpdate(() => "CURRENT_TIMESTAMP")
        .notNull(),
});

export const verification = sqliteTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
    updatedAt: text("updated_at")
        .default("CURRENT_TIMESTAMP")
        .$onUpdate(() => "CURRENT_TIMESTAMP")
        .notNull(),
});

export const casinoServerSeed = sqliteTable("casino_server_seed", {
    id: text("id").primaryKey(),
    seed: text("seed").notNull(),
    hash: text("hash").notNull(),
    active: integer("active", { mode: "boolean" }).default(true).notNull(),
    createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
    revealedAt: text("revealed_at"),
});

export const casinoSpin = sqliteTable("casino_spin", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    clientSeed: text("client_seed").notNull(),
    nonce: integer("nonce").notNull(),
    hmac: text("hmac").notNull(),
    serverSeedId: text("server_seed_id").notNull().references(() => casinoServerSeed.id),
    number: integer("number").notNull(),
    color: text("color").notNull(),
    totalBet: numeric("total_bet").notNull(),
    totalWin: numeric("total_win").notNull(),
    createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
}, (table) => {
    return [index("userIdSpinIndex").on(table.userId)];
});

export const casinoBet = sqliteTable("casino_bet", {
    id: text("id").primaryKey(),
    spinId: text("spin_id").notNull().references(() => casinoSpin.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    numbers: text("numbers").notNull(), // JSON array
    amount: numeric("amount").notNull(),
    color: text("color"),
    choice: text("choice"),
    win: numeric("win").notNull(),
    createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
}, (table) => {
    return [index("spinIdIndex").on(table.spinId)];
});

export const userBalance = sqliteTable("user_balance", {
    userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
    lastNonce: integer('last_nonce').notNull().default(0), // dodaj tę linię
    balance: numeric("balance").notNull().default("0"),
    updatedAt: text("updated_at")
        .default("CURRENT_TIMESTAMP")
        .$onUpdate(() => "CURRENT_TIMESTAMP")
        .notNull(),
});
