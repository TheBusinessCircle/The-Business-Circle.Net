import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Join2CinematicEntry } from "@/components/auth/join2-cinematic-entry";
import {
  buildAuthModeRedirect,
  firstValue,
  resolveBillingInterval,
  resolveTier
} from "@/lib/join/routing";
import { createPageMetadata } from "@/lib/seo";

type JoinMobilePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Join The Business Circle",
  description:
    "Enter The Business Circle through a cinematic branded portal and choose whether to explore the world or move straight into membership.",
  keywords: [
    "join business circle",
    "business circle portal",
    "business owner membership",
    "founder network membership",
    "private business network"
  ],
  path: "/join-mobile"
});

export default async function JoinMobilePage({ searchParams }: JoinMobilePageProps) {
  const params = await searchParams;
  const from = firstValue(params.from);
  const error = firstValue(params.error);
  const mode = firstValue(params.mode);
  const billing = firstValue(params.billing);
  const billingInterval = resolveBillingInterval(firstValue(params.interval));
  const selectedTier = resolveTier(firstValue(params.tier));
  const inviteCode = (firstValue(params.invite) ?? "").trim().toUpperCase();

  if (mode === "signin") {
    redirect(buildAuthModeRedirect({ from, error }));
  }

  return (
    <Join2CinematicEntry
      initialSelectedTier={selectedTier}
      billingInterval={billingInterval}
      from={from}
      inviteCode={inviteCode || undefined}
      error={error}
      billing={billing}
    />
  );
}
