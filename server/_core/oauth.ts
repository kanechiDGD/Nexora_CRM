import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { randomUUID } from "crypto";
import type { Express, Request, Response } from "express";
import axios from "axios";
import { createRemoteJWKSet, jwtVerify } from "jose";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function getBaseUrl(req: Request) {
  if (ENV.publicAppUrl) {
    return ENV.publicAppUrl.replace(/\/$/, "");
  }

  const host = req.get("host");
  const protocol = req.protocol;
  return `${protocol}://${host}`;
}

function getGoogleRedirectUri(req: Request) {
  return `${getBaseUrl(req)}/api/oauth/google/callback`;
}

function requireGoogleConfig() {
  if (!ENV.googleClientId || !ENV.googleClientSecret) {
    throw new Error("Google OAuth is not configured: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET");
  }
}

function parseStateParam(state: string | undefined) {
  if (!state) return {} as { returnTo?: string };

  try {
    const decoded = Buffer.from(state, "base64url").toString("utf-8");
    return JSON.parse(decoded) as { returnTo?: string };
  } catch (error) {
    console.warn("[OAuth] Failed to parse state param", error);
    return {} as { returnTo?: string };
  }
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      // Establecer maxAge de 1 año para que la cookie persista
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/dashboard");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  // ===== Google OAuth 2.0 =====
  app.get("/api/oauth/google/start", (req: Request, res: Response) => {
    try {
      requireGoogleConfig();
      const redirectUri = getGoogleRedirectUri(req);
      const returnTo = getQueryParam(req, "returnTo") || "/dashboard";

      const statePayload = {
        returnTo,
        nonce: randomUUID(),
      };

      const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");

      const params = new URLSearchParams({
        client_id: ENV.googleClientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        access_type: "offline",
        prompt: "select_account",
        state,
      });

      res.redirect(302, `${GOOGLE_AUTH_URL}?${params.toString()}`);
    } catch (error) {
      console.error("[OAuth] Google start failed", error);
      res.status(500).json({ error: "Google OAuth not configured" });
    }
  });

  app.get("/api/oauth/google/callback", async (req: Request, res: Response) => {
    try {
      requireGoogleConfig();
      const code = getQueryParam(req, "code");
      const state = getQueryParam(req, "state");

      if (!code) {
        res.status(400).json({ error: "code is required" });
        return;
      }

      const stateData = parseStateParam(state);
      const returnTo = stateData.returnTo || "/dashboard";
      const redirectUri = getGoogleRedirectUri(req);

      const tokenResponse = await axios.post(
        GOOGLE_TOKEN_URL,
        new URLSearchParams({
          code,
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }).toString(),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      const { id_token: idToken } = tokenResponse.data as { id_token?: string };

      if (!idToken) {
        console.error("[OAuth] Google token response missing id_token", tokenResponse.data);
        res.status(500).json({ error: "Google OAuth token missing id_token" });
        return;
      }

      const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
        audience: ENV.googleClientId,
        issuer: ["https://accounts.google.com", "accounts.google.com"],
      });

      const sub = payload.sub;
      const email = typeof payload.email === "string" ? payload.email : null;
      const name = typeof payload.name === "string" ? payload.name : email || "Google User";

      if (!sub) {
        console.error("[OAuth] Google token missing sub", payload);
        res.status(500).json({ error: "Invalid Google token" });
        return;
      }

      const openId = `google:${sub}`;

      await db.upsertUser({
        openId,
        name,
        email,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      const user = await db.getUserByOpenId(openId);
      if (user && email) {
        const member = await db.getOrganizationMemberByUsername(email);
        if (member && member.userId !== user.id) {
          await db.updateOrganizationMember(member.id, { userId: user.id });
        }
      }

      const sessionToken = await sdk.createSessionToken(openId, {
        name: name || "Google User",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, returnTo);
    } catch (error) {
      console.error("[OAuth] Google callback failed", error);
      res.redirect(302, "/login?error=google_oauth_failed");
    }
  });
}
