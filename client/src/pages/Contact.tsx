import { useEffect } from "react";
import MarketingLayout from "@/components/MarketingLayout";

export default function Contact() {
  useEffect(() => {
    document.title = "Contact | Val Kira CRM";
  }, []);

  return (
    <MarketingLayout>
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-3xl space-y-6">
          <h1 className="text-3xl md:text-4xl font-semibold">Contact</h1>
          <p className="text-sm text-muted-foreground">
            We usually respond within 1 business day.
          </p>

          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Support Email</p>
              <p className="text-base">support@valkiracrm.com</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Company</p>
              <p className="text-base">Inzert-Name LLC</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="text-base">49 Sierra Rd, Montgomery, IL 60538</p>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
