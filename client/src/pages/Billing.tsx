import { useEffect, useState } from "react";
import MarketingLayout from "@/components/MarketingLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function Billing() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: membership } = trpc.organizations.checkMembership.useQuery(undefined, {
    enabled: !!user,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const [promotionCode, setPromotionCode] = useState("");

  const checkoutMutation = trpc.billing.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const setupMutation = trpc.billing.createSetupSession.useMutation({
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const applyCompedMutation = trpc.billing.applyCompedCode.useMutation({
    onSuccess: () => {
      toast.success(t("billing.couponApplied"));
      utils.organizations.checkMembership.invalidate();
      utils.billing.getStatus.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const portalMutation = trpc.billing.createPortalSession.useMutation({
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    document.title = "Billing & Cancellation | Val Kira CRM";
  }, []);

  const search = new URLSearchParams(window.location.search);
  const planTier = (search.get("plan") as "starter" | "professional" | "enterprise" | null) ?? undefined;
  const hasCustomer = Boolean(membership?.organization?.stripeCustomerId);

  const handleStartTrial = () => {
    checkoutMutation.mutate({
      planTier,
      promotionCode: promotionCode.trim() || undefined,
    });
  };

  const handleManageBilling = () => {
    portalMutation.mutate();
  };

  const handleAddPaymentMethod = () => {
    setupMutation.mutate({ successPath: "/billing", cancelPath: "/billing" });
  };

  const handleApplyCoupon = () => {
    const trimmed = promotionCode.trim();
    if (!trimmed) {
      toast.error(t("billing.couponRequired"));
      return;
    }
    applyCompedMutation.mutate({ code: trimmed });
  };

  return (
    <MarketingLayout>
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-3xl space-y-6">
          <h1 className="text-3xl md:text-4xl font-semibold">Billing & Cancellation</h1>
          <p className="text-sm text-muted-foreground">Last updated: January 4, 2026</p>

          {user ? (
            membership?.hasMembership ? (
              <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
                <h2 className="text-xl font-semibold">Manage your subscription</h2>
                <p className="text-sm text-muted-foreground">
                  Start your 14-day free trial or manage billing details for your organization.
                </p>
                {membership?.billing?.isComped && (
                  <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    {t("billing.compedActive")}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("billing.promoCodeLabel")}</label>
                  <Input
                    value={promotionCode}
                    onChange={(event) => setPromotionCode(event.target.value)}
                    placeholder={t("billing.promoCodePlaceholder")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("billing.promoCodeHint")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleStartTrial}
                    disabled={checkoutMutation.isPending}
                  >
                    {t("billing.startTrial")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleApplyCoupon}
                    disabled={applyCompedMutation.isPending}
                  >
                    {t("billing.applyCoupon")}
                  </Button>
                  {hasCustomer && (
                    <Button
                      variant="outline"
                      onClick={handleManageBilling}
                      disabled={portalMutation.isPending}
                    >
                      Manage billing
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleAddPaymentMethod}
                    disabled={setupMutation.isPending}
                  >
                    {t("billing.addPaymentMethod")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
                Create your organization first to manage billing.
              </div>
            )
          ) : (
            <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
              Sign in to start your trial or manage billing.
            </div>
          )}

          <h2 className="text-xl font-semibold">Free Trial</h2>
          <p>
            All plans include a 14-day free trial with no card required. We will
            notify you 5 days before the trial ends to add a payment method. If
            no payment method is added, the account will be canceled or access
            suspended at the end of the trial.
          </p>

          <h2 className="text-xl font-semibold">Plan Limits & Extra Users</h2>
          <p>
            Starter includes 3 users, Professional includes 5 users, and
            Enterprise includes 10 users. Extra users are $29 each across all
            plans.
          </p>

          <h2 className="text-xl font-semibold">Billing Cycle</h2>
          <p>
            Plans are billed monthly unless otherwise agreed. Fees are not
            refundable except where required by law.
          </p>

          <h2 className="text-xl font-semibold">Cancellation</h2>
          <p>
            You can cancel at any time from your account. Access continues until
            the end of the billing period unless otherwise stated.
          </p>

          <h2 className="text-xl font-semibold">Contact</h2>
          <p>
            Support: support@valkiracrm.com
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}
