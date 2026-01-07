import { Organization } from "../../drizzle/schema";
import { ENV } from "../_core/env";

export type PlanTier = "starter" | "professional" | "enterprise";

type PlanConfig = {
  tier: PlanTier;
  name: string;
  includedSeats: number;
  priceId: string;
};

export const PLAN_CONFIGS: Record<PlanTier, PlanConfig> = {
  starter: {
    tier: "starter",
    name: "Starter",
    includedSeats: 3,
    priceId: ENV.stripePriceStarter,
  },
  professional: {
    tier: "professional",
    name: "Professional",
    includedSeats: 5,
    priceId: ENV.stripePriceProfessional,
  },
  enterprise: {
    tier: "enterprise",
    name: "Enterprise",
    includedSeats: 10,
    priceId: ENV.stripePriceEnterprise,
  },
};

export function resolvePlanTierFromPriceId(priceId?: string | null): PlanTier | null {
  if (!priceId) return null;
  const entries = Object.values(PLAN_CONFIGS);
  const match = entries.find((plan) => plan.priceId === priceId);
  return match?.tier ?? null;
}

export function getPlanConfig(tier: PlanTier): PlanConfig {
  return PLAN_CONFIGS[tier];
}

export function getTrialDaysLeft(org: Organization | null): number | null {
  if (!org?.trialEndsAt) return null;
  const now = Date.now();
  const diffMs = new Date(org.trialEndsAt).getTime() - now;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function isTrialActive(org: Organization | null): boolean {
  if (!org?.trialEndsAt) return false;
  return Date.now() <= new Date(org.trialEndsAt).getTime();
}

export function isSubscriptionActive(org: Organization | null): boolean {
  const status = org?.stripeSubscriptionStatus ?? "";
  return status === "active" || status === "trialing";
}

export function isAccessBlocked(org: Organization | null): boolean {
  if (!org) return false;
  if (isSubscriptionActive(org)) return false;
  if (isTrialActive(org)) return false;
  return true;
}

export function getAllowedSeats(org: Organization | null): number {
  if (!org) return 0;
  const tier = (org.planTier as PlanTier) || "starter";
  const included = getPlanConfig(tier).includedSeats;
  const extra = org.extraSeats ?? 0;
  return included + extra;
}

export function getExtraSeatsNeeded(memberCount: number, org: Organization): number {
  const tier = (org.planTier as PlanTier) || "starter";
  const included = getPlanConfig(tier).includedSeats;
  return Math.max(0, memberCount - included);
}
