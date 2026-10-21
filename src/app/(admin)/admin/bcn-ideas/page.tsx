import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { isBcnV2Enabled } from "@/lib/bcn-v2/flags";
import { offerPrice } from "@/lib/bcn-v2/ideas";
import { IdeaActionForm } from "@/components/bcn-v2/idea-client";
import "@/components/bcn-v2/v2.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Moderate practical help | BCN",
  robots: { index: false, follow: false },
};
export default async function ModerateIdeas() {
  if (!isBcnV2Enabled()) notFound();
  await requireAdmin();
  const requests = await prisma.bcnIdeaRequest.findMany({
    where: { status: { in: ["PENDING", "APPROVED"] } },
    orderBy: [{ status: "desc" }, { createdAt: "asc" }],
    take: 100,
  });
  const offers = await prisma.bcnIdeaOffer.findMany({
    where: { status: { in: ["PENDING", "APPROVED"] } },
    orderBy: [{ status: "desc" }, { createdAt: "asc" }],
    take: 100,
    include: { request: { select: { title: true } } },
  });
  const reports = await prisma.bcnIdeaReport.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: { request: { select: { title: true } } },
  });
  const requestCounts = await prisma.bcnIdeaRequest.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const offerCounts = await prisma.bcnIdeaOffer.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const audit = await prisma.bcnIdeaAudit.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const controls = (entity: string, id: string) => (
    <>
      <IdeaActionForm
        action={{ action: "moderate", entity, id, decision: "approve" }}
        label="Approve"
      >
        <label className="v2-field">
          Review note
          <input
            name="note"
            minLength={5}
            maxLength={500}
            required
            placeholder="Specific, relevant, safe and transparently priced"
          />
        </label>
      </IdeaActionForm>
      <IdeaActionForm
        action={{ action: "moderate", entity, id, decision: "reject" }}
        label="Reject / remove"
      >
        <label className="v2-field">
          Reason shown to the author
          <input
            name="note"
            minLength={5}
            maxLength={500}
            required
            placeholder="Explain what needs to change"
          />
        </label>
      </IdeaActionForm>
    </>
  );
  return (
    <div className="bcn-v2" style={{ padding: 25 }}>
      <p className="v2-eyebrow">PRIVATE MODERATION</p>
      <h1 style={{ fontSize: 36 }}>Keep the help useful.</h1>
      <Link className="v2-text-link" href="/admin/bcn-help">
        Help requests & BCN revenue
      </Link>
      <p>
        Review before publication. Reject fundraising, money-making schemes,
        personal contact details, confidential information, generic promotions,
        misleading credentials and vague or inflated discount claims. Offers
        must answer the actual request and state full scope, timing, price and
        VAT treatment where relevant. Do not approve claims you cannot
        reasonably substantiate.
      </p>
      <div className="v2-grid v2-grid-two">
        <section className="v2-card">
          <h2 style={{ fontSize: 24 }}>Requests · all time</h2>
          {requestCounts.map((c) => (
            <p key={c.status}>
              {c.status}: {c._count._all}
            </p>
          ))}
        </section>
        <section className="v2-card">
          <h2 style={{ fontSize: 24 }}>Offers · all time</h2>
          {offerCounts.map((c) => (
            <p key={c.status}>
              {c.status}: {c._count._all}
            </p>
          ))}
          <p className="v2-note">
            A matched request is an agreed conversation, not completed work or
            earned revenue. No automatic commission is charged on this board.
          </p>
        </section>
      </div>
      <h2 style={{ fontSize: 28, marginTop: 30 }}>
        Requests to review or remove
      </h2>
      <div className="v2-grid v2-grid-two">
        {requests.map((r) => (
          <article className="v2-card" key={r.id}>
            <span className="v2-tag">
              {r.status} · {r.stage} · {r.category}
            </span>
            <h3>{r.title}</h3>
            <p>
              {r.displayName} · {r.location}
            </p>
            <p className="v2-message-text">{r.idea}</p>
            <p className="v2-message-text">
              <strong>Needs:</strong> {r.helpNeeded}
            </p>
            <p className="v2-message-text">
              <strong>Next milestone:</strong> {r.nextMilestone}
            </p>
            <p>Support: {r.supportTypes.join(", ")}</p>
            <Link className="v2-text-link" href={`/ideas/${r.id}`}>
              Review full request
            </Link>
            {controls("request", r.id)}
          </article>
        ))}
      </div>
      <h2 style={{ fontSize: 28, marginTop: 30 }}>
        Offers to review or remove
      </h2>
      <div className="v2-grid v2-grid-two">
        {offers.map((o) => (
          <article className="v2-card" key={o.id}>
            <span className="v2-tag">{o.status}</span>
            <h3>For: {o.request.title}</h3>
            <p>{o.displayName}</p>
            <p>
              <strong>{offerPrice(o)}</strong>
            </p>
            <p className="v2-message-text">{o.scope}</p>
            <p>{o.timing}</p>
            <p className="v2-message-text">{o.priceTerms}</p>
            {controls("offer", o.id)}
          </article>
        ))}
      </div>
      <h2 style={{ fontSize: 28, marginTop: 30 }}>
        Open reports ({reports.length})
      </h2>
      <div className="v2-grid v2-grid-two">
        {reports.map((r) => (
          <article className="v2-card" key={r.id}>
            <h3>{r.request.title}</h3>
            <p className="v2-message-text">{r.detail}</p>
            <p className="v2-note">
              Request: {r.requestId}
              {r.offerId ? ` · Offer: ${r.offerId}` : ""}
            </p>
            <IdeaActionForm
              action={{
                action: "moderate",
                entity: "report",
                id: r.id,
                decision: "resolve",
              }}
              label="Record resolution"
            >
              <label className="v2-field">
                Investigation and action taken
                <input name="note" minLength={5} maxLength={500} required />
              </label>
            </IdeaActionForm>
          </article>
        ))}
      </div>
      <h2 style={{ fontSize: 28, marginTop: 30 }}>
        Latest moderation and consent records
      </h2>
      <div className="v2-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time (UTC)</th>
              <th>Action</th>
              <th>Request</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {audit.map((a) => (
              <tr key={a.id}>
                <td>{a.createdAt.toISOString()}</td>
                <td>{a.action}</td>
                <td>{a.requestId}</td>
                <td>{a.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="v2-note">
        Queues show up to 100 items of each type. Audit shows the latest 50
        records. Assign a moderator and review pending content and reports daily
        before promoting this section.
      </p>
    </div>
  );
}
