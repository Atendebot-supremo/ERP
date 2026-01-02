ALTER TABLE `expense_history` ADD `type` enum('cost','expense') DEFAULT 'expense' NOT NULL;--> statement-breakpoint
ALTER TABLE `expenses` ADD `type` enum('cost','expense') DEFAULT 'expense' NOT NULL;