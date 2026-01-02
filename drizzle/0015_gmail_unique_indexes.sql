CREATE UNIQUE INDEX `gmailThreads_thread_org_unique`
  ON `gmailThreads` (`threadId`, `organizationId`, `clientId`);

CREATE UNIQUE INDEX `gmailMessages_message_org_unique`
  ON `gmailMessages` (`messageId`, `organizationId`);
