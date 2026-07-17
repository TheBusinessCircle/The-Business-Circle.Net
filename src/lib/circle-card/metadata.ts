import type { Metadata } from "next";
import type { RuntimeBrandKey } from "@/config/runtime-brand";
import { SITE_CONFIG } from "@/config/site";

export const CIRCLE_CARD_APP_NAME = "Circle Card";
export const CIRCLE_CARD_APP_SHORT_NAME = "Circle Card";
export const CIRCLE_CARD_APP_DESCRIPTION =
  "Create your public Circle Card, manage Circle Wallet, and keep relationship tools close.";
export const CIRCLE_CARD_MANIFEST_PATH = "/circle-card.webmanifest";
export const CIRCLE_CARD_ICON_192 = "/circle-card-icon-192.png";
export const CIRCLE_CARD_ICON_512 = "/circle-card-icon-512.png";
export const CIRCLE_CARD_APPLE_TOUCH_ICON = "/circle-card-apple-touch-icon.png";
export const CIRCLE_CARD_THEME_COLOR = "#0b1f4f";
export const CIRCLE_CARD_BACKGROUND_COLOR = "#070e1f";

export function getRuntimeManifestPath(runtimeBrand: RuntimeBrandKey) {
  return runtimeBrand === "circle-card"
    ? CIRCLE_CARD_MANIFEST_PATH
    : "/manifest.webmanifest";
}

export const CIRCLE_CARD_PWA_METADATA: Metadata = {
  applicationName: CIRCLE_CARD_APP_NAME,
  manifest: CIRCLE_CARD_MANIFEST_PATH,
  title: {
    default: CIRCLE_CARD_APP_NAME,
    template: `%s | ${CIRCLE_CARD_APP_NAME}`
  },
  icons: {
    icon: [
      { url: CIRCLE_CARD_ICON_192, sizes: "192x192", type: "image/png" },
      { url: CIRCLE_CARD_ICON_512, sizes: "512x512", type: "image/png" }
    ],
    apple: [
      { url: CIRCLE_CARD_APPLE_TOUCH_ICON, sizes: "180x180", type: "image/png" }
    ]
  },
  appleWebApp: {
    capable: true,
    title: CIRCLE_CARD_APP_NAME,
    statusBarStyle: "black-translucent"
  },
  openGraph: {
    siteName: CIRCLE_CARD_APP_NAME
  }
};

type CircleCardPageMetadataInput = {
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

export function createCircleCardPageMetadata(input: CircleCardPageMetadataInput): Metadata {
  const canonicalPath = normalizePath(input.path);
  const canonicalUrl = new URL(canonicalPath, SITE_CONFIG.url).toString();
  const imageUrl = new URL(CIRCLE_CARD_ICON_512, SITE_CONFIG.url).toString();

  return {
    ...CIRCLE_CARD_PWA_METADATA,
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
      siteName: CIRCLE_CARD_APP_NAME,
      images: [
        {
          url: imageUrl,
          secureUrl: imageUrl,
          width: 512,
          height: 512,
          alt: "Circle Card app icon",
          type: "image/png"
        }
      ]
    },
    twitter: {
      card: "summary",
      title: input.title,
      description: input.description,
      images: [imageUrl]
    },
    robots: input.noIndex
      ? {
          index: false,
          follow: false
        }
      : undefined
  };
}
