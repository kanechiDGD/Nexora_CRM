CREATE TABLE `gmailAccounts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `organizationId` int NOT NULL,
  `email` varchar(255) NOT NULL,
  `accessToken` text,
  `refreshToken` text,
  `tokenExpiresAt` timestamp,
  `scope` text,
  `historyId` varchar(128),
  `watchExpiration` timestamp,
  `isActive` int NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `gmailAccounts_id` PRIMARY KEY(`id`)
);

CREATE TABLE `gmailThreads` (
  `id` int AUTO_INCREMENT NOT NULL,
  `threadId` varchar(255) NOT NULL,
  `clientId` varchar(50),
  `organizationId` int NOT NULL,
  `subject` varchar(500),
  `lastMessageAt` timestamp,
  `lastSnippet` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `gmailThreads_id` PRIMARY KEY(`id`)
);

CREATE TABLE `gmailMessages` (
  `id` int AUTO_INCREMENT NOT NULL,
  `messageId` varchar(255) NOT NULL,
  `threadId` int,
  `clientId` varchar(50),
  `organizationId` int NOT NULL,
  `direction` enum('INBOUND','OUTBOUND') NOT NULL,
  `fromEmail` varchar(255),
  `toEmails` text,
  `ccEmails` text,
  `subject` varchar(500),
  `snippet` text,
  `bodyText` text,
  `bodyHtml` text,
  `sentAt` timestamp,
  `gmailLink` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `gmailMessages_id` PRIMARY KEY(`id`)
);

ALTER TABLE `gmailAccounts` ADD CONSTRAINT `gmailAccounts_userId_users_id_fk`
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;

ALTER TABLE `gmailThreads` ADD CONSTRAINT `gmailThreads_clientId_clients_id_fk`
  FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;

ALTER TABLE `gmailMessages` ADD CONSTRAINT `gmailMessages_threadId_gmailThreads_id_fk`
  FOREIGN KEY (`threadId`) REFERENCES `gmailThreads`(`id`) ON DELETE set null ON UPDATE no action;

ALTER TABLE `gmailMessages` ADD CONSTRAINT `gmailMessages_clientId_clients_id_fk`
  FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;
