import type { NavigationItem, SiteConfig } from "@/types";

function normalizeConfiguredUrl(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function resolveSiteUrl() {
  return (
    normalizeConfiguredUrl(process.env.APP_URL) ||
    normalizeConfiguredUrl(process.env.NEXTAUTH_URL) ||
    "http://localhost:3000"
  );
}

const publicNavigation: NavigationItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Membership", href: "/membership" },
  { label: "Founder", href: "/founder" },
  { label: "Insights", href: "/insights" },
  { label: "Contact", href: "/contact" }
];

const memberNavigation: NavigationItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Resources", href: "/dashboard/resources" },
  { label: "Directory", href: "/directory" },
  { label: "Messages", href: "/messages" },
  { label: "Wins", href: "/wins" },
  { label: "Calls", href: "/calls" },
  { label: "Community", href: "/community" },
  { label: "Events", href: "/events" },
  { label: "Profile", href: "/profile" },
  { label: "Inner Circle", href: "/inner-circle", requiresTier: "INNER_CIRCLE" },
  { label: "Founder | Trev", href: "/founder" }
];

const adminNavigation: NavigationItem[] = [
  { label: "Overview", href: "/admin" },
  { label: "Members", href: "/admin/members" },
  { label: "Community", href: "/admin/community" },
  { label: "Messages", href: "/admin/messages" },
  { label: "Wins", href: "/admin/wins" },
  { label: "Resources", href: "/admin/resources" },
  { label: "Events", href: "/admin/events" },
  { label: "Calling", href: "/admin/calling" },
  { label: "Revenue", href: "/admin/revenue" },
  { label: "Products & Pricing", href: "/admin/products-pricing" },
  { label: "Security", href: "/admin/security" },
  { label: "System Health", href: "/admin/system-health" },
  { label: "Founding Launch", href: "/admin/founding" },
  { label: "Site Content", href: "/admin/site-content" },
  { label: "Channels", href: "/admin/channels" },
  { label: "Founder Services", href: "/admin/founder-services" }
];

export const SITE_CONFIG: SiteConfig = {
  name: "The Business Circle Network",
  shortName: "Business Circle",
  description:
    "A founder-led private business environment for owners who want better structure, stronger relationships, and steadier momentum.",
  url: resolveSiteUrl(),
  supportEmail: "support@businesscircle.network",
  publicNavigation,
  memberNavigation,
  adminNavigation,
  social: {
    linkedin: process.env.NEXT_PUBLIC_LINKEDIN_URL || undefined,
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || undefined,
    facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL || undefined,
    tiktok: process.env.NEXT_PUBLIC_TIKTOK_URL || undefined,
    youtube: process.env.NEXT_PUBLIC_YOUTUBE_URL || undefined,
    x: process.env.NEXT_PUBLIC_X_URL || undefined
  },
  seo: {
    titleTemplate: "%s | The Business Circle Network",
    defaultTitle: "The Business Circle Network"
  }
};
