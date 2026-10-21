import { isBcnV2Enabled } from "@/lib/bcn-v2/flags";
import { Connections } from "@/components/bcn-v2/info-pages";
import type { Metadata } from "next";
import { SeoIntentPage } from "@/components/public/seo-intent-page";
import { PUBLIC_INTENT_PAGES } from "@/config/public-intent-pages";
import { createPageMetadata } from "@/lib/seo";

const page = PUBLIC_INTENT_PAGES.businessOwnerNetworkUk;

export const metadata: Metadata = createPageMetadata({
  title: isBcnV2Enabled() ? "Free Business Connections for UK Owners" : page.metaTitle,
  description: isBcnV2Enabled() ? "Free business profiles, a moderated directory and permission-based introductions for UK business owners." : page.description,
  path: page.path,
  keywords: page.keywords
});

export default function BusinessOwnerNetworkUkPage() {
  if(isBcnV2Enabled()) return <Connections/>;
  return <SeoIntentPage page={page} />;
}
