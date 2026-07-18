import type { Metadata } from "next";
import { ReactNode } from "react";
import { AuthAreaShell } from "@/components/shell/area-shells";
import { CircleCardPublicShell } from "@/components/circle-card/circle-card-public-shell";
import { getRuntimeBrand } from "@/config/runtime-brand";
import { getCustomerShellKind } from "@/lib/circle-card/runtime-route-policy";
import {
  CIRCLE_CARD_PWA_METADATA,
  getRuntimeManifestPath
} from "@/lib/circle-card/metadata";

export const dynamic = "force-dynamic";
export function generateMetadata(): Metadata {
  const runtimeBrand = getRuntimeBrand();
  return {
    ...(runtimeBrand.key === "circle-card" ? CIRCLE_CARD_PWA_METADATA : {}),
    metadataBase: new URL(runtimeBrand.canonicalOrigin),
    manifest: getRuntimeManifestPath(runtimeBrand.key),
    robots: {
      index: false,
      follow: false
    }
  };
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  if (getCustomerShellKind(getRuntimeBrand().key) === "circle-card") {
    return <CircleCardPublicShell>{children}</CircleCardPublicShell>;
  }

  return <AuthAreaShell>{children}</AuthAreaShell>;
}
