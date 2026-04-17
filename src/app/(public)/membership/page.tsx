import type { Metadata } from "next";
import { JsonLd } from "@/components/public";
import { MembershipGuidedSelector } from "@/components/public/membership-guided-selector";
import {
  resolveMembershipBillingInterval,
  resolveMembershipTierInput
} from "@/config/membership";
import {
  firstValue
} from "@/lib/join/routing";
import { createPageMetadata } from "@/lib/seo";
import {
  buildCollectionPageSchema,
  buildFaqSchema
} from "@/lib/structured-data";
import { getFoundingOfferSnapshot } from "@/server/founding";
import { getSiteContentSection } from "@/server/site-content";

export const dynamic = "force-dynamic";

const MEMBERSHIP_KEYWORDS = [
  "business membership UK",
  "business network for owners",
  "private business community UK",
  "business owners network",
  "founder-led business network",
  "entrepreneur community UK",
  "business growth membership",
  "connect with business owners",
  "structured business support",
  "membership for business owners"
] as const;

export const metadata: Metadata = createPageMetadata({
  title: "Membership For Business Owners",
  description:
    "Choose the right room inside a founder-led private business environment for owners. Compare Foundation, Inner Circle, and Core for clearer structure, stronger context, and more controlled momentum.",
  keywords: [...MEMBERSHIP_KEYWORDS],
  path: "/membership"
});

type MembershipPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MembershipPage({ searchParams }: MembershipPageProps) {
  const params = await searchParams;
  const billing = firstValue(params.billing);
  const from = firstValue(params.from);
  const inviteCode = (firstValue(params.invite) ?? "").trim().toUpperCase() || undefined;
  const selectedTier = resolveMembershipTierInput(firstValue(params.tier));
  const billingInterval = resolveMembershipBillingInterval(
    firstValue(params.period) ?? firstValue(params.interval)
  );

  const [membershipContent, foundingOffer] = await Promise.all([
    getSiteContentSection("membership"),
    getFoundingOfferSnapshot()
  ]);

  const foundingOfferByTier = {
    FOUNDATION: foundingOffer.foundation,
    INNER_CIRCLE: foundingOffer.innerCircle,
    CORE: foundingOffer.core
  } as const;

  return (
    <div className="space-y-8 pb-16">
      <JsonLd
        data={buildCollectionPageSchema({
          title: "Membership For Business Owners",
          description:
            "Guided membership selection for business owners choosing between Foundation, Inner Circle, and Core.",
          path: "/membership",
          keywords: [...MEMBERSHIP_KEYWORDS],
          itemPaths: ["/join", "/founder", "/about"]
        })}
      />
      <JsonLd data={buildFaqSchema(membershipContent.faqs)} />

      {billing === "required" ? (
        <p className="rounded-2xl border border-gold/35 bg-gold/10 px-4 py-3 text-sm text-gold">
          Your account needs an active membership to access member areas. Choose the right room,
          then continue into join and checkout.
        </p>
      ) : null}

      {billing === "pending" ? (
        <p className="rounded-2xl border border-gold/35 bg-gold/10 px-4 py-3 text-sm text-gold">
          Your membership is still pending payment confirmation. Complete checkout again if the
          session expired, or return to your join confirmation page if Stripe has already charged
          you.
        </p>
      ) : null}

      {billing === "past-due" ? (
        <p className="rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          Your last payment did not complete, so premium access is currently on hold. Update
          billing to restore full member access.
        </p>
      ) : null}

      {billing === "cancelled-access" ? (
        <p className="rounded-2xl border border-border bg-card/70 px-4 py-3 text-sm text-muted">
          Your previous membership is no longer active. Review the rooms again, then restart secure
          checkout when you want to come back in properly.
        </p>
      ) : null}

      {billing === "cancelled" ? (
        <p className="rounded-2xl border border-border bg-card/70 px-4 py-3 text-sm text-muted">
          Stripe checkout was cancelled. Your room selection is still here, ready when you want to
          continue.
        </p>
      ) : null}

      <MembershipGuidedSelector
        initialSelectedTier={selectedTier}
        initialBillingInterval={billingInterval}
        billing={billing}
        from={from}
        inviteCode={inviteCode}
        foundingOfferByTier={foundingOfferByTier}
        faqTitle={membershipContent.faqTitle}
        faqDescription={membershipContent.faqDescription}
        faqItems={membershipContent.faqs}
      />
    </div>
  );
}
