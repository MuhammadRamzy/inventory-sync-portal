CREATE TABLE `products` (
	`item_code` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`mrp` real NOT NULL,
	`wholesale_rate` real NOT NULL,
	`stock_count` integer NOT NULL,
	`stock_status` text NOT NULL,
	`last_updated` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`image_url` text
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`whatsapp_number` text NOT NULL
);
