-- Migración para cambiar IDs de clientes de int a varchar
-- ADVERTENCIA: Esta migración eliminará todos los datos existentes de clientes
-- Asegúrate de hacer un backup antes de ejecutar

-- Paso 1: Eliminar foreign keys
ALTER TABLE `activityLogs` DROP FOREIGN KEY `activityLogs_clientId_clients_id_fk`;
ALTER TABLE `constructionProjects` DROP FOREIGN KEY `constructionProjects_clientId_clients_id_fk`;
ALTER TABLE `documents` DROP FOREIGN KEY `documents_clientId_clients_id_fk`;

-- Paso 2: Eliminar todos los datos de las tablas relacionadas
TRUNCATE TABLE `activityLogs`;
TRUNCATE TABLE `constructionProjects`;
TRUNCATE TABLE `documents`;
TRUNCATE TABLE `events`;
TRUNCATE TABLE `tasks`;

-- Paso 3: Eliminar todos los clientes existentes
TRUNCATE TABLE `clients`;

-- Paso 4: Modificar el tipo de columna id en clients
ALTER TABLE `clients` MODIFY COLUMN `id` varchar(50) NOT NULL;

-- Paso 5: Modificar las columnas clientId en las tablas relacionadas
ALTER TABLE `activityLogs` MODIFY COLUMN `clientId` varchar(50);
ALTER TABLE `constructionProjects` MODIFY COLUMN `clientId` varchar(50);
ALTER TABLE `documents` MODIFY COLUMN `clientId` varchar(50);
ALTER TABLE `events` MODIFY COLUMN `clientId` varchar(50);
ALTER TABLE `tasks` MODIFY COLUMN `clientId` varchar(50);

-- Paso 6: Recrear foreign keys
ALTER TABLE `activityLogs` ADD CONSTRAINT `activityLogs_clientId_clients_id_fk` 
  FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE;

ALTER TABLE `constructionProjects` ADD CONSTRAINT `constructionProjects_clientId_clients_id_fk` 
  FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE SET NULL;

ALTER TABLE `documents` ADD CONSTRAINT `documents_clientId_clients_id_fk` 
  FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE;
