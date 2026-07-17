import type { Metadata, Viewport } from "next";
import { Sora, Plus_Jakarta_Sans } from "next/font/google";
import { CookieConsent } from "@/components/privacy/cookie-consent";
import { Providers } from "@/components/providers";
import { getRuntimeBrand } from "@/config/runtime-brand";
import { SITE_CONFIG } from "@/config/site";
import { getOpenGraphShareImage, getTwitterShareImage } from "@/lib/seo";
import "./globals.css";

const display = Sora({
  subsets: ["latin"],
  variable: "--font-sora"
});

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta"
});

const openGraphShareImage = getOpenGraphShareImage();
const twitterShareImage = getTwitterShareImage();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#070e1f" },
    { media: "(prefers-color-scheme: light)", color: "#0b1f4f" }
  ]
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  applicationName: SITE_CONFIG.name,
  manifest: "/manifest.webmanifest",
  title: {
    default: SITE_CONFIG.seo.defaultTitle,
    template: SITE_CONFIG.seo.titleTemplate
  },
  description: SITE_CONFIG.description,
  alternates: {
    canonical: "/"
  },
  authors: [{ name: SITE_CONFIG.name, url: SITE_CONFIG.url }],
  creator: SITE_CONFIG.name,
  publisher: SITE_CONFIG.name,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ]
  },
  appleWebApp: {
    capable: true,
    title: SITE_CONFIG.shortName,
    statusBarStyle: "black-translucent"
  },
  formatDetection: {
    telephone: true
  },
  openGraph: {
    title: SITE_CONFIG.seo.defaultTitle,
    description: SITE_CONFIG.description,
    url: SITE_CONFIG.url,
    siteName: SITE_CONFIG.name,
    type: "website",
    images: [openGraphShareImage]
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_CONFIG.seo.defaultTitle,
    description: SITE_CONFIG.description,
    images: [twitterShareImage]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large"
    }
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const runtimeBrand = getRuntimeBrand().key;

  return (
    <html lang="en-GB" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${display.variable} ${sans.variable} font-sans bg-background text-foreground`}
      >
        <Providers runtimeBrand={runtimeBrand}>{children}</Providers>
        <CookieConsent />
      </body>
    </html>
  );
}
