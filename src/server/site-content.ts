import "server-only";

import { unstable_cache } from "next/cache";
import {
  siteContentDefaults,
  type SiteContentSlug,
  type SiteContentValueMap
} from "@/config/site-content";
import { CACHE_TAGS, siteContentTag } from "@/lib/cache";
import { db } from "@/lib/db";
import {
  isRecoverableDatabaseError,
  logRecoverableDatabaseFallback
} from "@/lib/db-errors";
import { normalizeSiteContentSections } from "@/lib/site-content";

async function fetchSiteContentSection<K extends SiteContentSlug>(
  slug: K
): Promise<SiteContentValueMap[K]> {
  try {
    const page = await db.siteContent.findUnique({
      where: { slug },
      select: { sections: true }
    });

    return normalizeSiteContentSections(slug, page?.sections);
  } catch (error) {
    if (!isRecoverableDatabaseError(error)) {
      throw error;
    }

    logRecoverableDatabaseFallback("site-content", error);
    return siteContentDefaults[slug];
  }
}

export async function getSiteContentSection<K extends SiteContentSlug>(
  slug: K
): Promise<SiteContentValueMap[K]> {
  const getCachedSection = unstable_cache(
    async () => fetchSiteContentSection(slug),
    [CACHE_TAGS.siteContent, slug],
    {
      tags: [CACHE_TAGS.siteContent, siteContentTag(slug)]
    }
  );

  return getCachedSection();
}
