export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const APP_TITLE = import.meta.env.VITE_APP_TITLE || "App";

export const APP_LOGO = "/val-kira-icon.png";

export const getLoginUrl = () => "/login";

export const getGoogleLoginUrl = (returnTo: string = "/dashboard") => {
  const target = returnTo.startsWith("/") ? returnTo : `/${returnTo}`;
  const search = new URLSearchParams({ returnTo: target }).toString();
  return `/api/oauth/google/start?${search}`;
};
