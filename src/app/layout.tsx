import type { Metadata } from "next";
import { Sora, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import { CookieConsent } from "@/components/privacy/cookie-consent";
import { Providers } from "@/components/providers";
import { SITE_CONFIG } from "@/config/site";
import { getBackgroundModeInitScript } from "@/lib/background-mode";
import "./globals.css";

const display = Sora({
  subsets: ["latin"],
  variable: "--font-sora"
});

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta"
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  title: {
    default: SITE_CONFIG.seo.defaultTitle,
    template: SITE_CONFIG.seo.titleTemplate
  },
  description: SITE_CONFIG.description,
  openGraph: {
    title: SITE_CONFIG.seo.defaultTitle,
    description: SITE_CONFIG.description,
    url: SITE_CONFIG.url,
    siteName: SITE_CONFIG.name,
    type: "website",
    images: [
      {
        url: new URL("/opengraph-image", SITE_CONFIG.url).toString(),
        width: 1200,
        height: 630,
        alt: `${SITE_CONFIG.name} preview`
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_CONFIG.seo.defaultTitle,
    description: SITE_CONFIG.description,
    images: [new URL("/opengraph-image", SITE_CONFIG.url).toString()]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${display.variable} ${sans.variable} font-sans bg-background text-foreground`}
      >
        <Script id="background-mode-init" strategy="beforeInteractive">
          {getBackgroundModeInitScript()}
        </Script>
        <Providers>{children}</Providers>
        <CookieConsent />
      </body>
    </html>
  );
}
