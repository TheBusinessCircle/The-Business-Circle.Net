import Link from "next/link";
import { BrandMark } from "@/components/branding/brand-mark";
import { SITE_CONFIG } from "@/config/site";
import { RUNTIME_BRANDS } from "@/config/runtime-brand";

const MEMBER_LINKS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Community", href: "/community" },
  { label: "Resources", href: "/dashboard/resources" },
  { label: "Profile", href: "/profile" },
  { label: "Growth Architect", href: "/member/growth-architect" }
] as const;

const CIRCLE_CARD_LINKS = [
  { label: "Card", href: "/dashboard/circle-card?section=my-card#circle-card-form" },
  { label: "Wallet", href: "/dashboard/circle-card/wallet" },
  { label: "Analytics", href: "/dashboard/circle-card?section=my-card#analytics" },
  { label: "Explore BCN", href: "/membership" }
] as const;

const CIRCLE_CARD_RUNTIME_LINKS = [
  { label: "Cards", href: "/app?section=my-card#my-cards" },
  { label: "Studio", href: "/app/studio" },
  { label: "Wallet", href: "/app/wallet" },
  { label: "Community Standards", href: "/community-standards" }
] as const;

const TRUST_LINKS = [
  { label: "Privacy", href: "/privacy-policy" },
  { label: "Terms", href: "/terms-of-service" },
  { label: "Cookie Policy", href: "/cookie-policy" }
] as const;

function MemberFooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-sm text-muted transition-colors hover:text-[hsl(var(--member-accent-text))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--member-accent-soft)/0.75)]"
    >
      {label}
    </Link>
  );
}

type MemberFooterProps = {
  variant?: "member" | "circle-card-free" | "circle-card-runtime";
};

export function MemberFooter({ variant = "member" }: MemberFooterProps) {
  const circleCardFree = variant === "circle-card-free";
  const circleCardRuntime = variant === "circle-card-runtime";
  const circleCardWorkspace = circleCardFree || circleCardRuntime;
  const workspaceLinks = circleCardRuntime
    ? CIRCLE_CARD_RUNTIME_LINKS
    : circleCardFree
      ? CIRCLE_CARD_LINKS
      : MEMBER_LINKS;
  const brand = RUNTIME_BRANDS["circle-card"];

  return (
    <footer className="w-full overflow-x-clip border-t border-[hsl(var(--member-accent-border)/0.24)] bg-[linear-gradient(180deg,hsl(var(--background)/0.72),hsl(var(--member-atmosphere-to)/0.92))]">
      <div className="bcn-container-wide grid min-w-0 gap-6 py-7 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.42fr)_minmax(180px,0.32fr)]">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <BrandMark
              placement="workspace"
              brand={circleCardRuntime ? "circle-card" : "bcn"}
              className="border-[hsl(var(--member-accent-border)/0.45)]"
            />
            <div className="min-w-0">
              <p className="font-display text-base text-foreground">
                {circleCardRuntime ? brand.displayName : SITE_CONFIG.name}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.1em] text-[hsl(var(--member-accent-muted))]">
                {circleCardWorkspace ? "Circle Card relationship layer" : "Private founder-led environment"}
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
            {circleCardWorkspace
              ? "Create your card, manage your wallet, and keep relationship context close."
              : "Built for clearer rooms, stronger conversations, and focused business growth."}
          </p>
        </div>

        <nav aria-label={circleCardWorkspace ? "Circle Card footer navigation" : "Member footer navigation"} className="grid min-w-0 gap-2">
          <p className="text-[11px] uppercase tracking-[0.12em] text-[hsl(var(--member-accent-text))]">
            {circleCardWorkspace ? "Circle Card" : "Member links"}
          </p>
          {workspaceLinks.map((link) => (
            <MemberFooterLink key={link.href} {...link} />
          ))}
        </nav>

        <nav aria-label="Member footer trust links" className="grid min-w-0 gap-2">
          <p className="text-[11px] uppercase tracking-[0.12em] text-[hsl(var(--member-accent-text))]">
            Trust
          </p>
          {TRUST_LINKS.map((link) => (
            <MemberFooterLink key={link.href} {...link} />
          ))}
          {circleCardRuntime ? (
            <a href={`mailto:${brand.supportEmail}`} className="text-sm text-muted hover:text-foreground">
              Support
            </a>
          ) : null}
        </nav>
      </div>

      <div className="border-t border-[hsl(var(--member-accent-border)/0.18)] py-4">
        <div className="bcn-container-wide flex min-w-0 flex-col gap-2 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {circleCardRuntime ? brand.displayName : SITE_CONFIG.name}. All rights reserved.
          </p>
          <p className="text-[hsl(var(--member-accent-muted))]">
            {circleCardRuntime
              ? `Operated by ${brand.legalOperatorName}`
              : circleCardFree
                ? "Circle Card workspace"
                : "Member workspace"}
          </p>
        </div>
      </div>
    </footer>
  );
}
