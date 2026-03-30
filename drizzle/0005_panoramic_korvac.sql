ALTER TABLE "blackjack_round" ADD COLUMN "game_id" text;--> statement-breakpoint
ALTER TABLE "plinko_round" ADD COLUMN "seed" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "plinko_round" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "blackjack_round" ADD CONSTRAINT "blackjack_round_game_id_unique" UNIQUE("game_id");--> statement-breakpoint
ALTER TABLE "plinko_round" ADD CONSTRAINT "plinko_round_idempotency_key_unique" UNIQUE("idempotency_key");