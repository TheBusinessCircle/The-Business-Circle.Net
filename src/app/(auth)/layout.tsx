import type { Metadata } from "next";
import { ReactNode } from "react";
import { AuthAreaShell } from "@/components/shell/area-shells";
import { SITE_CONFIG } from "@/config/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url)
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthAreaShell>{children}</AuthAreaShell>;
}
