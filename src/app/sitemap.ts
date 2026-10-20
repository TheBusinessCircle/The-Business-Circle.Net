import { isBcnV2Enabled } from "@/lib/bcn-v2/flags";
import { tools } from "@/lib/bcn-v2/catalogue";
import { guides } from "@/lib/bcn-v2/guides";
import type { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/config/site";
import { PUBLIC_INTENT_PAGE_ROUTES } from "@/config/public-intent-pages";
import {
  listInsightTopicClusters,
  listPublicInsights
} from "@/server/insights/insight.service";
import { listActiveFounderServices } from "@/server/founder";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  if (isBcnV2Enabled()) {
    const routes = ["/", "/start", "/ideas", "/tools", "/advice", "/find-help", "/connections", "/business-directory", "/about", "/how-we-work", "/faq", "/contact", "/membership", "/privacy-policy", "/terms-of-service", "/cookie-policy", "/rules", "/insights", ...PUBLIC_INTENT_PAGE_ROUTES, ...tools.map(t=>`/tools/${t.slug}`), ...guides.map(g=>`/advice/${g.slug}`), ...listPublicInsights().map(i=>`/insights/${i.slug}`), ...listInsightTopicClusters().map(c=>c.href)];
    return routes.map(path=>({url:`${SITE_CONFIG.url}${path}`,changeFrequency:"monthly" as const,priority:path==="/"?1:0.7}));
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
