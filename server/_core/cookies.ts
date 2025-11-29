import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const isSecure = isSecureRequest(req);
  const hostname = req.hostname;
  const isLocalhost = LOCAL_HOSTS.has(hostname) || isIpAddress(hostname);

  // En producción HTTPS siempre usar sameSite: 'none' y secure: true
  // En localhost/desarrollo usar sameSite: 'lax' y secure: false
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    path: "/",
    // sameSite 'none' requiere secure: true, solo usar en producción HTTPS
    sameSite: (isProduction && isSecure) ? "none" : "lax",
    secure: isProduction && isSecure,
  };
}
