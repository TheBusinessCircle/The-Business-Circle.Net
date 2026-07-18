import type { Metadata } from "next";
import { ReactNode, Suspense } from "react";
import { FirstPartyAnalytics } from "@/components/analytics/first-party-analytics";
import { JsonLd } from "@/components/public";
import { PublicSiteShell } from "@/components/public/public-site-shell";
import { CircleCardPublicShell } from "@/components/circle-card/circle-card-public-shell";
import { getRuntimeBrand } from "@/config/runtime-brand";
import { getCustomerShellKind } from "@/lib/circle-card/runtime-route-policy";
import {
  CIRCLE_CARD_PWA_METADATA,
  getRuntimeManifestPath
} from "@/lib/circle-card/metadata";
import { SITE_CONFIG } from "@/config/site";
import { buildPublicSiteSchemaGraph } from "@/lib/structured-data";

export const dynamic = "force-dynamic";
export function generateMetadata(): Metadata {
  const runtimeBrand = getRuntimeBrand();
  if (runtimeBrand.key === "circle-card") {
    return {
      ...CIRCLE_CARD_PWA_METADATA,
      metadataBase: new URL(runtimeBrand.canonicalOrigin),
      manifest: getRuntimeManifestPath(runtimeBrand.key)
    };
  }

  return {
    metadataBase: new URL(runtimeBrand.canonicalOrigin),
    manifest: getRuntimeManifestPath(runtimeBrand.key)
  };
}

export default async function PublicLayout({ children }: { children: ReactNode }) {
  if (getCustomerShellKind(getRuntimeBrand().key) === "circle-card") {
    return (
      <>
        <Suspense fallback={null}>
          <FirstPartyAnalytics />
        </Suspense>
        <CircleCardPublicShell>{children}</CircleCardPublicShell>
      </>
    );
  }

  return (
    <>
      <JsonLd data={buildPublicSiteSchemaGraph({ supportEmail: SITE_CONFIG.supportEmail })} />
      <Suspense fallback={null}>
        <FirstPartyAnalytics />
      </Suspense>
      <PublicSiteShell>{children}</PublicSiteShell>
    </>
  );
}
