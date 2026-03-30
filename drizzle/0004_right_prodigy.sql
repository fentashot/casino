CREATE TABLE "blackjack_active_game" (
	"user_id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"state" jsonb NOT NULL,
	"persisted" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blackjack_active_game_game_id_unique" UNIQUE("game_id")
);
--> statement-breakpoint
ALTER TABLE "blackjack_active_game" ADD CONSTRAINT "blackjack_active_game_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;