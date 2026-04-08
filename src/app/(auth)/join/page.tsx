import type { Metadata } from "next";
import { MembershipTier } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { JoinCheckoutPrep } from "@/components/auth/join-checkout-prep";
import { createPageMetadata } from "@/lib/seo";
import { roleToTier } from "@/lib/permissions";
import { db } from "@/lib/db";
import {
  resolveBillingIntervalFromPriceId,
  resolveMembershipBillingInterval,
  resolveMembershipTierInput
} from "@/config/membership";
import { getFoundingOfferSnapshot } from "@/server/founding";
import { buildAuthModeRedirect, firstValue } from "@/lib/join/routing";

type JoinPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Join The Business Circle",
  description:
    "Confirm your selected membership tier, review current pricing, and continue into secure sign-up or checkout.",
  keywords: [
    "join business circle",
    "business circle pricing",
    "business owner membership checkout",
    "founders membership offer",
    "private business network join"
  ],
  path: "/join"
});

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const params = await searchParams;
  const from = firstValue(params.from);
  const error = firstValue(params.error);
  const mode = firstValue(params.mode);
  const authMode = firstValue(params.auth);
  const billing = firstValue(params.billing);
  const inviteCode = (firstValue(params.invite) ?? "").trim().toUpperCase() || undefined;
  const coreAccessConfirmed = firstValue(params.coreAccessConfirmed) === "1";

  if (mode === "signin") {
    redirect(buildAuthModeRedirect({ from, error }));
  }

  const selectedTier = resolveMembershipTierInput(firstValue(params.tier));
  const billingInterval = resolveMembershipBillingInterval(
    firstValue(params.period) ?? firstValue(params.interval)
  );
  const session = await auth();
  const currentTier = session?.user
    ? roleToTier(session.user.role, session.user.membershipTier)
    : MembershipTier.FOUNDATION;

  const [foundingOffer, currentSubscription] = await Promise.all([
    getFoundingOfferSnapshot(),
    session?.user
      ? db.subscription.findUnique({
          where: {
            userId: session.user.id
          },
          select: {
            stripePriceId: true
          }
        })
      : Promise.resolve(null)
  ]);

  const currentBillingInterval = currentSubscription?.stripePriceId
    ? resolveBillingIntervalFromPriceId(currentSubscription.stripePriceId)
    : null;
  const foundingOfferByTier = {
    FOUNDATION: foundingOffer.foundation,
    INNER_CIRCLE: foundingOffer.innerCircle,
    CORE: foundingOffer.core
  } as const;

  return (
    <div className="space-y-6 pb-16">
      {billing === "cancelled" ? (
        <p className="rounded-2xl border border-border bg-card/70 px-4 py-3 text-sm text-muted">
          Stripe checkout was cancelled. Your selected room is still here and ready when you want to continue.
        </p>
      ) : null}

      <JoinCheckoutPrep
        initialSelectedTier={selectedTier}
        initialBillingInterval={billingInterval}
        initialCoreAccessConfirmed={coreAccessConfirmed}
        initialShowAccountSetup={authMode === "register" || Boolean(inviteCode)}
        billing={billing}
        from={from}
        inviteCode={inviteCode}
        isAuthenticated={Boolean(session?.user)}
        hasActiveSubscription={session?.user?.hasActiveSubscription ?? false}
        currentTier={currentTier}
        currentBillingInterval={currentBillingInterval}
        foundingOfferByTier={foundingOfferByTier}
      />
    </div>
  );
}
