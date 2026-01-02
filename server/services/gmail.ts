import { ENV } from "../_core/env";
import * as db from "../db";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

function toBase64Url(input: string) {
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function refreshAccessToken(account: {
  id: number;
  organizationId: number;
  refreshToken?: string | null;
}) {
  if (!ENV.googleGmailClientId || !ENV.googleGmailClientSecret) {
    throw new Error("Google OAuth is not configured");
  }
  if (!account.refreshToken) {
    throw new Error("Missing Gmail refresh token");
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: ENV.googleGmailClientId,
      client_secret: ENV.googleGmailClientSecret,
      refresh_token: account.refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to refresh Gmail token: ${errorBody}`);
  }

  const data = await response.json() as { access_token: string; expires_in: number };
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  await db.updateGmailAccount(account.id, account.organizationId, {
    accessToken: data.access_token,
    tokenExpiresAt: expiresAt,
  });

  return { accessToken: data.access_token, expiresAt };
}

export async function getGmailAccessToken(account: {
  id: number;
  organizationId: number;
  accessToken?: string | null;
  tokenExpiresAt?: Date | string | null;
  refreshToken?: string | null;
}) {
  if (!account.accessToken) {
    const refreshed = await refreshAccessToken(account);
    return refreshed.accessToken;
  }

  if (account.tokenExpiresAt) {
    const expiresAt = new Date(account.tokenExpiresAt).getTime();
    if (expiresAt - Date.now() < 60 * 1000) {
      const refreshed = await refreshAccessToken(account);
      return refreshed.accessToken;
    }
  }

  return account.accessToken;
}

export async function fetchGmailProfile(accessToken: string) {
  const response = await fetch(`${GMAIL_API_BASE}/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to fetch Gmail profile: ${body}`);
  }
  return response.json() as Promise<{ emailAddress: string; historyId?: string }>;
}

export async function sendGmailMessage(params: {
  accessToken: string;
  fromEmail: string;
  to: string;
  subject: string;
  bodyHtml?: string | null;
  bodyText?: string | null;
  threadId?: string | null;
}) {
  const body = params.bodyHtml || params.bodyText || "";
  const headers = [
    `To: ${params.to}`,
    `From: ${params.fromEmail}`,
    `Subject: ${params.subject}`,
    "MIME-Version: 1.0",
    params.bodyHtml
      ? "Content-Type: text/html; charset=UTF-8"
      : "Content-Type: text/plain; charset=UTF-8",
    "",
    body,
  ];

  const raw = toBase64Url(headers.join("\r\n"));
  const response = await fetch(`${GMAIL_API_BASE}/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      raw,
      ...(params.threadId ? { threadId: params.threadId } : {}),
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`Failed to send Gmail message: ${bodyText}`);
  }

  return response.json() as Promise<{ id: string; threadId?: string }>;
}

export async function watchGmailMailbox(accessToken: string, topicName: string) {
  const response = await fetch(`${GMAIL_API_BASE}/watch`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topicName,
      labelIds: ["INBOX", "SENT"],
      labelFilterAction: "include",
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`Failed to watch Gmail mailbox: ${bodyText}`);
  }

  return response.json() as Promise<{ historyId?: string; expiration?: string }>;
}

export async function listGmailHistory(accessToken: string, startHistoryId: string) {
  const response = await fetch(
    `${GMAIL_API_BASE}/history?startHistoryId=${encodeURIComponent(startHistoryId)}&historyTypes=messageAdded`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`Failed to list Gmail history: ${bodyText}`);
  }

  return response.json() as Promise<{
    historyId?: string;
    history?: Array<{ messages?: Array<{ id: string; threadId: string }> }>;
  }>;
}

export async function getGmailMessage(accessToken: string, messageId: string) {
  const response = await fetch(
    `${GMAIL_API_BASE}/messages/${messageId}?format=full`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`Failed to fetch Gmail message: ${bodyText}`);
  }

  return response.json() as Promise<any>;
}

export async function listGmailMessages(params: {
  accessToken: string;
  query?: string;
  maxResults?: number;
}) {
  const search = new URLSearchParams();
  if (params.query) {
    search.set("q", params.query);
  }
  if (params.maxResults) {
    search.set("maxResults", String(params.maxResults));
  }

  const response = await fetch(
    `${GMAIL_API_BASE}/messages?${search.toString()}`,
    {
      headers: { Authorization: `Bearer ${params.accessToken}` },
    }
  );

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`Failed to list Gmail messages: ${bodyText}`);
  }

  return response.json() as Promise<{
    messages?: Array<{ id: string; threadId: string }>;
  }>;
}

function decodeBase64(data?: string | null) {
  if (!data) return "";
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

export function extractGmailHeaders(payload: any) {
  const headers = payload?.headers || [];
  const getHeader = (name: string) =>
    headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";
  return {
    subject: getHeader("Subject"),
    from: getHeader("From"),
    to: getHeader("To"),
    cc: getHeader("Cc"),
    date: getHeader("Date"),
  };
}

export function extractGmailBody(payload: any) {
  let text = "";
  let html = "";

  const visitPart = (part: any) => {
    if (!part) return;
    const mimeType = part.mimeType || "";
    if (mimeType === "text/plain" && part.body?.data) {
      text = text || decodeBase64(part.body.data);
    }
    if (mimeType === "text/html" && part.body?.data) {
      html = html || decodeBase64(part.body.data);
    }
    if (part.parts) {
      for (const sub of part.parts) {
        visitPart(sub);
      }
    }
  };

  visitPart(payload);

  if (!text && payload?.body?.data) {
    text = decodeBase64(payload.body.data);
  }

  return { bodyText: text, bodyHtml: html };
}

export function normalizeEmailList(value: string) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .map((item) => {
      const match = item.match(/<([^>]+)>/);
      return match ? match[1] : item;
    })
    .filter(Boolean);
}

export function extractEmailAddress(value: string) {
  if (!value) return "";
  const match = value.match(/<([^>]+)>/);
  return match ? match[1] : value.trim();
}
