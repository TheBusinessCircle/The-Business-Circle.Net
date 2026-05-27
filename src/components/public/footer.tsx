import Link from "next/link";
import { formatCompanyTrustLine } from "@/config/company";
import {
  LEGAL_FOOTER_LINKS,
  PUBLIC_TRUST_PHRASE,
  TRUST_LEGAL_GROUP_LABEL
} from "@/config/legal";
import { SITE_CONFIG } from "@/config/site";
import { BrandMark } from "@/components/branding/brand-mark";
import { CookieSettingsButton } from "@/components/privacy/cookie-settings-button";
import { buttonVariants } from "@/components/ui/button";
import { getSiteContentSection } from "@/server/site-content";
import { cn, nonEmpty } from "@/lib/utils";

const EXPLORE_LINKS = [
  { label: "Home", href: "/home" },
  { label: "About", href: "/about" },
  { label: "Membership", href: "/membership" },
  { label: "Founder Audit", href: "/audit" },
  { label: "Founder", href: "/founder" },
  { label: "Insights", href: "/insights" },
  { label: "Business Owner Network UK", href: "/business-owner-network-uk" },
  { label: "Founder Community UK", href: "/founder-community-uk" },
  { label: "Private Business Network", href: "/private-business-network" },
  { label: "Business Networking UK", href: "/business-networking-uk" },
  { label: "Leave a testimonial", href: "/review" },
  { label: "Contact", href: "/contact" },
  { label: "FAQ", href: "/faq" }
];

type TrustLinkItem =
  | {
      kind: "link";
      label: string;
      href: string;
    }
  | {
      kind: "button";
      label: string;
    };

const TRUST_LINKS: TrustLinkItem[] = [
  ...LEGAL_FOOTER_LINKS.slice(0, 4).map((link) => ({ kind: "link" as const, ...link })),
  { kind: "button", label: "Cookie settings" },
  ...LEGAL_FOOTER_LINKS.slice(4).map((link) => ({ kind: "link" as const, ...link }))
];

const SOCIAL_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  x: "X"
};

export async function Footer() {
  const footerContent = await getSiteContentSection("footer");
  const publicSupportEmail = SITE_CONFIG.supportEmail;
  const googleReviewUrl = process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL?.trim();
  const socialLinks = Object.entries(SITE_CONFIG.social).flatMap(([key, href]) =>
    nonEmpty(href)
      ? [
          {
            key,
            href,
            label: SOCIAL_LABELS[key] ?? key
          }
        ]
      : []
  );

  return (
    <footer className="border-t border-border/80 bg-background/92">
      <div className="bcn-container grid gap-8 py-12 lg:grid-cols-[1.25fr_0.8fr_0.8fr_0.9fr] lg:py-16">
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <BrandMark placement="footer" />
            <div>
              <p className="font-display text-lg text-foreground">{SITE_CONFIG.name}</p>
              <p className="text-[11px] uppercase tracking-[0.1em] text-muted">
                {PUBLIC_TRUST_PHRASE}
              </p>
            </div>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-muted">{footerContent.brandBlurb}</p>
          <div className="surface-subtle space-y-3 rounded-3xl p-4">
            <p className="text-xs uppercase tracking-[0.08em] text-gold">Why owners trust the room</p>
            <p className="text-sm text-muted">{footerContent.trustLine}</p>
            <p className="text-sm text-muted">{footerContent.founderLine}</p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.1em] text-silver">Explore</p>
          <ul className="space-y-2 text-sm text-muted">
            {EXPLORE_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition-colors hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.1em] text-silver">{TRUST_LEGAL_GROUP_LABEL}</p>
          <ul className="space-y-2 text-sm text-muted">
            {TRUST_LINKS.map((link) => (
              <li key={link.label}>
                {link.kind === "link" ? (
                  <Link href={link.href} className="transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                ) : (
                  <CookieSettingsButton className="w-full text-left text-sm text-muted">
                    {link.label}
                  </CookieSettingsButton>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.1em] text-silver">Support</p>
            <a
              href={`mailto:${publicSupportEmail}`}
              className="text-sm text-foreground transition-colors hover:text-gold"
            >
              {publicSupportEmail}
            </a>
            <p className="text-sm text-muted">{footerContent.supportLine}</p>
            <p className="text-sm text-muted">Questions on membership, access, billing, or fit are handled directly.</p>
            <div className="flex flex-col gap-2 pt-1">
              <Link
                href="/review"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full justify-center")}
              >
                Share your experience
              </Link>
              {googleReviewUrl ? (
                <a
                  href={googleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full justify-center")}
                >
                  Leave a Google review
                </a>
              ) : null}
            </div>
          </div>

          {socialLinks.length ? (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.1em] text-silver">Follow</p>
              <ul className="space-y-2 text-sm text-muted">
                {socialLinks.map((item) => (
                  <li key={item.key}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-border/80">
        <div className="bcn-container flex flex-col gap-2 py-5 text-xs text-muted lg:flex-row lg:items-center lg:justify-between">
          <p>&copy; {new Date().getFullYear()} {SITE_CONFIG.name}. All rights reserved.</p>
          <p>{footerContent.bottomLine}</p>
          <p>{formatCompanyTrustLine()}</p>
        </div>
      </div>
    </footer>
  );
}
