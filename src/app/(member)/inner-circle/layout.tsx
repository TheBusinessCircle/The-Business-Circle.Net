import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_CONFIG } from "@/config/site";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url)
};

export default async function InnerCircleLayout({
  children
}: {
  children: ReactNode;
}) {
  await requireUser();

  return <div className="space-y-6">{children}</div>;
}
