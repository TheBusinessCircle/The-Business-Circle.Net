import type { SiteContentSlug } from "@/config/site-content";

export const CACHE_TAGS = {
  siteContent: "site-content",
  publicTrust: "public-trust",
  adminMetrics: "admin-metrics",
  adminLiveSnapshot: "admin-live-snapshot",
  visualMedia: "visual-media"
} as const;

export function siteContentTag(slug: SiteContentSlug) {
  return `${CACHE_TAGS.siteContent}:${slug}`;
}

export function visualMediaTag(key: string) {
  return `${CACHE_TAGS.visualMedia}:${key}`;
}
