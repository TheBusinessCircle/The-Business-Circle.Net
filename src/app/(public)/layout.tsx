import type { Metadata } from "next";
import { ReactNode } from "react";
import { JsonLd } from "@/components/public";
import { PublicSiteShell } from "@/components/public/public-site-shell";
import { SITE_CONFIG } from "@/config/site";
import { getSiteContentSection } from "@/lib/site-content";
import { buildPublicSiteSchemaGraph } from "@/lib/structured-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url)
};

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const footerContent = await getSiteContentSection("footer");

  return (
    <>
      <JsonLd data={buildPublicSiteSchemaGraph({ supportEmail: footerContent.supportEmail })} />
      <PublicSiteShell>{children}</PublicSiteShell>
    </>
  );
}
