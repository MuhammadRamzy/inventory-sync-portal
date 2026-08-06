ALTER TABLE `settings` ADD `low_stock_threshold` integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `catalog_password_hash` text;