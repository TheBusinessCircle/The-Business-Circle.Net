import { isBcnV2Enabled } from "@/lib/bcn-v2/flags";
import type { NavigationItem, SiteConfig } from "@/types";
import { PUBLIC_TRUST_PHRASE } from "@/config/legal";
import { CANONICAL_SITE_URL } from "@/config/site-constants";

const publicNavigation: NavigationItem[] = [
  { label: "Home", href: "/home" },
  { label: "About", href: "/about" },
  { label: "Membership", href: "/membership" },
  { label: "Circle Card", href: "/circle-card" },
  { label: "Founder Audit", href: "/audit" },
  { label: "Founder", href: "/founder" },
  { label: "Insights", href: "/insights" },
  { label: "Contact", href: "/contact" }
];

const memberNavigation: NavigationItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "My Circle Card", href: "/dashboard/circle-card" },
  { label: "Community", href: "/community" },
  { label: "Messages", href: "/messages" },
  { label: "Directory", href: "/directory" },
  { label: "Events", href: "/events" },
  { label: "Calls", href: "/calls" },
  { label: "Resources", href: "/dashboard/resources" },
  { label: "Wins", href: "/wins" },
  { label: "BCN Intelligence", href: "/member/bcn-updates" },
  { label: "Inner Circle", href: "/inner-circle", requiresTier: "INNER_CIRCLE" },
  { label: "Core", href: "/core", requiresTier: "CORE" },
  { label: "Founder | Trev", href: "/member/growth-architect" },
  { label: "Contact", href: "/member/contact" },
  { label: "Circle Blueprint", href: "/blueprint" },
  { label: "Profile", href: "/profile" }
];

const adminNavigation: NavigationItem[] = [
  { label: "Overview", href: "/admin" },
  { label: "Launch Command", href: "/admin/launch" },
  { label: "Launch Codes", href: "/admin/launch-codes" },
  { label: "Blueprint Manager", href: "/admin/blueprint" },
  { label: "Members", href: "/admin/members" },
  { label: "Lead Generation", href: "/admin/lead-generation" },
  { label: "Growth Intelligence", href: "/admin/growth-intelligence" },
  { label: "BCN Intelligence", href: "/admin/intelligence" },
  { label: "Circle Card", href: "/admin/circle-card" },
  { label: "Circle Card Moderation", href: "/admin/circle-card/moderation" },
  { label: "Community Safety", href: "/admin/community" },
  { label: "Emails", href: "/admin/emails" },
  { label: "Messages", href: "/admin/messages" },
  { label: "Wins", href: "/admin/wins" },
  { label: "Testimonials", href: "/admin/testimonials" },
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
    isBcnV2Enabled() ? "Real help for real business owners. Free business tools, practical guidance and useful connections for UK small businesses." : `${PUBLIC_TRUST_PHRASE} for UK business owners who want better conversations, clearer thinking, trusted relationships, and a calmer place to make better decisions.`,
  url: CANONICAL_SITE_URL,
  supportEmail: process.env.PUBLIC_CONTACT_EMAIL?.trim() || "contact@thebusinesscircle.net",
  publicNavigation,
  memberNavigation,
  adminNavigation: isBcnV2Enabled() ? [{label:"BCN Help & Revenue",href:"/admin/bcn-help"},{label:"Practical help moderation",href:"/admin/bcn-ideas"},{label:"Publication queue",href:"/admin/bcn-content"},...adminNavigation.filter(i=>!i.href.startsWith("/admin/circle-card"))] : adminNavigation,
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
    defaultTitle: isBcnV2Enabled() ? "Real help for real business owners | The Business Circle" : "The Business Circle Network",
    shareImagePath: isBcnV2Enabled() ? "/bcn-v2-share.png" : "/social-share.png",
    shareImageAlt:
      isBcnV2Enabled() ? "The Business Circle: real help for real business owners" : "The Business Circle Network social preview for a private founder ecosystem"
  }
};
