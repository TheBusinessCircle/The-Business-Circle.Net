import Link from "next/link";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { BrandMark } from "@/components/branding/brand-mark";
import { CircleCardPublicNavbar } from "@/components/circle-card/circle-card-public-navbar";
import { CookieSettingsButton } from "@/components/privacy/cookie-settings-button";
import { RUNTIME_BRANDS } from "@/config/runtime-brand";

const PRODUCT_LINKS = [
  { label: "Home", href: "/" },
  { label: "Circle Card Pro", href: "/pro" },
  { label: "Circle Card Teams", href: "/teams" },
  { label: "Community Standards", href: "/community-standards" }
] as const;

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms of Service", href: "/terms-of-service" },
  { label: "Cookie Policy", href: "/cookie-policy" },
  { label: "DPIA & Data Protection", href: "/dpia" }
] as const;

export async function CircleCardPublicShell({ children }: { children: ReactNode }) {
  const [session, brand] = [await auth(), RUNTIME_BRANDS["circle-card"]];
  const isAuthenticated = Boolean(session?.user && !session.user.suspended);

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip" data-runtime-shell="circle-card">
      <CircleCardPublicNavbar isAuthenticated={isAuthenticated} />
      <div className="page-surface page-surface-public relative flex flex-1 flex-col overflow-x-clip">
        <div className="page-surface-premium-glow pointer-events-none absolute inset-0 -z-10 bg-radial-premium" />
        <main className="bcn-page-shell relative flex flex-1 flex-col">{children}</main>
        <footer className="border-t border-border/80 bg-background/94">
          <div className="bcn-container-wide grid gap-8 py-10 md:grid-cols-[1.2fr_0.7fr_0.8fr]">
            <div>
              <div className="flex items-center gap-3">
                <BrandMark placement="footer" brand="circle-card" />
                <div>
                  <p className="font-display text-lg text-foreground">{brand.displayName}</p>
                  <p className="text-xs uppercase tracking-[0.1em] text-muted">
                    Professional identity and relationship tools
                  </p>
                </div>
              </div>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted">
                Create, share and manage your Circle Card while keeping the people and context
                around your business relationships close.
              </p>
              <div className="mt-4 grid gap-1 text-sm">
                <a href={`mailto:${brand.supportEmail}`} className="text-foreground hover:text-gold">
                  Support: {brand.supportEmail}
                </a>
                <a href={`mailto:${brand.publicContactEmail}`} className="text-muted hover:text-foreground">
                  Contact: {brand.publicContactEmail}
                </a>
              </div>
            </div>

            <nav aria-label="Circle Card product links" className="grid content-start gap-2 text-sm">
              <p className="text-xs uppercase tracking-[0.1em] text-silver">Circle Card</p>
              {PRODUCT_LINKS.map((item) => (
                <Link key={item.href} href={item.href} className="text-muted hover:text-foreground">
                  {item.label}
                </Link>
              ))}
            </nav>

            <nav aria-label="Circle Card legal links" className="grid content-start gap-2 text-sm">
              <p className="text-xs uppercase tracking-[0.1em] text-silver">Support & legal</p>
              {LEGAL_LINKS.map((item) => (
                <Link key={item.href} href={item.href} className="text-muted hover:text-foreground">
                  {item.label}
                </Link>
              ))}
              <CookieSettingsButton className="text-left text-sm text-muted hover:text-foreground">
                Cookie settings
              </CookieSettingsButton>
            </nav>
          </div>
          <div className="border-t border-border/80">
            <div className="bcn-container-wide flex flex-col gap-2 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
              <p>&copy; {new Date().getFullYear()} {brand.displayName}. All rights reserved.</p>
              <p>Operated by {brand.legalOperatorName}</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
