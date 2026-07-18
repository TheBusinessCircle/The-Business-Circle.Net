import type { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/config/site";
import { getRuntimeBrand } from "@/config/runtime-brand";
import { PUBLIC_INTENT_PAGE_ROUTES } from "@/config/public-intent-pages";
import {
  listInsightTopicClusters,
  listPublicInsights
} from "@/server/insights/insight.service";
import { listActiveFounderServices } from "@/server/founder";

export const dynamic = "force-dynamic";

const CIRCLE_CARD_PUBLIC_ROUTES = [
  "/",
  "/pro",
  "/teams",
  "/community-standards",
  "/privacy-policy",
  "/terms-of-service",
  "/cookie-policy",
  "/dpia"
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const runtimeBrand = getRuntimeBrand();

  if (runtimeBrand.key === "circle-card") {
    return CIRCLE_CARD_PUBLIC_ROUTES.map((path) => ({
      url: new URL(path, runtimeBrand.canonicalOrigin).toString(),
      lastModified: now,
      changeFrequency: path === "/" ? "weekly" : "monthly",
      priority: path === "/" ? 1 : 0.6
    }));
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_CONFIG.url}/home`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: `${SITE_CONFIG.url}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8
    },
    {
      url: `${SITE_CONFIG.url}/insights`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.88
    },
    {
      url: `${SITE_CONFIG.url}/membership`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9
    },
    {
      url: `${SITE_CONFIG.url}/audit`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.86
    },
    {
      url: `${SITE_CONFIG.url}/faq`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.65
    },
    {
      url: `${SITE_CONFIG.url}/founder`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9
    },
    {
      url: `${SITE_CONFIG.url}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7
    },
    {
      url: `${SITE_CONFIG.url}/review`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.64
    },
    {
      url: `${SITE_CONFIG.url}/privacy-policy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3
    },
    {
      url: `${SITE_CONFIG.url}/terms-of-service`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3
    },
    {
      url: `${SITE_CONFIG.url}/rules`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3
    },
    {
      url: `${SITE_CONFIG.url}/cookie-policy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3
    },
    {
      url: `${SITE_CONFIG.url}/dpia`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.35
    }
  ];

  const intentRoutes: MetadataRoute.Sitemap = PUBLIC_INTENT_PAGE_ROUTES.map((path) => ({
    url: `${SITE_CONFIG.url}${path}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.78
  }));

  try {
    const insights = listPublicInsights();
    const clusters = listInsightTopicClusters();
    const services = await listActiveFounderServices();

    return [
      ...staticRoutes,
      ...intentRoutes,
      ...clusters.map((cluster) => ({
        url: `${SITE_CONFIG.url}${cluster.href}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.82
      })),
      ...insights.map((insight) => ({
        url: `${SITE_CONFIG.url}/insights/${insight.slug}`,
        lastModified: insight.publishedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8
      })),
      ...services.map((service) => ({
        url: `${SITE_CONFIG.url}/founder/services/${service.slug}`,
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.7
      }))
    ];
  } catch {
    return [...staticRoutes, ...intentRoutes];
  }
}
