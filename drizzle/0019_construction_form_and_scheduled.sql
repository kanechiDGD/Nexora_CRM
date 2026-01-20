ALTER TABLE `constructionProjects`
  MODIFY `projectStatus` ENUM('PLANIFICACION','EN_PROGRESO','PAUSADO','SCHEDULED','COMPLETADO','CANCELADO') NOT NULL DEFAULT 'PLANIFICACION',
  ADD COLUMN `formStatus` ENUM('DRAFT','READY') NOT NULL DEFAULT 'DRAFT' AFTER `projectStatus`,
  ADD COLUMN `materialsOrdered` INT NOT NULL DEFAULT 0 AFTER `actualCost`,
  ADD COLUMN `crewAssigned` INT NOT NULL DEFAULT 0 AFTER `materialsOrdered`,
  ADD COLUMN `scopeItems` TEXT AFTER `specialRequirements`,
  ADD COLUMN `scopeOther` TEXT AFTER `scopeItems`,
  ADD COLUMN `roofDetails` TEXT AFTER `scopeOther`,
  ADD COLUMN `exteriorDetails` TEXT AFTER `roofDetails`,
  ADD COLUMN `interiorDetails` TEXT AFTER `exteriorDetails`,
  ADD COLUMN `materialOrderItems` TEXT AFTER `interiorDetails`,
  ADD COLUMN `materialOrderNotes` TEXT AFTER `materialOrderItems`;
