import type { Metadata } from "next";
import { SeoIntentPage } from "@/components/public/seo-intent-page";
import { PUBLIC_INTENT_PAGES } from "@/config/public-intent-pages";
import { createPageMetadata } from "@/lib/seo";

const page = PUBLIC_INTENT_PAGES.founderCommunityUk;

export const metadata: Metadata = createPageMetadata({
  title: page.metaTitle,
  description: page.description,
  path: page.path,
  keywords: page.keywords
});

export default function FounderCommunityUkPage() {
  return <SeoIntentPage page={page} />;
}
