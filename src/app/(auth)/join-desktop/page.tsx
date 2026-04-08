import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { JoinCinematicEntry } from "@/components/auth/join-cinematic-entry";
import {
  buildAuthModeRedirect,
  firstValue,
  resolveBillingInterval,
  resolveTier
} from "@/lib/join/routing";
import { createPageMetadata } from "@/lib/seo";

type JoinDesktopPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Join The Business Circle",
  description:
    "Step inside The Business Circle, a premium founder-led business ecosystem for serious owners who want a calmer, stronger room to grow inside.",
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
  const billing = firstValue(params.billing);
  const billingInterval = resolveBillingInterval(firstValue(params.interval));
  const selectedTier = resolveTier(firstValue(params.tier));
  const inviteCode = (firstValue(params.invite) ?? "").trim().toUpperCase();

  if (mode === "signin") {
    redirect(buildAuthModeRedirect({ from, error }));
  }

  return (
    <JoinCinematicEntry
      initialSelectedTier={selectedTier}
      billingInterval={billingInterval}
      from={from}
      inviteCode={inviteCode || undefined}
      error={error}
      billing={billing}
    />
  );
}
