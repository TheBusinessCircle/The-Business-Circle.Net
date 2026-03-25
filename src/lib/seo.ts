import type { Metadata } from "next";
import { SITE_CONFIG } from "@/config/site";

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  noIndex?: boolean;
};

function normalizePath(path: string): string {
  if (!path) {
    return "/";
  }

  return path.startsWith("/") ? path : `/${path}`;
}

export function createPageMetadata(input: PageMetadataInput): Metadata {
  const canonicalPath = normalizePath(input.path);
  const canonicalUrl = new URL(canonicalPath, SITE_CONFIG.url).toString();
  const opengraphImageUrl = new URL("/opengraph-image", SITE_CONFIG.url).toString();

  return {
    metadataBase: new URL(SITE_CONFIG.url),
    title: input.title,
    description: input.description,
    keywords: input.keywords,
    alternates: {
      canonical: canonicalPath
    },
    openGraph: {
      title: input.title,
      description: input.description,
      type: "website",
      url: canonicalUrl,
      siteName: SITE_CONFIG.name,
      images: [
        {
          url: opengraphImageUrl,
          width: 1200,
          height: 630,
          alt: `${SITE_CONFIG.name} preview`
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [opengraphImageUrl]
    },
    robots: input.noIndex
      ? {
          index: false,
          follow: false
        }
      : undefined
  };
}
