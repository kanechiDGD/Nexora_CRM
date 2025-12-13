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
  const isProduction = process.env.NODE_ENV === 'production';

  // Usar sameSite: 'lax' para permitir navegación entre sitios y persistencia al cambiar de pestañas
  // 'strict' es demasiado restrictivo y puede causar pérdida de sesión al navegar fuera y volver
  const sameSite: "strict" | "lax" | "none" = "lax";

  return {
    httpOnly: true,
    path: "/",
    sameSite,
    // secure solo en producción con HTTPS
    secure: isProduction && isSecure,
  };
}
