CREATE TABLE `activityLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`activityType` enum('LLAMADA','CORREO','VISITA','NOTA','DOCUMENTO','CAMBIO_ESTADO') NOT NULL,
	`subject` varchar(200),
	`description` text,
	`outcome` text,
	`contactMethod` varchar(50),
	`duration` int,
	`performedBy` int NOT NULL,
	`performedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activityLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` enum('CLIENT','ACTIVITY_LOG','CONSTRUCTION_PROJECT','DOCUMENT','USER') NOT NULL,
	`entityId` int NOT NULL,
	`action` enum('CREATE','UPDATE','DELETE') NOT NULL,
	`fieldName` varchar(100),
	`oldValue` text,
	`newValue` text,
	`performedBy` int NOT NULL,
	`performedAt` timestamp NOT NULL DEFAULT (now()),
	`ipAddress` varchar(45),
	`userAgent` text,
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`alternatePhone` varchar(20),
	`propertyAddress` text,
	`city` varchar(100),
	`state` varchar(50),
	`zipCode` varchar(10),
	`propertyType` varchar(50),
	`insuranceCompany` varchar(200),
	`policyNumber` varchar(100),
	`claimNumber` varchar(100),
	`deductible` int,
	`coverageAmount` int,
	`claimStatus` enum('NO_SOMETIDA','EN_PROCESO','APROVADA','RECHAZADA','CERRADA') DEFAULT 'NO_SOMETIDA',
	`suplementado` enum('si','no') DEFAULT 'no',
	`primerCheque` enum('OBTENIDO','PENDIENTE') DEFAULT 'PENDIENTE',
	`dateOfLoss` timestamp,
	`claimSubmittedDate` timestamp,
	`scheduledVisit` timestamp,
	`adjustmentDate` timestamp,
	`lastContactDate` timestamp,
	`nextContactDate` timestamp,
	`salesPerson` varchar(100),
	`assignedAdjuster` varchar(100),
	`policyDocumentUrl` text,
	`contractDocumentUrl` text,
	`photosUrl` text,
	`driveFolderId` varchar(200),
	`damageType` text,
	`damageDescription` text,
	`estimatedLoss` int,
	`actualPayout` int,
	`notes` text,
	`internalNotes` text,
	`constructionStatus` varchar(50),
	`createdBy` int,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `constructionProjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int,
	`projectName` varchar(200) NOT NULL,
	`propertyAddress` text,
	`roofType` varchar(100),
	`roofColor` varchar(50),
	`roofSQ` int,
	`sidingType` varchar(100),
	`sidingColor` varchar(50),
	`sidingSQ` int,
	`permitNumber` varchar(100),
	`permitStatus` enum('PENDIENTE','APROBADO','RECHAZADO','NO_REQUERIDO') DEFAULT 'PENDIENTE',
	`permitDate` timestamp,
	`startDate` timestamp,
	`estimatedCompletionDate` timestamp,
	`actualCompletionDate` timestamp,
	`projectStatus` enum('PLANIFICACION','EN_PROGRESO','PAUSADO','COMPLETADO','CANCELADO') DEFAULT 'PLANIFICACION',
	`estimatedCost` int,
	`actualCost` int,
	`contractor` varchar(200),
	`projectManager` varchar(100),
	`notes` text,
	`specialRequirements` text,
	`createdBy` int,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `constructionProjects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int,
	`constructionProjectId` int,
	`documentType` enum('POLIZA','CONTRATO','FOTO','ESTIMADO','FACTURA','PERMISO','OTRO') NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(500),
	`mimeType` varchar(100),
	`fileSize` int,
	`description` text,
	`tags` text,
	`driveFileId` varchar(200),
	`uploadedBy` int NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `activityLogs` ADD CONSTRAINT `activityLogs_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activityLogs` ADD CONSTRAINT `activityLogs_performedBy_users_id_fk` FOREIGN KEY (`performedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `auditLogs` ADD CONSTRAINT `auditLogs_performedBy_users_id_fk` FOREIGN KEY (`performedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clients` ADD CONSTRAINT `clients_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clients` ADD CONSTRAINT `clients_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `constructionProjects` ADD CONSTRAINT `constructionProjects_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `constructionProjects` ADD CONSTRAINT `constructionProjects_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `constructionProjects` ADD CONSTRAINT `constructionProjects_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_constructionProjectId_constructionProjects_id_fk` FOREIGN KEY (`constructionProjectId`) REFERENCES `constructionProjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;