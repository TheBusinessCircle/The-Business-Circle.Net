import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isBcnV2Enabled } from "@/lib/bcn-v2/flags";
import { offerPrice } from "@/lib/bcn-v2/ideas";
import { IdeaActionForm } from "@/components/bcn-v2/idea-client";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "My practical help requests & offers | The Business Circle",
  robots: { index: false, follow: false },
};
export default async function MyIdeas() {
  if (!isBcnV2Enabled()) notFound();
  const session = await requireUser({ allowUnentitled: true });
  const requests = await prisma.bcnIdeaRequest.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      status: true,
      expiresAt: true,
      audit: {
        where: { action: "request.rejected" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { note: true },
      },
    },
  });
  const offers = await prisma.bcnIdeaOffer.findMany({
    where: { helperId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      request: { select: { title: true } },
      audit: {
        where: { action: "offer.rejected" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { note: true },
      },
    },
  });
  return (
    <section className="v2-section">
      <div className="v2-wrap">
        <p className="v2-eyebrow">BUILD IT TOGETHER · YOUR ACTIVITY</p>
        <h1 style={{ fontSize: 38 }}>Your ideas. Your helping hands.</h1>
        <p>
          New requests and offers wait for review. Nothing is published
          automatically. A reviewed offer is visible privately to the owner.
        </p>
        <div className="v2-actions">
          <Link className="v2-button" href="/ideas/new">
            Ask for help
          </Link>
          <Link className="v2-text-link" href="/ideas">
            Find someone to help
          </Link>
          <Link className="v2-text-link" href="/messages">
            Private chats
          </Link>
        </div>
        <h2 style={{ fontSize: 28, marginTop: 35 }}>Your requests</h2>
        {!requests.length && <p>You have not submitted a request yet.</p>}
        <div className="v2-grid">
          {requests.map((r) => (
            <article className="v2-card" key={r.id}>
              <h3>{r.title}</h3>
              <p>
                Status: {r.status}
                {r.expiresAt < new Date() ? " · expired" : ""}
              </p>
              {r.status === "REJECTED" && r.audit[0] && (
                <p>Review feedback: {r.audit[0].note}</p>
              )}
              <Link className="v2-text-link" href={`/ideas/${r.id}`}>
                Manage request & see offers ↗
              </Link>
            </article>
          ))}
        </div>
        <h2 style={{ fontSize: 28, marginTop: 35 }}>Your offers</h2>
        {!offers.length && (
          <p>
            No offers yet. Your experience could be exactly what someone needs.
          </p>
        )}
        <div className="v2-grid">
          {offers.map((o) => (
            <article className="v2-card" key={o.id}>
              <h3>{o.request.title}</h3>
              <p>{offerPrice(o)}</p>
              <p>Status: {o.status}</p>
              {o.status === "REJECTED" && o.audit[0] && (
                <p>Review feedback: {o.audit[0].note}</p>
              )}
              {o.threadId ? (
                <Link className="v2-text-link" href={`/messages/${o.threadId}`}>
                  Open conversation ↗
                </Link>
              ) : (
                !["WITHDRAWN", "NOT_SELECTED"].includes(o.status) && (
                  <IdeaActionForm
                    action={{ action: "withdraw-offer", offerId: o.id }}
                    label="Withdraw offer"
                  />
                )
              )}
            </article>
          ))}
        </div>
        <p className="v2-note">
          Showing your latest 50 requests and 50 offers. Closing a request does
          not cancel a separately agreed service contract.
        </p>
      </div>
    </section>
  );
}
