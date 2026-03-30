CREATE TABLE "blackjack_shoe" (
	"user_id" text PRIMARY KEY NOT NULL,
	"shoe" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blackjack_shoe" ADD CONSTRAINT "blackjack_shoe_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "blackjack_shoe_updated_at_idx" ON "blackjack_shoe" USING btree ("updated_at");
