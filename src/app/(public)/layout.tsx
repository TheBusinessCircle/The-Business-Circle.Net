import type { Metadata } from "next";
import { ReactNode } from "react";
import { JsonLd } from "@/components/public";
import { PublicSiteShell } from "@/components/public/public-site-shell";
import { SITE_CONFIG } from "@/config/site";
import { buildPublicSiteSchemaGraph } from "@/lib/structured-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url)
};

export default async function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <JsonLd data={buildPublicSiteSchemaGraph({ supportEmail: SITE_CONFIG.supportEmail })} />
      <PublicSiteShell>{children}</PublicSiteShell>
    </>
  );
}
