import { useEffect } from "react";
import MarketingLayout from "@/components/MarketingLayout";

export default function PricingPage() {
  useEffect(() => {
    document.title = "Pricing | Val Kira CRM";
  }, []);

  return (
    <MarketingLayout>
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-4xl space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-3xl md:text-4xl font-semibold">Pricing</h1>
            <p className="text-muted-foreground">
              Transparent plans with a 14-day free trial. No card required.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <h2 className="text-xl font-semibold">Starter</h2>
              <p className="text-3xl font-semibold">$149<span className="text-sm font-normal text-muted-foreground">/month</span></p>
              <p className="text-sm text-muted-foreground">Includes 3 users</p>
              <p className="text-sm">$29 per extra user</p>
              <p className="text-sm">14-day free trial</p>
              <div className="pt-2">
                <a
                  href="/onboarding?plan=starter"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Start free trial
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <h2 className="text-xl font-semibold">Professional</h2>
              <p className="text-3xl font-semibold">$299<span className="text-sm font-normal text-muted-foreground">/month</span></p>
              <p className="text-sm text-muted-foreground">Includes 5 users</p>
              <p className="text-sm">$29 per extra user</p>
              <p className="text-sm">14-day free trial</p>
              <div className="pt-2">
                <a
                  href="/onboarding?plan=professional"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Start free trial
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <h2 className="text-xl font-semibold">Enterprise</h2>
              <p className="text-3xl font-semibold">$499<span className="text-sm font-normal text-muted-foreground">/month</span></p>
              <p className="text-sm text-muted-foreground">Includes 10 users</p>
              <p className="text-sm">$29 per extra user</p>
              <p className="text-sm">14-day free trial</p>
              <div className="pt-2">
                <a
                  href="/onboarding?plan=enterprise"
                  className="inline-flex w-full items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
                >
                  Start free trial
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
