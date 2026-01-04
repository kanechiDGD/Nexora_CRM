ALTER TABLE `gmailMessages`
  ADD COLUMN `isRead` int NOT NULL DEFAULT 1;

ALTER TABLE `notifications` MODIFY COLUMN `type` enum(
  'EVENT',
  'TASK',
  'ACTIVITY',
  'EMAIL'
) NOT NULL;
