import type { Express, Request, Response } from "express";
import axios from "axios";
import { randomUUID } from "crypto";
import { ENV } from "./env";
import { sdk } from "./sdk";
import * as db from "../db";
import { fetchGmailProfile, getGmailAccessToken, watchGmailMailbox } from "../services/gmail";
import { backfillGmailMessages, syncGmailHistory } from "../services/gmailSync";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

function getBaseUrl(req: Request) {
  if (ENV.publicAppUrl) {
    return ENV.publicAppUrl.replace(/\/$/, "");
  }
  const host = req.get("host");
  const protocol = req.protocol;
  return `${protocol}://${host}`;
}

function getGmailRedirectUri(req: Request) {
  return `${getBaseUrl(req)}/api/gmail/callback`;
}

function requireGoogleConfig() {
  if (!ENV.googleGmailClientId || !ENV.googleGmailClientSecret) {
    throw new Error("Gmail OAuth is not configured: set GOOGLE_GMAIL_CLIENT_ID and GOOGLE_GMAIL_CLIENT_SECRET");
  }
}

function parseStateParam(state: string | undefined) {
  if (!state) return {} as { returnTo?: string };
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf-8");
    return JSON.parse(decoded) as { returnTo?: string };
  } catch (error) {
    console.warn("[Gmail] Failed to parse state param", error);
    return {} as { returnTo?: string };
  }
}

export function registerGmailRoutes(app: Express) {
  app.get("/api/gmail/connect", async (req: Request, res: Response) => {
    try {
      requireGoogleConfig();
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const redirectUri = getGmailRedirectUri(req);
      const returnTo = typeof req.query.returnTo === "string" ? req.query.returnTo : "/profile";
      const statePayload = {
        returnTo,
        nonce: randomUUID(),
      };
      const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");
      const scope = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" ");

      const params = new URLSearchParams({
        client_id: ENV.googleGmailClientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope,
        access_type: "offline",
        prompt: "consent",
        state,
      });

      res.redirect(302, `${GOOGLE_AUTH_URL}?${params.toString()}`);
    } catch (error) {
      console.error("[Gmail] Connect failed", error);
      res.status(500).json({ error: "Gmail connect failed" });
    }
  });

  app.get("/api/gmail/callback", async (req: Request, res: Response) => {
    try {
      requireGoogleConfig();
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const code = typeof req.query.code === "string" ? req.query.code : undefined;
      const state = typeof req.query.state === "string" ? req.query.state : undefined;
      if (!code) {
        res.status(400).json({ error: "code is required" });
        return;
      }

      const stateData = parseStateParam(state);
      const returnTo = stateData.returnTo || "/profile";
      const redirectUri = getGmailRedirectUri(req);

      const tokenResponse = await axios.post(
        GOOGLE_TOKEN_URL,
        new URLSearchParams({
          code,
        client_id: ENV.googleGmailClientId,
        client_secret: ENV.googleGmailClientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }).toString(),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      const {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: expiresIn,
        scope,
      } = tokenResponse.data as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
        scope?: string;
      };

      const profile = await fetchGmailProfile(accessToken);
      const organizationMember = await db.getOrganizationMemberByUserId(user.id);
      if (!organizationMember) {
        res.status(403).json({ error: "User does not belong to an organization" });
        return;
      }

      const expiresAt = new Date(Date.now() + expiresIn * 1000);
      await db.upsertGmailAccount({
        userId: user.id,
        organizationId: organizationMember.organizationId,
        email: profile.emailAddress,
        accessToken,
        refreshToken: refreshToken || null,
        tokenExpiresAt: expiresAt,
        scope: scope || null,
        historyId: profile.historyId || null,
        isActive: 1,
      });

      const accountRecord = await db.getGmailAccountByUserId(user.id, organizationMember.organizationId);

      try {
        await backfillGmailMessages({
          account: {
            id: accountRecord?.id || user.id,
            userId: user.id,
            email: profile.emailAddress,
            organizationId: organizationMember.organizationId,
          },
          accessToken,
          query: "newer_than:180d",
          maxResults: 200,
          notifyOnInbound: false,
        });
      } catch (error) {
        console.error("[Gmail] Backfill failed", error);
      }

      if (ENV.googleGmailTopic) {
        try {
          const watch = await watchGmailMailbox(accessToken, ENV.googleGmailTopic);
          const account = await db.getGmailAccountByUserId(user.id, organizationMember.organizationId);
          if (account) {
            await db.updateGmailAccount(
              account.id,
              organizationMember.organizationId,
              {
                historyId: watch.historyId || profile.historyId || null,
                watchExpiration: watch.expiration ? new Date(Number(watch.expiration)) : null,
              }
            );
          }
        } catch (error) {
          console.error("[Gmail] Watch registration failed", error);
        }
      }

      res.redirect(302, returnTo);
    } catch (error) {
      console.error("[Gmail] Callback failed", error);
      res.redirect(302, "/profile?gmail=error");
    }
  });

  app.post("/api/gmail/webhook", async (req: Request, res: Response) => {
    try {
      const body = req.body as {
        message?: { data?: string };
      };
      if (!body?.message?.data) {
        res.status(204).send();
        return;
      }

      const decoded = Buffer.from(body.message.data, "base64").toString("utf-8");
      const payload = JSON.parse(decoded) as { emailAddress?: string; historyId?: string };
      if (!payload.emailAddress || !payload.historyId) {
        res.status(204).send();
        return;
      }

      const member = await db.getOrganizationMemberByUsername(payload.emailAddress);
      if (!member) {
        res.status(204).send();
        return;
      }

      const account = await db.getGmailAccountByEmail(payload.emailAddress, member.organizationId);
      if (!account) {
        res.status(204).send();
        return;
      }

      if (!account.historyId) {
        await db.updateGmailAccount(account.id, member.organizationId, {
          historyId: payload.historyId,
        });
        res.status(204).send();
        return;
      }

      const accessToken = await getGmailAccessToken(account);
      const latestHistoryId = await syncGmailHistory({
        account: {
          id: account.id,
          userId: account.userId,
          email: account.email,
          historyId: account.historyId,
          organizationId: member.organizationId,
        },
        accessToken,
        startHistoryId: account.historyId,
      });

      await db.updateGmailAccount(account.id, member.organizationId, {
        historyId: payload.historyId || latestHistoryId,
      });

      res.status(204).send();
    } catch (error) {
      console.error("[Gmail] Webhook failed", error);
      res.status(204).send();
    }
  });
}
