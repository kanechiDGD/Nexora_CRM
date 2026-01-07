import { useEffect } from "react";
import MarketingLayout from "@/components/MarketingLayout";

export default function Privacy() {
  useEffect(() => {
    document.title = "Privacy Policy | Val Kira CRM";
  }, []);

  return (
    <MarketingLayout>
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-3xl space-y-6">
          <h1 className="text-3xl md:text-4xl font-semibold">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: January 4, 2026</p>

          <p>
            Val Kira CRM is operated by Inzert-Name LLC. This policy explains
            how we collect, use, and protect information.
          </p>

          <h2 className="text-xl font-semibold">Information We Collect</h2>
          <p>
            Account information (name, email), organization data, and data you
            enter into the CRM (clients, activities, tasks, and documents).
          </p>

          <h2 className="text-xl font-semibold">How We Use Information</h2>
          <p>
            To provide the Service, improve features, maintain security, and
            communicate about your account.
          </p>

          <h2 className="text-xl font-semibold">Sharing</h2>
          <p>
            We do not sell your data. We may share data with service providers
            necessary to operate the Service.
          </p>

          <h2 className="text-xl font-semibold">Data Security</h2>
          <p>
            We apply reasonable security measures to protect your data, but no
            system is completely secure.
          </p>

          <h2 className="text-xl font-semibold">Contact</h2>
          <p>
            Inzert-Name LLC, 49 Sierra Rd, Montgomery, IL 60538. Support:
            support@valkiracrm.com
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}
