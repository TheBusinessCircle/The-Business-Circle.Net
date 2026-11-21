import { prisma } from "@/lib/prisma";
import { canShowScaleSmithsPortfolioItem } from "@/lib/circle-card/scalesmiths/policy";

function safeHttpsLink(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function ScaleSmithsPublicPortfolio({ cardId }: { cardId: string }) {
  if (process.env.CIRCLE_CARD_SCALESMITHS_PREVIEW !== "true") return null;

  const membership = await prisma.circleCardScaleSmithsPartner.findUnique({
    where: { partnerCardId: cardId },
    select: {
      status: true,
      partnerCard: { select: { isPublished: true, archivedAt: true } },
      portfolio: { orderBy: { publishedAt: "desc" }, take: 50 }
    }
  });

  if (!membership || membership.status !== "ACTIVE" ||
      !membership.partnerCard?.isPublished || membership.partnerCard.archivedAt) return null;

  const visible = membership.portfolio.filter((item) =>
    canShowScaleSmithsPortfolioItem({
      partnerStatus: membership.status,
      publicationStatus: item.publicationStatus,
      clientConsentAt: item.clientConsentAt,
      founderApprovedAt: item.founderApprovedAt,
      projectDeliveredAt: item.projectDeliveredAt,
      consentWithdrawnAt: item.consentWithdrawnAt,
      partnerCardPublished: membership.partnerCard?.isPublished === true
    })
  );
  if (!visible.length) return null;

  return (
    <section aria-label="Clients I've Helped" className="mx-auto my-8 w-full max-w-3xl rounded-3xl border border-silver/20 bg-card/80 p-5 sm:p-7">
      <p className="text-xs font-bold uppercase tracking-widest text-primary">Verified ScaleSmiths partner portfolio</p>
      <h2 className="mt-2 text-2xl font-bold">Clients I've Helped</h2>
      <p className="mt-2 text-sm text-muted">
        Businesses introduced by this independent ScaleSmiths partner.
        Services and project work delivered by the ScaleSmiths team.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {visible.map((item) => {
          const websiteUrl = safeHttpsLink(item.websiteUrl);
          const caseStudyUrl = safeHttpsLink(item.caseStudyUrl);
          return (
            <article key={item.id} className="rounded-2xl border border-silver/20 bg-background/35 p-4">
              <h3 className="font-semibold">{item.businessName}</h3>
              {item.summary ? <p className="mt-2 text-sm text-muted">{item.summary}</p> : null}
              <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-primary">
                {caseStudyUrl ? <a href={caseStudyUrl} target="_blank" rel="noopener noreferrer">View Our Work</a> : null}
                {websiteUrl ? <a href={websiteUrl} target="_blank" rel="noopener noreferrer">Visit Website</a> : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
