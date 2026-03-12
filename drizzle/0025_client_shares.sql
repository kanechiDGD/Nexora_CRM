CREATE TABLE `clientShares` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `clientId` VARCHAR(50) NOT NULL,
  `organizationId` INT NOT NULL,
  `shareToken` VARCHAR(100) NOT NULL UNIQUE,
  `createdBy` INT NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `clientShares_clientId_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE,
  CONSTRAINT `clientShares_createdBy_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`)
);
