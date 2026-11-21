import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setCircleCardPublicProfileVisibilityAction } from "@/actions/scalesmiths-circle-card.actions";
import { canShowScaleSmithsPortfolioItem, hasActiveScaleSmithsSponsorship } from "@/lib/circle-card/scalesmiths/policy";
import { prisma } from "@/lib/prisma";
import { requireCircleCardUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "ScaleSmiths Partner Cards | Circle Card",
  robots: { index: false, follow: false }
};

export default async function ScaleSmithsPartnerWorkspace() {
  // Staging-only. Not advertised or available until explicitly enabled.
  if (process.env.CIRCLE_CARD_SCALESMITHS_PREVIEW !== "true") notFound();

  const session = await requireCircleCardUser();
  const [membership, cards] = await Promise.all([
    prisma.circleCardScaleSmithsPartner.findUnique({
      where: { userId: session.user.id },
      include: { partnerCard: true, portfolio: { orderBy: { updatedAt: "desc" } } }
    }),
    prisma.circleCard.findMany({
      where: { userId: session.user.id, archivedAt: null },
      orderBy: [{ isDefaultCard: "desc" }, { displayOrder: "asc" }]
    })
  ]);

  const sponsorEligible = membership ? hasActiveScaleSmithsSponsorship({
    partnerStatus: membership.status,
    sponsorStartedAt: membership.sponsoredProStartsAt,
    sponsorEndedAt: membership.sponsoredProEndsAt
  }) : false;

  const portfolio = membership?.portfolio.filter((item) =>
    canShowScaleSmithsPortfolioItem({
      partnerStatus: membership.status,
      publicationStatus: item.publicationStatus,
      clientConsentAt: item.clientConsentAt,
      founderApprovedAt: item.founderApprovedAt,
      projectDeliveredAt: item.projectDeliveredAt,
      consentWithdrawnAt: item.consentWithdrawnAt,
      partnerCardPublished: Boolean(
        membership.partnerCard && membership.partnerCard.isPublished &&
        !membership.partnerCard.archivedAt
      )
    })
  ) ?? [];

  return (
    <main className="page-shell space-y-6 pb-20 pt-8">
      <header className="rounded-3xl border border-silver/20 bg-card/70 p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">ScaleSmiths partner workspace · staging</p>
        <h1 className="mt-3 text-3xl font-bold">Your professional Circle Cards</h1>
        <p className="mt-2 text-sm text-muted">
          Your personal card stays yours. Your verified ScaleSmiths identity and client portfolio
          are managed separately, under the ScaleSmiths partner programme.
        </p>
        <p className="mt-4 text-sm">
          Partner link: <strong>{membership?.status ?? "Awaiting verified account linking"}</strong>
          {" · "}
          Sponsored Pro: <strong>{sponsorEligible ? "Eligibility recorded (billing integration pending)" : "Not active"}</strong>
        </p>
        {membership?.partnerCard?.slug ? (
          <Link href={`/card/${membership.partnerCard.slug}`} className="mt-3 inline-block text-sm font-semibold text-primary underline">
            Preview your ScaleSmiths Partner Card
          </Link>
        ) : null}
      </header>

      <section aria-labelledby="card-selector-title" className="rounded-3xl border border-silver/20 bg-card/70 p-6">
        <h2 id="card-selector-title" className="text-xl font-bold">Cards on your public profile</h2>
        <p className="mt-2 text-sm text-muted">
          Turning a card off here hides it from your public card selection, but does not delete
          it, change its direct link, or affect a Pro subscription.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {cards.map((card) => {
            const isPartner = membership?.partnerCardId === card.id;
            return (
              <div key={card.id} className="rounded-2xl border border-silver/20 bg-background/40 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">
                  {isPartner ? "ScaleSmiths partner card" : "Your Circle Card"}
                </p>
                <p className="mt-2 text-lg font-semibold">{card.fullName}</p>
                <p className="text-xs text-muted">{card.businessName ?? card.role ?? "Personal profile"}</p>
                <form action={setCircleCardPublicProfileVisibilityAction} className="mt-4 flex items-center justify-between gap-3">
                  <input type="hidden" name="cardId" value={card.id} />
                  <input type="hidden" name="visible" value={card.showOnPublicProfile ? "false" : "true"} />
                  <span className="text-sm">{card.showOnPublicProfile ? "Shown in selector" : "Hidden from selector"}</span>
                  <button type="submit" className="rounded-xl border border-silver/30 px-3 py-2 text-sm font-semibold hover:bg-background">
                    Turn {card.showOnPublicProfile ? "off" : "on"}
                  </button>
                </form>
              </div>
            );
          })}
          {cards.length === 0 ? <p className="text-sm text-muted">Create your first Circle Card to get started.</p> : null}
        </div>
      </section>

      <section aria-labelledby="partner-portfolio-title" className="rounded-3xl border border-silver/20 bg-card/70 p-6">
        <h2 id="partner-portfolio-title" className="text-xl font-bold">Clients I've Helped</h2>
        <p className="mt-2 text-sm text-muted">
          Verified clients you've introduced. Project work is delivered by ScaleSmiths.
          Only client-permitted and founder-approved completed work appears here.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {portfolio.map((item) => (
            <article key={item.id} className="rounded-2xl border border-silver/20 bg-background/40 p-4">
              <h3 className="text-lg font-semibold">{item.businessName}</h3>
              {item.summary ? <p className="mt-2 text-sm text-muted">{item.summary}</p> : null}
              <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-primary">
                {item.caseStudyUrl ? <a href={item.caseStudyUrl} target="_blank" rel="noopener noreferrer">View Our Work</a> : null}
                {item.websiteUrl ? <a href={item.websiteUrl} target="_blank" rel="noopener noreferrer">Visit Website</a> : null}
              </div>
            </article>
          ))}
          {portfolio.length === 0 ? <p className="text-sm text-muted">Approved work will appear here once linked from ScaleSmiths.</p> : null}
        </div>
      </section>
      <Link href="/dashboard/circle-card" className="inline-block text-sm font-semibold text-primary underline">Back to Circle Card</Link>
    </main>
  );
}
