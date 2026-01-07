import Stripe from "stripe";
import { ENV } from "../_core/env";

if (!ENV.stripeSecretKey) {
  console.warn("[Stripe] STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(ENV.stripeSecretKey || "sk_test_placeholder", {
  apiVersion: "2025-01-27.acacia",
});
