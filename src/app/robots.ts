import type { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/blueprint",
        "/dashboard",
        "/community",
        "/directory",
        "/events",
        "/calls",
        "/inner-circle",
        "/member",
        "/members",
        "/messages",
        "/profile",
        "/resources",
        "/wins",
        "/login",
        "/register",
        "/sign-in",
        "/sign-up",
        "/forgot-password",
        "/reset-password",
        "/api"
      ]
    },
    sitemap: `${SITE_CONFIG.url}/sitemap.xml`
  };
}
