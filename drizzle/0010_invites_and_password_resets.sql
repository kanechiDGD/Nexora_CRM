CREATE TABLE `organizationInvites` (
  `id` int AUTO_INCREMENT NOT NULL,
  `organizationId` int NOT NULL,
  `email` varchar(320) NOT NULL,
  `role` enum('ADMIN','CO_ADMIN','VENDEDOR') NOT NULL DEFAULT 'VENDEDOR',
  `tokenHash` varchar(64) NOT NULL,
  `invitedBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `expiresAt` timestamp NOT NULL,
  `acceptedAt` timestamp NULL,
  `revokedAt` timestamp NULL,
  CONSTRAINT `organizationInvites_id` PRIMARY KEY(`id`),
  CONSTRAINT `organizationInvites_tokenHash_unique` UNIQUE(`tokenHash`)
);

CREATE TABLE `passwordResetTokens` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `tokenHash` varchar(64) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `expiresAt` timestamp NOT NULL,
  `usedAt` timestamp NULL,
  CONSTRAINT `passwordResetTokens_id` PRIMARY KEY(`id`),
  CONSTRAINT `passwordResetTokens_tokenHash_unique` UNIQUE(`tokenHash`)
);
