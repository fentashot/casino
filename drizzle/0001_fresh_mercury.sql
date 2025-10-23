CREATE TABLE `casino_bet` (
	`id` text PRIMARY KEY NOT NULL,
	`spin_id` text NOT NULL,
	`type` text NOT NULL,
	`numbers` text NOT NULL,
	`amount` numeric NOT NULL,
	`color` text,
	`choice` text,
	`win` numeric NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`spin_id`) REFERENCES `casino_spin`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `spinIdIndex` ON `casino_bet` (`spin_id`);--> statement-breakpoint
CREATE TABLE `casino_server_seed` (
	`id` text PRIMARY KEY NOT NULL,
	`seed` text NOT NULL,
	`hash` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`revealed_at` text
);
--> statement-breakpoint
CREATE TABLE `casino_spin` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`client_seed` text NOT NULL,
	`nonce` integer NOT NULL,
	`hmac` text NOT NULL,
	`server_seed_id` text NOT NULL,
	`number` integer NOT NULL,
	`color` text NOT NULL,
	`total_bet` numeric NOT NULL,
	`total_win` numeric NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`server_seed_id`) REFERENCES `casino_server_seed`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `userIdSpinIndex` ON `casino_spin` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_balance` (
	`user_id` text PRIMARY KEY NOT NULL,
	`balance` numeric DEFAULT '0' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
