ALTER TABLE `settings` ADD `in_stock_min_qty` integer DEFAULT 51 NOT NULL;--> statement-breakpoint
ALTER TABLE `products` DROP COLUMN `wholesale_rate`;