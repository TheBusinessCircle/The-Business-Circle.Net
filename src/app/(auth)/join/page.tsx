import type { Metadata } from "next";
import Link from "next/link";
import { MembershipTier } from "@prisma/client";
import { ArrowRight, LockKeyhole, RefreshCcw, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { JoinCheckoutPrep } from "@/components/auth/join-checkout-prep";
import { JourneyRail } from "@/components/public";
import { buttonVariants } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

type JoinPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Join The Business Circle",
  description:
    "Confirm your selected room, review current pricing, continue into secure Stripe checkout, and complete access after payment is confirmed.",
  keywords: [
    "join business circle",
    "business owner membership checkout",
    "private business network join",
    "membership for business owners",
    "founder-led business network"
  ],
  path: "/join",
  noIndex: true
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
    <div className="space-y-8 pb-16">
      <section className="relative overflow-hidden rounded-[2.2rem] border border-white/10 bg-card/55 px-6 py-8 shadow-panel sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
        <div className="pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-full bg-silver/10 blur-[96px]" />
        <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-gold/14 blur-[120px]" />

        <div className="relative space-y-6">
          <JourneyRail
            currentStep="join"
            note="Selection, secure checkout, and post-payment access setup stay connected in one path."
            nextAction={{ href: "/membership", label: "Review Membership Again" }}
          />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.84fr)] xl:items-start">
            <div className="space-y-5">
              <div className="space-y-4">
                <p className="premium-kicker">Join The Business Circle</p>
                <h1 className="max-w-4xl font-display text-4xl leading-tight text-foreground sm:text-5xl">
                  Confirm the room, then complete secure checkout.
                </h1>
                <p className="max-w-3xl text-lg leading-relaxed text-muted">
                  This page keeps room selection, pricing clarity, secure Stripe billing, and
                  post-payment member access in one calm flow. You can still move between tiers as
                  the business evolves, and founder pricing only applies where it is currently active.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/membership"
                  className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
                >
                  Review Membership
                </Link>
                <Link
                  href="/about"
                  className={cn(buttonVariants({ size: "lg" }), "group w-full sm:w-auto")}
                >
                  Read Why It Exists
                  <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>

            <div className="grid gap-3">
              {[
                {
                  icon: RefreshCcw,
                  title: "Choose for the current stage",
                  copy: "Pick the room that fits now. You can adjust later as the business evolves."
                },
                {
                  icon: LockKeyhole,
                  title: "Pricing stays clear",
                  copy: "Annual billing saves 20%, and the selected billing interval carries straight into checkout."
                },
                {
                  icon: ShieldCheck,
                  title: "Access opens after payment",
                  copy: "Billing is completed securely in Stripe, and member access only opens after payment is confirmed."
                }
              ].map((item) => (
                <article
                  key={item.title}
                  className="rounded-[1.55rem] border border-white/10 bg-background/22 p-4"
                >
                  <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <item.icon size={16} className="text-gold" />
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {billing === "cancelled" ? (
        <p className="rounded-2xl border border-border bg-card/70 px-4 py-3 text-sm text-muted">
          Stripe checkout was cancelled. No member account was created, and your selected room is
          still here when you want to continue.
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

      <section className="rounded-[2rem] border border-white/10 bg-card/52 px-6 py-7 shadow-panel sm:px-8 sm:py-8">
        <div className="max-w-3xl space-y-4">
          <p className="premium-kicker">Clarity before checkout</p>
          <h2 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
            A clean route from room selection to access.
          </h2>
          <p className="text-base leading-relaxed text-muted">
            The aim here is a clean decision, not a perfect prediction. Pick the room that matches
            the business now, move through setup with confidence, and let the membership deepen only
            when the business genuinely needs it.
          </p>
        </div>
      </section>
    </div>
  );
}
