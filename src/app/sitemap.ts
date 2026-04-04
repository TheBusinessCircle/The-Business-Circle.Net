import type { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/config/site";
import {
  listInsightTopicClusters,
  listPublicInsights
} from "@/server/insights/insight.service";
import { listActiveFounderServices } from "@/server/founder";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_CONFIG.url,
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
      url: `${SITE_CONFIG.url}/join`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9
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

  try {
    const insights = listPublicInsights();
    const clusters = listInsightTopicClusters();
    const services = await listActiveFounderServices();

    return [
      ...staticRoutes,
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
    return staticRoutes;
  }
}
