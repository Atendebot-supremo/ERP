CREATE TABLE `expense_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`expenseId` int,
	`description` text NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`category` enum('infrastructure','team','marketing','software','office','other') NOT NULL,
	`month` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expense_history_id` PRIMARY KEY(`id`)
);
