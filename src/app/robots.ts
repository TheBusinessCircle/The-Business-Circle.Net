import type { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/config/site";

const PUBLIC_ALLOW = [
  "/",
  "/home",
  "/about",
  "/membership",
  "/audit",
  "/insights",
  "/contact",
  "/faq",
  "/rules",
  "/privacy-policy",
  "/terms-of-service",
  "/cookie-policy",
  "/dpia",
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

export default function robots(): MetadataRoute.Robots {
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
