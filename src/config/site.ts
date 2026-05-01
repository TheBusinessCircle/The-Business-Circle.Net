import type { NavigationItem, SiteConfig } from "@/types";
import { PUBLIC_TRUST_PHRASE } from "@/config/legal";
import { CANONICAL_SITE_URL } from "@/config/site-constants";

const publicNavigation: NavigationItem[] = [
  { label: "Home", href: "/home" },
  { label: "About", href: "/about" },
  { label: "Membership", href: "/membership" },
  { label: "Founder", href: "/founder" },
  { label: "Insights", href: "/insights" },
  { label: "Contact", href: "/contact" }
];

const memberNavigation: NavigationItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Circle Blueprint", href: "/blueprint" },
  { label: "Community", href: "/community" },
  { label: "Messages", href: "/messages" },
  { label: "Directory", href: "/directory" },
  { label: "Events", href: "/events" },
  { label: "Calls", href: "/calls" },
  { label: "Resources", href: "/dashboard/resources" },
  { label: "Wins", href: "/wins" },
  { label: "BCN Intelligence", href: "/member/bcn-updates" },
  { label: "Profile", href: "/profile" },
  { label: "Inner Circle", href: "/inner-circle", requiresTier: "INNER_CIRCLE" },
  { label: "Founder | Trev", href: "/member/growth-architect" }
];

const adminNavigation: NavigationItem[] = [
  { label: "Overview", href: "/admin" },
  { label: "Blueprint Manager", href: "/admin/blueprint" },
  { label: "Members", href: "/admin/members" },
  { label: "Community", href: "/admin/community" },
  { label: "Messages", href: "/admin/messages" },
  { label: "Wins", href: "/admin/wins" },
  { label: "Resources", href: "/admin/resources" },
  { label: "Events", href: "/admin/events" },
  { label: "Calling", href: "/admin/calling" },
  { label: "Revenue", href: "/admin/revenue" },
  { label: "Products & Pricing", href: "/admin/products-pricing" },
  { label: "Email Test Centre", href: "/admin/email-test-centre" },
  { label: "Security", href: "/admin/security" },
  { label: "System Health", href: "/admin/system-health" },
  { label: "Founding Launch", href: "/admin/founding" },
  { label: "Site Content", href: "/admin/site-content" },
  { label: "Visual Media", href: "/admin/visual-media" },
  { label: "Channels", href: "/admin/channels" },
  { label: "Founder Services", href: "/admin/founder-services" }
];

export const SITE_CONFIG: SiteConfig = {
  name: "The Business Circle Network",
  shortName: "Business Circle",
  description:
    `${PUBLIC_TRUST_PHRASE} for owners who want better structure, stronger relationships, and steadier momentum.`,
  url: CANONICAL_SITE_URL,
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
