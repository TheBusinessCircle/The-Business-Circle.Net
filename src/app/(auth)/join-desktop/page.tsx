import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { JoinCinematicEntry } from "@/components/auth/join-cinematic-entry";
import { createPageMetadata } from "@/lib/seo";
import {
  buildAuthModeRedirect,
  firstValue,
  resolveBillingInterval,
  resolveTier
} from "@/lib/join/routing";

type JoinDesktopPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Join The Business Circle",
  description:
    "Step inside The Business Circle through the cinematic entry, then move naturally into membership guidance or direct join.",
  keywords: [
    "join business circle",
    "private business network",
    "founder led business ecosystem",
    "business owner membership",
    "inner circle membership"
  ],
  path: "/join-desktop"
});

export default async function JoinDesktopPage({ searchParams }: JoinDesktopPageProps) {
  const params = await searchParams;
  const from = firstValue(params.from);
  const error = firstValue(params.error);
  const mode = firstValue(params.mode);

  if (mode === "signin") {
    redirect(buildAuthModeRedirect({ from, error }));
  }

  return (
    <JoinCinematicEntry
      initialSelectedTier={resolveTier(firstValue(params.tier))}
      billingInterval={resolveBillingInterval(firstValue(params.period) ?? firstValue(params.interval))}
      from={from}
      inviteCode={firstValue(params.invite)}
      error={error}
      billing={firstValue(params.billing)}
    />
  );
}
