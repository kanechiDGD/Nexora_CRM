CREATE TABLE `scheduledTasks` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `organizationId` INT NOT NULL,
  `clientId` VARCHAR(50),
  `taskType` VARCHAR(80) NOT NULL,
  `runAt` TIMESTAMP NOT NULL,
  `status` ENUM('PENDING','COMPLETED') NOT NULL DEFAULT 'PENDING',
  `payload` TEXT,
  `dedupeKey` VARCHAR(120),
  `createdBy` INT NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completedAt` TIMESTAMP NULL,
  PRIMARY KEY (`id`)
);

