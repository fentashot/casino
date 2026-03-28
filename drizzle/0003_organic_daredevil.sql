CREATE TABLE "plinko_round" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"bet" numeric NOT NULL,
	"total_win" numeric NOT NULL,
	"rows" integer NOT NULL,
	"difficulty" text NOT NULL,
	"final_bucket" integer NOT NULL,
	"multiplier" numeric NOT NULL,
	"balance_after" numeric NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plinko_round" ADD CONSTRAINT "plinko_round_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plinko_round_user_id_idx" ON "plinko_round" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "plinko_round_created_at_idx" ON "plinko_round" USING btree ("created_at");