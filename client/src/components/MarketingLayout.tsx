import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import LanguageSelector from "@/components/LanguageSelector";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border bg-background sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center">
            <div className="hidden md:block" />
            <div className="flex justify-center">
              <Link href="/">
                <a className="inline-flex items-center">
                  <img
                    src="/val-kira-logo.png"
                    alt="Val Kira CRM"
                    className="h-10 sm:h-12 w-auto"
                  />
                </a>
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 md:gap-4">
              <Link href="/pricing">
                <Button variant="ghost" className="h-9 px-3 text-sm">
                  Pricing
                </Button>
              </Link>
              <Link href="/features">
                <Button variant="ghost" className="h-9 px-3 text-sm">
                  Features
                </Button>
              </Link>
              <LanguageSelector />
              <Link href="/login">
                <Button className="h-9 px-4 text-sm">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main>{children}</main>

      <footer className="border-t border-border bg-background py-12">
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Link href="/">
                  <a className="inline-flex items-center gap-2">
                    <img
                      src="/val-kira-logo.png"
                      alt="Val Kira CRM"
                      className="h-6 w-auto"
                    />
                    <span className="font-semibold text-lg">Val Kira CRM</span>
                  </a>
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">
                Val Kira CRM is the operational hub for public adjusters.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/features"><a className="hover:text-foreground">Features</a></Link></li>
                <li><Link href="/pricing"><a className="hover:text-foreground">Pricing</a></Link></li>
                <li><Link href="/contact"><a className="hover:text-foreground">Contact</a></Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/contact"><a className="hover:text-foreground">Help Center</a></Link></li>
                <li><Link href="/contact"><a className="hover:text-foreground">Documentation</a></Link></li>
                <li><Link href="/contact"><a className="hover:text-foreground">Contact</a></Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/terms"><a className="hover:text-foreground">Terms</a></Link></li>
                <li><Link href="/privacy"><a className="hover:text-foreground">Privacy</a></Link></li>
                <li><Link href="/billing"><a className="hover:text-foreground">Billing</a></Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2025 Val Kira CRM. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
