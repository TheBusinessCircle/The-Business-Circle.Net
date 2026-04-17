import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Join2CinematicEntry } from "@/components/auth/join2-cinematic-entry";
import { createPageMetadata } from "@/lib/seo";
import {
  buildAuthModeRedirect,
  firstValue,
  resolveBillingInterval,
  resolveTier
} from "@/lib/join/routing";

type JoinMobilePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Join The Business Circle",
  description:
    "Enter The Business Circle through the cinematic mobile entry, then continue into guided membership or direct join.",
  keywords: [
    "join business circle",
    "business circle portal",
    "business owner membership",
    "founder network membership",
    "private business network"
  ],
  path: "/join-mobile",
  noIndex: true
});

export default async function JoinMobilePage({ searchParams }: JoinMobilePageProps) {
  const params = await searchParams;
  const from = firstValue(params.from);
  const error = firstValue(params.error);
  const mode = firstValue(params.mode);

  if (mode === "signin") {
    redirect(buildAuthModeRedirect({ from, error }));
  }

  return (
    <Join2CinematicEntry
      initialSelectedTier={resolveTier(firstValue(params.tier))}
      billingInterval={resolveBillingInterval(firstValue(params.period) ?? firstValue(params.interval))}
      from={from}
      inviteCode={firstValue(params.invite)}
      error={error}
      billing={firstValue(params.billing)}
    />
  );
}
