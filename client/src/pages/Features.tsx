import { useEffect } from "react";
import MarketingLayout from "@/components/MarketingLayout";

export default function FeaturesPage() {
  useEffect(() => {
    document.title = "Features | Val Kira CRM";
  }, []);

  return (
    <MarketingLayout>
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-4xl space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-3xl md:text-4xl font-semibold">Features</h1>
            <p className="text-muted-foreground">
              Built for public adjusters to manage claims, clients, and teams.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">Client & Claim Management</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Track claim status, loss details, contacts, and notes in a single view.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">Activities & Tasks</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Log calls, emails, visits, and assign tasks with due dates.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">Calendar & Events</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Schedule inspections, meetings, and deadlines in one calendar.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">Documents</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Store policies, estimates, and photos by client with fast access.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">Automation Rules</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Create activity rules that generate tasks and keep teams on track.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">Team Roles</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Manage admins, co-admins, and sellers with role-based access.
              </p>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
