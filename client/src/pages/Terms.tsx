import { useEffect } from "react";
import MarketingLayout from "@/components/MarketingLayout";

export default function Terms() {
  useEffect(() => {
    document.title = "Terms of Service | Val Kira CRM";
  }, []);

  return (
    <MarketingLayout>
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-3xl space-y-6">
          <h1 className="text-3xl md:text-4xl font-semibold">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: January 4, 2026</p>

          <p>
            Val Kira CRM is operated by Inzert-Name LLC (&quot;Company,&quot; &quot;we,&quot;
            &quot;us&quot;). By accessing or using the Service, you agree to these
            Terms.
          </p>

          <h2 className="text-xl font-semibold">1. Service</h2>
          <p>
            Val Kira CRM provides a web-based CRM platform for public adjusters,
            including client, task, calendar, document, and communication tools.
          </p>

          <h2 className="text-xl font-semibold">2. Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your
            credentials and all activity under your account.
          </p>

          <h2 className="text-xl font-semibold">3. Billing & Trial</h2>
          <p>
            Plans include a 14-day free trial with no card required. We will
            notify you 5 days before the trial ends to add a payment method. If
            no payment method is added, the account will be canceled or access
            suspended at the end of the trial.
          </p>

          <h2 className="text-xl font-semibold">4. Plan Limits</h2>
          <p>
            Plan limits and per-user pricing are listed on the Pricing page. You
            agree to pay for additional users beyond included limits.
          </p>

          <h2 className="text-xl font-semibold">5. Acceptable Use</h2>
          <p>
            You may not misuse the Service, attempt unauthorized access, or use
            it for unlawful activities.
          </p>

          <h2 className="text-xl font-semibold">6. Termination</h2>
          <p>
            We may suspend or terminate accounts for violations of these Terms.
            You may cancel your account at any time.
          </p>

          <h2 className="text-xl font-semibold">7. Contact</h2>
          <p>
            Inzert-Name LLC, 49 Sierra Rd, Montgomery, IL 60538. Support:
            support@valkiracrm.com
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}
