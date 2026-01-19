import type { TFunction } from "i18next";

type CustomStatus = { name: string; displayName?: string | null };

export const DEFAULT_CLAIM_STATUSES = [
  "NO_SOMETIDA",
  "SOMETIDA",
  "AJUSTACION_PROGRAMADA",
  "AJUSTACION_TERMINADA",
  "EN_PROCESO",
  "APROVADA",
  "RECHAZADA",
  "CERRADA",
] as const;

const LEGACY_STATUS_MAP: Record<string, string> = {
  construida: "CONSTRUIDA",
  construction: "CONSTRUCTION",
  liberado: "LIBERADO",
  released: "LIBERADO",
  reinspeccion: "REINSPECCION",
  "reinspeccion no s": "REINSPECCION_NO_S",
  "reinspeccion nos": "REINSPECCION_NO_S",
  futuro: "FUTURO",
  "con fecha de inspeccion": "CON_FECHA_DE_INSPECCION",
  "inspection scheduled": "CON_FECHA_DE_INSPECCION",
  negada: "NEGADA",
  denied: "NEGADA",
  appraisal: "APPRAISAL",
  "scope pending": "SCOPE_PENDING",
  "estimate sended to insurance": "ESTIMATE_SENDED_TO_INSURANCE",
  "estimate sent to insurance": "ESTIMATE_SENDED_TO_INSURANCE",
};

const LEGACY_STATUS_LABELS: Record<string, { en: string; es: string }> = {
  CONSTRUIDA: { en: "Constructed", es: "Construida" },
  CONSTRUCTION: { en: "Construction", es: "Construccion" },
  LIBERADO: { en: "Released", es: "Liberado" },
  REINSPECCION: { en: "Reinspection", es: "Reinspeccion" },
  REINSPECCION_NO_S: { en: "Reinspection No/S", es: "Reinspeccion No/S" },
  FUTURO: { en: "Future", es: "Futuro" },
  CON_FECHA_DE_INSPECCION: { en: "Inspection Scheduled", es: "Con Fecha De Inspeccion" },
  NEGADA: { en: "Denied", es: "Negada" },
  APPRAISAL: { en: "Appraisal", es: "Appraisal" },
  SCOPE_PENDING: { en: "Scope Pending", es: "Scope Pending" },
  ESTIMATE_SENDED_TO_INSURANCE: { en: "Estimate Sent to Insurance", es: "Estimate Sent to Insurance" },
};

const normalizeKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function getClaimStatusMeta(
  status: string,
  opts: { t: TFunction; language: string; customStatuses?: CustomStatus[] }
) {
  if (DEFAULT_CLAIM_STATUSES.includes(status as (typeof DEFAULT_CLAIM_STATUSES)[number])) {
    return {
      key: `default:${status}`,
      displayName: opts.t(`dashboard.claimStatus.status.${status}`),
    };
  }

  const customStatus = opts.customStatuses?.find((cs) => cs.name === status);
  if (customStatus) {
    return {
      key: `custom:${customStatus.name}`,
      displayName: customStatus.displayName ?? customStatus.name,
    };
  }

  const normalized = normalizeKey(status);
  const legacyKey = LEGACY_STATUS_MAP[normalized];
  if (legacyKey && LEGACY_STATUS_LABELS[legacyKey]) {
    const label = LEGACY_STATUS_LABELS[legacyKey];
    return {
      key: `legacy:${legacyKey}`,
      displayName: opts.language.startsWith("es") ? label.es : label.en,
    };
  }

  return {
    key: `raw:${normalized || status}`,
    displayName: status
      .replace(/_/g, " ")
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" "),
  };
}

export function getClaimStatusDisplayName(
  status: string,
  opts: { t: TFunction; language: string; customStatuses?: CustomStatus[] }
) {
  return getClaimStatusMeta(status, opts).displayName;
}
