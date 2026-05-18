import type { Metadata } from "next";
<<<<<<< Updated upstream
=======
import {
  TestimonialCategory,
  TestimonialDisplayLocation,
  TestimonialProofType
} from "@prisma/client";
>>>>>>> Stashed changes
import {
  AnswerBlock,
  AuditFitCta,
  FirstSevenDaysBlock,
  JsonLd,
  MovementInsideRoomSection,
  PrivacyBoundaryNote,
  TierOutcomeComparison,
  TrustTrailSection,
  TwoPathCta
} from "@/components/public";
import { PublicTrustProofSection } from "@/components/public/public-trust-proof-section";
import { PublicTopVisual } from "@/components/visual-media";
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
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  buildFaqSchema,
  buildMembershipProductsSchema,
  buildServiceSchema,
  buildWebPageSchema
} from "@/lib/structured-data";
import {
  getFoundingOfferByTier,
  getFoundingOfferSnapshot
} from "@/server/founding";
import { getSiteContentSection } from "@/server/site-content";
import { getVisualMediaPlacement } from "@/server/visual-media";

export const dynamic = "force-dynamic";

const MEMBERSHIP_KEYWORDS = [
  "business membership UK",
  "business network for owners",
  "private business community UK",
  "business owners network",
  "private founder-led business environment",
  "entrepreneur community UK",
  "business growth membership",
  "connect with business owners",
  "structured business support",
  "membership for business owners"
] as const;

export const metadata: Metadata = createPageMetadata({
  title: "Membership | Join The Business Circle Network",
  description:
    "Choose the right room inside a private founder-led business environment for owners. Compare Foundation, Inner Circle, and Core for clearer structure, stronger context, and more controlled momentum.",
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
  const source = firstValue(params.source) === "audit" ? "audit" : undefined;
  const inviteCode = (firstValue(params.invite) ?? "").trim().toUpperCase() || undefined;
  const selectedTier = resolveMembershipTierInput(firstValue(params.tier));
  const billingInterval = resolveMembershipBillingInterval(
    firstValue(params.period) ?? firstValue(params.interval)
  );

  const [
    membershipContent,
    foundingOffer,
    membershipHeroPlacement,
    membershipRoomsPlacement,
    membershipTierComparisonPlacement,
    membershipFoundersPlacement
  ] = await Promise.all([
    getSiteContentSection("membership"),
    getFoundingOfferSnapshot(),
    getVisualMediaPlacement("membership.hero"),
    getVisualMediaPlacement("membership.section.rooms"),
    getVisualMediaPlacement("membership.section.tierComparison"),
    getVisualMediaPlacement("membership.section.founders")
  ]);

  const foundingOfferByTier = getFoundingOfferByTier(foundingOffer);

  return (
    <div className="public-page-stack">
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
      <JsonLd
        data={buildWebPageSchema({
          title: "Membership | Join The Business Circle Network",
          description:
            "The membership rooms inside a private founder-led business environment for serious business owners.",
          path: "/membership",
          primaryQuestion: "What do members get inside The Business Circle Network?",
          primaryAnswer:
            "Members get access to a private business owner environment with structured rooms, member profiles, useful resources, founder-led standards, business conversations, collaboration opportunities and a calmer place to connect with other serious owners."
        })}
      />
      <JsonLd data={buildBreadcrumbSchema([{ name: "Membership", path: "/membership" }])} />
      <JsonLd data={buildFaqSchema(membershipContent.faqs)} />
      <JsonLd
        data={buildServiceSchema({
          name: "The Business Circle Network membership",
          description:
            "A private founder-led business environment for owners who want clearer thinking, better conversations, useful resources and trusted rooms.",
          path: "/membership",
          serviceType: "Private business owner membership",
          audience: "UK business owners and founders"
        })}
      />
      <JsonLd
        data={buildMembershipProductsSchema({
          tiers: [
            {
              tier: "FOUNDATION",
              monthlyPrice: foundingOffer.foundation.available
                ? foundingOffer.foundation.foundingPrice
                : foundingOffer.foundation.standardPrice,
              annualPrice: foundingOffer.foundation.available
                ? foundingOffer.foundation.foundingAnnualPrice
                : foundingOffer.foundation.standardAnnualPrice,
              foundingAvailable: foundingOffer.foundation.available
            },
            {
              tier: "INNER_CIRCLE",
              monthlyPrice: foundingOffer.innerCircle.available
                ? foundingOffer.innerCircle.foundingPrice
                : foundingOffer.innerCircle.standardPrice,
              annualPrice: foundingOffer.innerCircle.available
                ? foundingOffer.innerCircle.foundingAnnualPrice
                : foundingOffer.innerCircle.standardAnnualPrice,
              foundingAvailable: foundingOffer.innerCircle.available
            },
            {
              tier: "CORE",
              monthlyPrice: foundingOffer.core.available
                ? foundingOffer.core.foundingPrice
                : foundingOffer.core.standardPrice,
              annualPrice: foundingOffer.core.available
                ? foundingOffer.core.foundingAnnualPrice
                : foundingOffer.core.standardAnnualPrice,
              foundingAvailable: foundingOffer.core.available
            }
          ]
        })}
      />

      <PublicTopVisual
        placement={membershipHeroPlacement}
        eyebrow="Membership"
        title="Choose the room that matches the business now."
        description="Start with the atmosphere of the room before you compare the membership paths."
        tone="immersive"
        fallbackLabel="Membership top visual"
      />

      <AnswerBlock
        question="What do members get inside The Business Circle Network?"
        answer="Members get access to a private business owner environment with structured rooms, member profiles, useful resources, founder-led standards, business conversations, collaboration opportunities and a calmer place to connect with other serious owners."
      />

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
        <p className="rounded-2xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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
        source={source}
        from={from}
        inviteCode={inviteCode}
        foundingOfferByTier={foundingOfferByTier}
        faqTitle={membershipContent.faqTitle}
        faqDescription={membershipContent.faqDescription}
        faqItems={membershipContent.faqs}
        roomsPlacement={membershipRoomsPlacement}
        tierComparisonPlacement={membershipTierComparisonPlacement}
        foundersPlacement={membershipFoundersPlacement}
      />

      <AuditFitCta source="membership" topic="room-fit" />

      <MovementInsideRoomSection />

      <TrustTrailSection />

      <FirstSevenDaysBlock />

      <TierOutcomeComparison />

      <PrivacyBoundaryNote />

<<<<<<< Updated upstream
      <PublicTrustProofSection source="membership" />
=======
      <TestimonialSection
        proofType={TestimonialProofType.BCN_MEMBER}
        location={TestimonialDisplayLocation.MEMBERSHIP_PAGE}
        category={[
          TestimonialCategory.BCN_EXPERIENCE,
          TestimonialCategory.COMMUNITY,
          TestimonialCategory.COLLABORATION
        ]}
        eyebrow="WHY MEMBERS JOIN"
        title="Proof from the people inside the room"
        intro="Approved member feedback from the private environment."
        limit={6}
      />
>>>>>>> Stashed changes

      <TwoPathCta
        source="membership"
        title="Not sure which room fits?"
        description="Use the Founder Audit if you want a guided recommendation, or join directly when the room already feels clear."
      />
    </div>
  );
}
