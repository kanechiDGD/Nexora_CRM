export const ENV = {
  // appId usa fallback "local-crm" para login sin OAuth
  appId: process.env.VITE_APP_ID ?? "local-crm-app",
  cookieSecret: process.env.JWT_SECRET ?? "",
  cookieDomain: process.env.COOKIE_DOMAIN ?? "",
  publicAppUrl: process.env.PUBLIC_APP_URL ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
