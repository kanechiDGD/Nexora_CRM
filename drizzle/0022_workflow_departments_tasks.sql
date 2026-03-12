ALTER TABLE `workflowRoles`
  ADD COLUMN `ownerUserId` INT NULL AFTER `description`;

ALTER TABLE `tasks`
  ADD COLUMN `departmentId` INT NULL AFTER `status`;

CREATE TABLE `taskAssignees` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `taskId` INT NOT NULL,
  `userId` INT NOT NULL,
  `organizationId` INT NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);
