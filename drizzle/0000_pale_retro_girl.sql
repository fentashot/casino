CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "casino_bet" (
	"id" text PRIMARY KEY NOT NULL,
	"spin_id" text NOT NULL,
	"type" text NOT NULL,
	"numbers" text NOT NULL,
	"amount" numeric NOT NULL,
	"color" text,
	"choice" text,
	"win" numeric NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "casino_server_seed" (
	"id" text PRIMARY KEY NOT NULL,
	"seed" text NOT NULL,
	"hash" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revealed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "casino_spin" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"client_seed" text NOT NULL,
	"nonce" integer NOT NULL,
	"hmac" text NOT NULL,
	"server_seed_id" text NOT NULL,
	"number" integer NOT NULL,
	"color" text NOT NULL,
	"total_bet" numeric NOT NULL,
	"total_win" numeric NOT NULL,
	"idempotency_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "casino_spin_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "expense_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"amount" numeric NOT NULL,
	"date" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_balance" (
	"user_id" text PRIMARY KEY NOT NULL,
	"last_nonce" integer DEFAULT 0 NOT NULL,
	"balance" numeric DEFAULT '0' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "casino_bet" ADD CONSTRAINT "casino_bet_spin_id_casino_spin_id_fk" FOREIGN KEY ("spin_id") REFERENCES "public"."casino_spin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "casino_spin" ADD CONSTRAINT "casino_spin_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "casino_spin" ADD CONSTRAINT "casino_spin_server_seed_id_casino_server_seed_id_fk" FOREIGN KEY ("server_seed_id") REFERENCES "public"."casino_server_seed"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_balance" ADD CONSTRAINT "user_balance_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bet_spin_id_idx" ON "casino_bet" USING btree ("spin_id");--> statement-breakpoint
CREATE INDEX "spin_user_id_idx" ON "casino_spin" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "spin_idempotency_key_idx" ON "casino_spin" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "expense_user_id_idx" ON "expense_table" USING btree ("user_id");