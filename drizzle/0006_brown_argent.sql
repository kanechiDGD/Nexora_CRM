CREATE TABLE `organizationMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('ADMIN','CO_ADMIN','VENDEDOR') NOT NULL DEFAULT 'VENDEDOR',
	`username` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `organizationMembers_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizationMembers_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`logo` text,
	`businessType` varchar(100),
	`maxMembers` int NOT NULL DEFAULT 20,
	`ownerId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `activityLogs` ADD `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `constructionProjects` ADD `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `organizationId` int NOT NULL;