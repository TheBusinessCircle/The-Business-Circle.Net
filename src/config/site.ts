import type { NavigationItem, SiteConfig } from "@/types";

const publicNavigation: NavigationItem[] = [
  { label: "Home", href: "/" },
  { label: "Insights", href: "/insights" },
  { label: "Membership", href: "/membership" },
  { label: "Founder", href: "/founder" },
  { label: "About", href: "/about" },
  { label: "Early Access", href: "/early-access" },
  { label: "Contact", href: "/contact" },
];

const memberNavigation: NavigationItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Resources", href: "/dashboard/resources" },
  { label: "Directory", href: "/directory" },
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
  { label: "Resources", href: "/admin/resources" },
  { label: "Events", href: "/admin/events" },
  { label: "Revenue", href: "/admin/revenue" },
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
    "A founder-led business growth ecosystem for business owners, startups, local businesses, and established companies to grow through strategy, trust, collaboration, and practical momentum.",
  url: process.env.APP_URL ?? "http://localhost:3000",
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
