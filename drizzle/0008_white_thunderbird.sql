CREATE TABLE `company_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taxRate` decimal(5,2) NOT NULL DEFAULT '11.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_settings_id` PRIMARY KEY(`id`)
);
