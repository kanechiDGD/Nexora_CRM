ALTER TABLE `activityLogs` MODIFY COLUMN `activityType` enum(
  'LLAMADA',
  'CORREO',
  'VISITA',
  'NOTA',
  'DOCUMENTO',
  'CAMBIO_ESTADO',
  'AJUSTACION_REALIZADA',
  'SCOPE_SOLICITADO',
  'SCOPE_RECIBIDO',
  'SCOPE_ENVIADO',
  'RESPUESTA_FAVORABLE',
  'RESPUESTA_NEGATIVA',
  'INICIO_APPRAISAL',
  'CARTA_APPRAISAL_ENVIADA',
  'RELEASE_LETTER_REQUERIDA',
  'ITEL_SOLICITADO',
  'REINSPECCION_SOLICITADA'
) NOT NULL;

CREATE TABLE `workflowRoles` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `isActive` int NOT NULL DEFAULT 1,
  `organizationId` int NOT NULL,
  `createdBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `workflowRoles_id` PRIMARY KEY(`id`)
);

CREATE TABLE `workflowRoleMembers` (
  `id` int AUTO_INCREMENT NOT NULL,
  `roleId` int NOT NULL,
  `userId` int NOT NULL,
  `isPrimary` int NOT NULL DEFAULT 0,
  `organizationId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `workflowRoleMembers_id` PRIMARY KEY(`id`)
);

CREATE TABLE `activityAutomationRules` (
  `id` int AUTO_INCREMENT NOT NULL,
  `activityType` enum(
    'LLAMADA',
    'CORREO',
    'VISITA',
    'NOTA',
    'DOCUMENTO',
    'CAMBIO_ESTADO',
    'AJUSTACION_REALIZADA',
    'SCOPE_SOLICITADO',
    'SCOPE_RECIBIDO',
    'SCOPE_ENVIADO',
    'RESPUESTA_FAVORABLE',
    'RESPUESTA_NEGATIVA',
    'INICIO_APPRAISAL',
    'CARTA_APPRAISAL_ENVIADA',
    'RELEASE_LETTER_REQUERIDA',
    'ITEL_SOLICITADO',
    'REINSPECCION_SOLICITADA'
  ) NOT NULL,
  `taskTitle` varchar(200) NOT NULL,
  `taskDescription` text,
  `roleId` int,
  `category` enum('DOCUMENTACION','SEGUIMIENTO','ESTIMADO','REUNION','REVISION','OTRO') NOT NULL DEFAULT 'OTRO',
  `priority` enum('ALTA','MEDIA','BAJA') NOT NULL DEFAULT 'MEDIA',
  `dueInDays` int,
  `isActive` int NOT NULL DEFAULT 1,
  `organizationId` int NOT NULL,
  `createdBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `activityAutomationRules_id` PRIMARY KEY(`id`)
);

ALTER TABLE `workflowRoles` ADD CONSTRAINT `workflowRoles_createdBy_users_id_fk`
  FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;

ALTER TABLE `workflowRoleMembers` ADD CONSTRAINT `workflowRoleMembers_roleId_workflowRoles_id_fk`
  FOREIGN KEY (`roleId`) REFERENCES `workflowRoles`(`id`) ON DELETE cascade ON UPDATE no action;

ALTER TABLE `workflowRoleMembers` ADD CONSTRAINT `workflowRoleMembers_userId_users_id_fk`
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;

ALTER TABLE `activityAutomationRules` ADD CONSTRAINT `activityAutomationRules_roleId_workflowRoles_id_fk`
  FOREIGN KEY (`roleId`) REFERENCES `workflowRoles`(`id`) ON DELETE set null ON UPDATE no action;

ALTER TABLE `activityAutomationRules` ADD CONSTRAINT `activityAutomationRules_createdBy_users_id_fk`
  FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
