import * as db from "../db";
import {
  extractEmailAddress,
  extractGmailBody,
  extractGmailHeaders,
  getGmailMessage,
  listGmailHistory,
  listGmailMessages,
  normalizeEmailList,
} from "./gmail";

type GmailAccountRecord = {
  id: number;
  userId: number;
  email: string;
  historyId?: string | null;
  organizationId: number;
};

function isLikelyEmail(value?: string | null) {
  if (!value) return false;
  return /@/.test(value);
}

function normalizeAlnum(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function formatClientName(client?: { firstName?: string | null; lastName?: string | null }) {
  if (!client) return "Client";
  const parts = [client.firstName, client.lastName].filter(Boolean);
  return parts.length ? parts.join(" ") : "Client";
}

function findMatchingClient(
  participants: string[],
  clients: Array<{
    id: string;
    email?: string | null;
    assignedAdjuster?: string | null;
    claimNumber?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  }>,
  haystack: string
) {
  const normalizedHaystack = normalizeAlnum(haystack);
  for (const client of clients) {
    const clientEmail = (client.email || "").toLowerCase();
    const adjusterEmail = isLikelyEmail(client.assignedAdjuster) ? (client.assignedAdjuster || "").toLowerCase() : "";
    if (clientEmail && participants.includes(clientEmail)) {
      return client.id;
    }
    if (adjusterEmail && participants.includes(adjusterEmail)) {
      return client.id;
    }
    const claimNumber = (client.claimNumber || "").trim();
    const normalizedClaim = normalizeAlnum(claimNumber);
    if (normalizedClaim && normalizedHaystack.includes(normalizedClaim)) {
      return client.id;
    }
    const clientName = [client.firstName, client.lastName].filter(Boolean).join(" ").trim();
    const normalizedName = normalizeAlnum(clientName);
    if (normalizedName && normalizedHaystack.includes(normalizedName)) {
      return client.id;
    }
  }
  return null;
}

export async function syncGmailHistory(params: {
  account: GmailAccountRecord;
  accessToken: string;
  startHistoryId: string;
}) {
  const history = await listGmailHistory(params.accessToken, params.startHistoryId);
  const messageEntries = history.history || [];
  if (messageEntries.length === 0) {
    return history.historyId || params.startHistoryId;
  }

  const clients = await db.getAllClients(params.account.organizationId);
  const clientLookup = clients.map((client) => ({
    id: client.id,
    email: client.email,
    assignedAdjuster: client.assignedAdjuster,
    claimNumber: client.claimNumber,
    firstName: client.firstName,
    lastName: client.lastName,
  }));

  for (const entry of messageEntries) {
    const messages = entry.messages || entry.messagesAdded?.map((m: any) => m.message) || [];
    for (const msg of messages) {
      await processGmailMessage({
        account: params.account,
        accessToken: params.accessToken,
        messageId: msg.id,
        organizationId: params.account.organizationId,
        clientLookup,
        notifyOnInbound: true,
      });
    }
  }

  return history.historyId || params.startHistoryId;
}

export async function backfillGmailMessages(params: {
  account: GmailAccountRecord;
  accessToken: string;
  query: string;
  maxResults?: number;
  notifyOnInbound?: boolean;
}) {
  const list = await listGmailMessages({
    accessToken: params.accessToken,
    query: params.query,
    maxResults: params.maxResults || 200,
  });
  const messages = list.messages || [];
  if (messages.length === 0) {
    return 0;
  }

  const clients = await db.getAllClients(params.account.organizationId);
  const clientLookup = clients.map((client) => ({
    id: client.id,
    email: client.email,
    assignedAdjuster: client.assignedAdjuster,
    claimNumber: client.claimNumber,
    firstName: client.firstName,
    lastName: client.lastName,
  }));

  let processed = 0;
  for (const msg of messages) {
    const wasProcessed = await processGmailMessage({
      account: params.account,
      accessToken: params.accessToken,
      messageId: msg.id,
      organizationId: params.account.organizationId,
      clientLookup,
      notifyOnInbound: params.notifyOnInbound ?? false,
    });
    if (wasProcessed) {
      processed += 1;
    }
  }

  return processed;
}

async function processGmailMessage(params: {
  account: GmailAccountRecord;
  accessToken: string;
  messageId: string;
  organizationId: number;
  clientLookup: Array<{
    id: string;
    email?: string | null;
    assignedAdjuster?: string | null;
    claimNumber?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  }>;
  notifyOnInbound: boolean;
}) {
  const existing = await db.getGmailMessageByMessageId(params.messageId, params.organizationId);
  if (existing) {
    return false;
  }

  const fullMessage = await getGmailMessage(params.accessToken, params.messageId);
  const headers = extractGmailHeaders(fullMessage.payload);
  const { bodyText, bodyHtml } = extractGmailBody(fullMessage.payload);
  const isRead = !fullMessage.labelIds?.includes("UNREAD");

  const fromEmail = extractEmailAddress(headers.from).toLowerCase();
  const toEmails = normalizeEmailList(headers.to).map((val) => val.toLowerCase());
  const ccEmails = normalizeEmailList(headers.cc).map((val) => val.toLowerCase());
  const participants = Array.from(new Set([fromEmail, ...toEmails, ...ccEmails].filter(Boolean)));

  const haystack = [
    headers.subject || "",
    fullMessage.snippet || "",
    bodyText || "",
  ]
    .join(" ")
    .toLowerCase();

  const clientId = findMatchingClient(participants, params.clientLookup, haystack);
  if (!clientId) {
    return false;
  }
  const matchedClient = params.clientLookup.find((client) => client.id === clientId);

  let threadRecord = await db.getGmailThreadByThreadId(
    fullMessage.threadId,
    params.organizationId,
    clientId
  );
  if (!threadRecord) {
    await db.createGmailThread({
      threadId: fullMessage.threadId,
      clientId,
      organizationId: params.organizationId,
      subject: headers.subject || null,
      lastMessageAt: fullMessage.internalDate ? new Date(Number(fullMessage.internalDate)) : new Date(),
      lastSnippet: fullMessage.snippet || null,
    });
    threadRecord = await db.getGmailThreadByThreadId(
      fullMessage.threadId,
      params.organizationId,
      clientId
    );
  } else {
    await db.updateGmailThread(threadRecord.id, params.organizationId, {
      lastMessageAt: fullMessage.internalDate ? new Date(Number(fullMessage.internalDate)) : new Date(),
      lastSnippet: fullMessage.snippet || null,
    });
  }

  const direction = fromEmail === params.account.email.toLowerCase() ? "OUTBOUND" : "INBOUND";
  try {
    await db.createGmailMessage({
      messageId: params.messageId,
      threadId: threadRecord?.id || null,
      clientId,
      organizationId: params.organizationId,
      direction,
      fromEmail: fromEmail || null,
      toEmails: toEmails.join(", "),
      ccEmails: ccEmails.join(", "),
      subject: headers.subject || null,
      snippet: fullMessage.snippet || null,
      bodyText: bodyText || null,
      bodyHtml: bodyHtml || null,
      sentAt: fullMessage.internalDate ? new Date(Number(fullMessage.internalDate)) : new Date(),
      gmailLink: `https://mail.google.com/mail/u/0/#all/${params.messageId}`,
      isRead: isRead ? 1 : 0,
    });
  } catch (error) {
    return false;
  }

  if (direction === "INBOUND") {
    await db.createActivityLog({
      clientId,
      activityType: "CORREO",
      subject: headers.subject || "Email received",
      description: bodyText || fullMessage.snippet || "Email received",
      organizationId: params.organizationId,
      performedBy: params.account.userId,
    });

    if (!isRead && params.notifyOnInbound) {
      const members = await db.getOrganizationMembers(params.organizationId);
      if (members.length) {
        const clientName = formatClientName(matchedClient);
        const rows = members.map((member) => ({
          organizationId: params.organizationId,
          userId: member.userId,
          type: "EMAIL" as const,
          title: `New email for ${clientName}`,
          body: headers.subject ? `Subject: ${headers.subject}` : "New inbound email",
          entityType: "client",
          entityId: clientId,
        }));
        await db.createNotifications(rows);
      }
    }
  }

  return true;
}
