CREATE TABLE "blackjack_round" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"total_bet" numeric NOT NULL,
	"total_win" numeric NOT NULL,
	"hands_snapshot" jsonb NOT NULL,
	"balance_after" numeric NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blackjack_round" ADD CONSTRAINT "blackjack_round_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "bj_round_user_id_idx" ON "blackjack_round" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "bj_round_created_at_idx" ON "blackjack_round" USING btree ("created_at");
