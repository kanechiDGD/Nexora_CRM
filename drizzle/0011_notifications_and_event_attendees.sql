CREATE TABLE `eventAttendees` (
  `id` int AUTO_INCREMENT NOT NULL,
  `eventId` int NOT NULL,
  `memberId` int NOT NULL,
  `organizationId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `eventAttendees_id` PRIMARY KEY(`id`)
);

CREATE TABLE `notifications` (
  `id` int AUTO_INCREMENT NOT NULL,
  `organizationId` int NOT NULL,
  `userId` int NOT NULL,
  `type` enum('EVENT','TASK','ACTIVITY') NOT NULL,
  `title` varchar(200) NOT NULL,
  `body` text,
  `entityType` varchar(50),
  `entityId` varchar(50),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `readAt` timestamp NULL,
  CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
