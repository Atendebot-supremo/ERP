ALTER TABLE `setup_contracts` MODIFY COLUMN `status` enum('active','completed','cancelled','overdue') NOT NULL DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `services` ADD `paymentStatus` enum('pending','paid','overdue') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `services` ADD `isInstallment` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `services` ADD `installmentCount` int;