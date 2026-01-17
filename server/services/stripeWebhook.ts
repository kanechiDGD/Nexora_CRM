import Stripe from "stripe";
import { stripe } from "./stripe";
import { ENV } from "../_core/env";
import * as db from "../db";
import { resolvePlanTierFromPriceId } from "../utils/billing";

export async function handleStripeWebhook(payload: Buffer, signature: string | undefined) {
  if (!ENV.stripeWebhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature || "", ENV.stripeWebhookSecret);
  } catch (error) {
    console.error("[Stripe] Webhook signature verification failed", error);
    throw error;
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      const organizationId = Number(session.metadata?.organizationId || 0);

      if (organizationId && customerId) {
        const updates: Record<string, string | null> = {
          stripeCustomerId: customerId,
        };
        if (session.mode === "subscription") {
          updates.stripeSubscriptionId = subscriptionId ?? null;
        }
        await db.updateOrganization(organizationId, updates);
      }

      if (session.mode === "setup" && customerId) {
        const setupIntentId =
          typeof session.setup_intent === "string"
            ? session.setup_intent
            : session.setup_intent?.id;
        if (setupIntentId) {
          const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
          const paymentMethodId =
            typeof setupIntent.payment_method === "string"
              ? setupIntent.payment_method
              : setupIntent.payment_method?.id;
          if (paymentMethodId) {
            await stripe.customers.update(customerId, {
              invoice_settings: {
                default_payment_method: paymentMethodId,
              },
            });
          }
        }
      }
      break;
    }
    case "customer.updated": {
      const customer = event.data.object as Stripe.Customer;
      const customerId = customer.id;
      const hasPaymentMethod = Boolean(customer.invoice_settings?.default_payment_method);
      const org = await db.getOrganizationByStripeCustomerId(customerId);
      if (org) {
        await db.updateOrganization(org.id, {
          hasPaymentMethod: hasPaymentMethod ? 1 : 0,
        });
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
      const org = customerId ? await db.getOrganizationByStripeCustomerId(customerId) : null;
      if (!org) break;

      const items = subscription.items.data;
      let planItemId: string | null = null;
      let extraItemId: string | null = null;
      let planTier = org.planTier;
      let extraSeats = org.extraSeats ?? 0;

      for (const item of items) {
        const priceId = typeof item.price === "string" ? item.price : item.price?.id;
        if (!priceId) continue;
        const tier = resolvePlanTierFromPriceId(priceId);
        if (tier) {
          planTier = tier;
          planItemId = item.id;
          continue;
        }
        if (priceId === ENV.stripePriceExtraSeat) {
          extraItemId = item.id;
          extraSeats = item.quantity ?? 0;
        }
      }

      await db.updateOrganization(org.id, {
        stripeSubscriptionId: subscription.id,
        stripeSubscriptionStatus: subscription.status,
        planTier: planTier,
        planStatus: subscription.status,
        stripePlanItemId: planItemId,
        stripeExtraItemId: extraItemId,
        extraSeats: extraSeats,
      });
      break;
    }
    case "invoice.payment_succeeded":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      const org = customerId ? await db.getOrganizationByStripeCustomerId(customerId) : null;
      if (!org) break;
      await db.updateOrganization(org.id, {
        planStatus: invoice.paid ? "active" : "past_due",
      });
      break;
    }
    default:
      break;
  }

  return { received: true };
}
