import type { Metadata } from "next";
import { MembershipTier } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { JoinCheckoutPrep } from "@/components/auth/join-checkout-prep";
import { createPageMetadata } from "@/lib/seo";
import { roleToTier } from "@/lib/permissions";
import { db } from "@/lib/db";
import {
  MEMBERSHIP_PAGE_MICROCOPY,
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
    <div className="space-y-10 pb-16">
      {billing === "cancelled" ? (
        <p className="rounded-2xl border border-border bg-card/70 px-4 py-3 text-sm text-muted">
          Stripe checkout was cancelled. Your selected room is still here and ready when you want to continue.
        </p>
      ) : null}

      <section className="grid gap-6 rounded-[2rem] border border-white/10 bg-card/55 px-6 py-8 shadow-panel sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(260px,0.92fr)]">
        <div className="space-y-5">
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Join The Business Circle</p>
            <h1 className="font-display text-4xl text-foreground sm:text-5xl">
              Sign up properly, with the right room already in place.
            </h1>
            <p className="max-w-3xl text-lg leading-relaxed text-muted">
              Review the current pricing, change tier or billing period if needed, then continue into secure sign-up or checkout.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {MEMBERSHIP_PAGE_MICROCOPY.map((line) => (
              <div
                key={line}
                className="rounded-2xl border border-white/8 bg-background/20 px-4 py-4 text-sm text-muted"
              >
                {line}
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-[1.8rem] border border-gold/20 bg-gradient-to-br from-gold/10 via-background/20 to-background/10 p-5 shadow-gold-soft sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.08em] text-gold">This page is for action</p>
          <h2 className="mt-3 font-display text-3xl text-foreground">Choose, confirm, continue.</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            If you still want guidance, you can move back to the membership page. If you already know your room, everything needed to continue is here.
          </p>
        </aside>
      </section>

      <JoinCheckoutPrep
        initialSelectedTier={selectedTier}
        initialBillingInterval={billingInterval}
        initialCoreAccessConfirmed={coreAccessConfirmed}
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
