import Link from "next/link";
import { SITE_CONFIG } from "@/config/site";
import { BrandMark } from "@/components/branding/brand-mark";
import { CookieSettingsButton } from "@/components/privacy/cookie-settings-button";
import { getSiteContentSection } from "@/server/site-content";
import { nonEmpty } from "@/lib/utils";

const EXPLORE_LINKS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Membership", href: "/membership" },
  { label: "Join", href: "/join" },
  { label: "Founder", href: "/founder" },
  { label: "Insights", href: "/insights" },
  { label: "Contact", href: "/contact" },
  { label: "FAQ", href: "/#faq" }
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
  { kind: "link", label: "Privacy Policy", href: "/privacy-policy" },
  { kind: "link", label: "Terms of Service", href: "/terms-of-service" },
  { kind: "link", label: "Cookie Policy", href: "/cookie-policy" },
  { kind: "button", label: "Cookie settings" },
  { kind: "link", label: "DPIA & Data Protection", href: "/dpia" }
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
    <footer className="border-t border-border/80 bg-background/88">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:gap-10 sm:px-6 sm:py-14 lg:grid-cols-[1.25fr_0.8fr_0.8fr_0.9fr] lg:px-8 lg:py-16">
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <BrandMark placement="footer" />
            <div>
              <p className="font-display text-lg text-foreground">{SITE_CONFIG.name}</p>
              <p className="text-[11px] uppercase tracking-[0.1em] text-muted">
                Founder-Led Growth Ecosystem
              </p>
            </div>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-muted">
            {footerContent.brandBlurb}
          </p>
          <div className="space-y-2 rounded-3xl border border-border/80 bg-card/55 p-4">
            <p className="text-xs uppercase tracking-[0.08em] text-gold">
              {footerContent.trustLine}
            </p>
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
          <p className="text-xs uppercase tracking-[0.1em] text-silver">Trust</p>
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
            <li>
              <Link href="/membership" className="transition-colors hover:text-foreground">
                Find Your Room
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.1em] text-silver">Support</p>
            <a
              href={`mailto:${footerContent.supportEmail}`}
              className="text-sm text-foreground transition-colors hover:text-gold"
            >
              {footerContent.supportEmail}
            </a>
            <p className="text-sm text-muted">{footerContent.supportLine}</p>
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
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-muted sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>&copy; {new Date().getFullYear()} {SITE_CONFIG.name}. All rights reserved.</p>
          <p>{footerContent.bottomLine}</p>
        </div>
      </div>
    </footer>
  );
}
