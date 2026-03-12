CREATE TABLE `workflowTaskTemplates` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `organizationId` INT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT,
  `departmentId` INT NULL,
  `departmentName` VARCHAR(100),
  `isActive` INT NOT NULL DEFAULT 1,
  `createdBy` INT NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE `workflowTaskTemplateAssignees` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `templateId` INT NOT NULL,
  `userId` INT NOT NULL,
  `organizationId` INT NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);
