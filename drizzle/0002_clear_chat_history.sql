CREATE TABLE IF NOT EXISTS `participants` (
	`name` text PRIMARY KEY NOT NULL,
	`joined_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
DELETE FROM `messages`;
