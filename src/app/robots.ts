import type { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/config/site";
import { getRuntimeBrand } from "@/config/runtime-brand";

export const dynamic = "force-dynamic";

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

export default function robots(): MetadataRoute.Robots {
  const runtimeBrand = getRuntimeBrand();
  if (runtimeBrand.key === "circle-card") {
    return {
      rules: [
        {
          userAgent: "*",
          allow: [
            "/",
            "/pro",
            "/teams",
            "/community-standards",
            "/card/",
            "/r/",
            "/privacy-policy",
            "/terms-of-service",
            "/cookie-policy",
            "/dpia"
          ],
          disallow: [
            "/api",
            "/api/",
            "/app",
            "/app/",
            "/login",
            "/register",
            "/forgot-password",
            "/reset-password"
          ]
        }
      ],
      sitemap: `${runtimeBrand.canonicalOrigin}/sitemap.xml`
    };
  }

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
