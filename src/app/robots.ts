import type { MetadataRoute as HubMetadataRoute } from "next";
import type { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/config/site";

const PUBLIC_ALLOW = [
  "/",
  "/home",
  "/about",
  "/membership",
  "/audit",
  "/founder",
  "/insights",
  "/contact",
  "/review",
  "/testimonial",
  "/testimonial/",
  "/faq",
  "/rules",
  "/privacy-policy",
  "/terms-of-service",
  "/cookie-policy",
  "/dpia",
  "/business-owner-network-uk",
  "/founder-community-uk",
  "/business-networking-uk",
  "/private-business-network",
  "/llms.txt"
] as const;

const PRIVATE_DISALLOW = [
  "/admin",
  "/admin/",
  "/api",
  "/api/",
  "/blueprint",
  "/calls",
  "/community",
  "/core",
  "/dashboard",
  "/directory",
  "/events",
  "/inner-circle",
  "/join",
  "/join-desktop",
  "/join-mobile",
  "/login",
  "/member",
  "/member/",
  "/members",
  "/members/",
  "/messages",
  "/profile",
  "/register",
  "/resources",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/wins"
] as const;

function existingRobots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: [
          "Googlebot",
          "Bingbot",
          "Applebot",
          "GPTBot",
          "ChatGPT-User",
          "PerplexityBot",
          "ClaudeBot",
          "Claude-User",
          "Google-Extended",
          "*"
        ],
        allow: [...PUBLIC_ALLOW],
        disallow: [...PRIVATE_DISALLOW]
      }
    ],
    sitemap: `${SITE_CONFIG.url}/sitemap.xml`
  };
}


// hucknallHubRobots: preserve existing private exclusions and other runtime rules.
export default function robots(): HubMetadataRoute.Robots {
  const original = existingRobots();
  const rules = Array.isArray(original.rules) ? original.rules : [original.rules];
  const maps = original.sitemap ? (Array.isArray(original.sitemap) ? original.sitemap : [original.sitemap]) : [];
  return { ...original, rules: rules.map(rule => ({ ...rule, userAgent: rule.userAgent ?? "*",
    allow: [...new Set([...(Array.isArray(rule.allow) ? rule.allow : rule.allow ? [rule.allow] : []),
      "/card/hucknall-circle-hub", "/card/hucknall-circle-hub/about", "/card/hucknall-circle-hub/sitemap.xml"])],
    disallow: [...new Set([...(Array.isArray(rule.disallow) ? rule.disallow : rule.disallow ? [rule.disallow] : []),
      "/card/hucknall-circle-hub/join"])]
  })), sitemap: [...new Set([...maps, "https://circlecard.co.uk/card/hucknall-circle-hub/sitemap.xml"])] };
}
