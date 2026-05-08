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

export const SOCIAL_SHARE_IMAGE = {
  path: SITE_CONFIG.seo.shareImagePath,
  width: 1200,
  height: 630,
  type: "image/png",
  alt: SITE_CONFIG.seo.shareImageAlt
} as const;

export function getSocialShareImageUrl(): string {
  return new URL(SOCIAL_SHARE_IMAGE.path, SITE_CONFIG.url).toString();
}

export function getOpenGraphShareImage() {
  const url = getSocialShareImageUrl();

  return {
    url,
    secureUrl: url,
    width: SOCIAL_SHARE_IMAGE.width,
    height: SOCIAL_SHARE_IMAGE.height,
    alt: SOCIAL_SHARE_IMAGE.alt,
    type: SOCIAL_SHARE_IMAGE.type
  };
}

export function getTwitterShareImage() {
  const url = getSocialShareImageUrl();

  return {
    url,
    secureUrl: url,
    width: SOCIAL_SHARE_IMAGE.width,
    height: SOCIAL_SHARE_IMAGE.height,
    alt: SOCIAL_SHARE_IMAGE.alt,
    type: SOCIAL_SHARE_IMAGE.type
  };
}

export function createPageMetadata(input: PageMetadataInput): Metadata {
  const canonicalPath = normalizePath(input.path);
  const canonicalUrl = new URL(canonicalPath, SITE_CONFIG.url).toString();
  const openGraphImage = getOpenGraphShareImage();
  const twitterImage = getTwitterShareImage();

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
      images: [openGraphImage]
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [twitterImage]
    },
    robots: input.noIndex
      ? {
          index: false,
          follow: false
        }
      : undefined
  };
}
