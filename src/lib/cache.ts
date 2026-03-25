import type { SiteContentSlug } from "@/config/site-content";

export const CACHE_TAGS = {
  siteContent: "site-content",
  publicTrust: "public-trust",
  adminMetrics: "admin-metrics",
  adminLiveSnapshot: "admin-live-snapshot"
} as const;

export function siteContentTag(slug: SiteContentSlug) {
  return `${CACHE_TAGS.siteContent}:${slug}`;
}
