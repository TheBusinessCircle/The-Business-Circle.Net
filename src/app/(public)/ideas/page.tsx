import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isBcnV2Enabled } from "@/lib/bcn-v2/flags";
import { PageHeading } from "@/components/bcn-v2/shell";
import { supportKinds, supportLabels, ideaStages } from "@/lib/bcn-v2/ideas";
import { helpCategories } from "@/lib/bcn-v2/validation";
import { createPageMetadata } from "@/lib/seo";
export const dynamic = "force-dynamic";
export const metadata = createPageMetadata({
  title: "Build it together: practical help for business ideas",
  description:
    "Ask for skills, advice and practical help to move a business idea forward. Offer free help, a transparent discount or a clearly priced service.",
  path: "/ideas",
});
export default async function Ideas({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isBcnV2Enabled()) notFound();
  const p = await searchParams;
  const q = typeof p.q === "string" ? p.q.trim().slice(0, 100) : "";
  const category =
    typeof p.category === "string" &&
    helpCategories.includes(p.category as (typeof helpCategories)[number])
      ? p.category
      : "";
  const stage =
    typeof p.stage === "string" &&
    ideaStages.includes(p.stage as (typeof ideaStages)[number])
      ? p.stage
      : "";
  const kind =
    typeof p.kind === "string" &&
    supportKinds.includes(p.kind as (typeof supportKinds)[number])
      ? p.kind
      : "";
  let unavailable = false;
  const requests = await prisma.bcnIdeaRequest
    .findMany({
      where: {
        status: "APPROVED",
        expiresAt: { gt: new Date() },
        ...(category ? { category } : {}),
        ...(stage ? { stage } : {}),
        ...(kind ? { supportTypes: { has: kind } } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { helpNeeded: { contains: q, mode: "insensitive" } },
                { location: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        ownerId: true,
        displayName: true,
        title: true,
        stage: true,
        category: true,
        helpNeeded: true,
        location: true,
        supportTypes: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })
    .catch(() => {
      unavailable = true;
      return [];
    });
  const owners = await prisma.user
    .findMany({
      where: {
        id: { in: requests.map((r) => r.ownerId) },
        suspended: false,
        emailVerified: { not: null },
      },
      select: { id: true },
    })
    .catch(() => {
      unavailable = true;
      return [];
    });
  const active = new Set(owners.map((o) => o.id));
  const visible = requests.filter((r) => active.has(r.ownerId));
  return (
    <>
      <PageHeading
        eyebrow="BUILD IT TOGETHER"
        title="Your idea. Someone else’s experience. A real next step."
      >
        <p>
          Have a business dream or a practical problem holding you back? Ask for
          a specific piece of help. If you have the skills or experience, offer
          what you can: free help, a genuine discount, a skill swap or a clearly
          priced service.
        </p>
        <div className="v2-actions">
          <Link className="v2-button" href="/ideas/new">
            Ask for practical help ↗
          </Link>
          <Link className="v2-text-link" href="/ideas/mine">
            My requests & offers
          </Link>
        </div>
      </PageHeading>
      <section className="v2-section">
        <div className="v2-wrap">
          <div className="v2-band">
            <div>
              <h2 style={{ fontSize: 27 }}>
                People helping people, with a clear purpose.
              </h2>
              <p>
                One specific request. One useful next milestone. Every request
                and offer is reviewed. Offers go privately to the person asking,
                so help does not get buried under pitches.
              </p>
            </div>
            <div>
              <p>
                No fundraising, investment requests, motivational spam or
                unsolicited promotions. Posting and offering help are free. Any
                service price must be clear before you choose it.
              </p>
              <Link className="v2-text-link" href="/how-we-work">
                How BCN keeps this useful ↗
              </Link>
            </div>
          </div>
          <form
            method="get"
            className="v2-form-grid"
            style={{ margin: "32px 0" }}
          >
            <label className="v2-field">
              Search requests
              <input
                type="search"
                name="q"
                defaultValue={q}
                maxLength={100}
                placeholder="Try prototype, first customers or branding"
              />
            </label>
            <label className="v2-field">
              Type of help
              <select name="category" defaultValue={category}>
                <option value="">All types</option>
                {helpCategories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="v2-field">
              Stage
              <select name="stage" defaultValue={stage}>
                <option value="">All stages</option>
                {ideaStages.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="v2-field">
              Open to
              <select name="kind" defaultValue={kind}>
                <option value="">All support</option>
                {supportKinds.map((s) => (
                  <option value={s} key={s}>
                    {supportLabels[s]}
                  </option>
                ))}
              </select>
            </label>
            <button className="v2-button">Find requests</button>
          </form>
          <h2 style={{ fontSize: 30 }}>Ideas looking for a helping hand.</h2>
          <p className="v2-note">
            Newest approved requests first. Up to 50 shown. No paid ranking.
            Open requests expire after 30 days.
          </p>
          {unavailable ? (
            <p role="status" className="v2-error">
              The board is temporarily unavailable. Please try again later.
            </p>
          ) : visible.length ? (
            <div className="v2-grid">
              {visible.map((r) => (
                <Link
                  className="v2-card v2-card-link"
                  href={`/ideas/${r.id}`}
                  key={r.id}
                >
                  <span className="v2-tag">
                    {r.stage} · {r.category}
                  </span>
                  <h3>{r.title}</h3>
                  <p>
                    {r.helpNeeded.slice(0, 180)}
                    {r.helpNeeded.length > 180 ? "…" : ""}
                  </p>
                  <p className="v2-note">
                    {r.displayName} · {r.location}
                  </p>
                  <p>
                    {r.supportTypes
                      .map(
                        (k) => supportLabels[k as keyof typeof supportLabels],
                      )
                      .join(" · ")}
                  </p>
                  <span className="v2-text-link">See how you could help ↗</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="v2-empty">
              <h3>
                {q || category || stage || kind
                  ? "No matching open requests yet."
                  : "The first useful connection starts with an honest ask."}
              </h3>
              <p>
                Tell people what you are trying to build, where you are stuck
                and what a small useful contribution would look like.
              </p>
              <Link className="v2-button" href="/ideas/new">
                Share a practical help request
              </Link>
            </div>
          )}
          <p className="v2-note">
            Moderation is a suitability check, not professional certification.
            Do not publish confidential ideas or personal contact details. Check
            experience, agree terms and protect your work before commissioning
            services. BCN does not process payments for offers.
          </p>
        </div>
      </section>
    </>
  );
}
