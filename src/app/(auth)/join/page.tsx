import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { JoinRouteGateway } from "@/components/auth/join-route-gateway";
import { shouldUseMobileJoin, toSearchParams } from "@/lib/join/routing";
import { createPageMetadata } from "@/lib/seo";

type JoinPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Join The Business Circle",
  description:
    "Use the public join link to enter the right Business Circle join experience for your device.",
  keywords: [
    "join business circle",
    "business circle join",
    "business owner membership",
    "founder network membership",
    "private business network"
  ],
  path: "/join"
});

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const params = await searchParams;
  const headerList = await headers();
  const search = toSearchParams(params).toString();

  if (shouldUseMobileJoin(headerList)) {
    redirect(search ? `/join-mobile?${search}` : "/join-mobile");
  }

  return <JoinRouteGateway search={search} />;
}
