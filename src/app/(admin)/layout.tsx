import type { Metadata } from "next";
import { ReactNode } from "react";
import { SITE_CONFIG } from "@/config/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url)
};

export default function AdminRouteGroupLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
