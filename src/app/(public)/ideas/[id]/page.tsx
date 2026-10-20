import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isBcnV2Enabled } from "@/lib/bcn-v2/flags";
import { ideaIsOpen, offerPrice, supportLabels } from "@/lib/bcn-v2/ideas";
import { hasAcceptedBcnRules } from "@/lib/rules-acceptance";
import {
  IdeaActionForm,
  IdeaBriefForm,
  IdeaOfferForm,
} from "@/components/bcn-v2/idea-client";
import { RulesChoice } from "@/components/bcn-v2/conversation-client";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Practical help request | The Business Circle",
  robots: { index: false, follow: false },
};
export default async function Idea({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isBcnV2Enabled()) notFound();
  const { id } = await params;
  const item = await prisma.bcnIdeaRequest.findUnique({ where: { id } });
  if (!item) notFound();
  const session = await auth();
  const viewer = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, role: true, suspended: true, emailVerified: true },
      })
    : null;
  const owner = await prisma.user.findUnique({
    where: { id: item.ownerId },
    select: { suspended: true, emailVerified: true },
  });
  const own = viewer?.id === item.ownerId && !viewer.suspended;
  const open =
    ideaIsOpen(item) && Boolean(owner?.emailVerified && !owner.suspended);
  if (!open && !own && !(viewer?.role === "ADMIN" && !viewer.suspended))
    notFound();
  const offers = own
    ? await prisma.bcnIdeaOffer.findMany({
        where: { requestId: id, status: { in: ["APPROVED", "ACCEPTED"] } },
        orderBy: { createdAt: "asc" },
      })
    : [];
  const rules =
    viewer && !viewer.suspended ? await hasAcceptedBcnRules(viewer.id) : false;
  return (
    <section className="v2-section">
      <div className="v2-wrap">
        <Link className="v2-text-link" href="/ideas">
          ← Build it together
        </Link>
        <p className="v2-eyebrow" style={{ marginTop: 25 }}>
          {item.stage} · {item.category}
        </p>
        <h1 style={{ fontSize: "clamp(2rem,4vw,3.2rem)" }}>{item.title}</h1>
        <p>
          {item.displayName} · {item.location}
        </p>
        <p className="v2-note">
          {own ? `Status: ${item.status}. ` : ""}Closes{" "}
          {item.expiresAt.toLocaleDateString("en-GB", {
            timeZone: "Europe/London",
          })}
          . Open to{" "}
          {item.supportTypes
            .map((k) => supportLabels[k as keyof typeof supportLabels])
            .join(", ")}
          .
        </p>
        <div className="v2-grid v2-grid-two">
          <article className="v2-card">
            <h2 style={{ fontSize: 26 }}>The business or idea</h2>
            <p className="v2-message-text">{item.idea}</p>
            <h2 style={{ fontSize: 26 }}>The help needed</h2>
            <p className="v2-message-text">{item.helpNeeded}</p>
            <h2 style={{ fontSize: 26 }}>A useful next milestone</h2>
            <p className="v2-message-text">{item.nextMilestone}</p>
          </article>
          <aside className="v2-card">
            <h2 style={{ fontSize: 26 }}>Help with the next step.</h2>
            <p>
              Useful help can be a short conversation, feedback on a first
              attempt or a clearly scoped piece of work. Only offer something
              you can deliver.
            </p>
            <p>
              Free help has no compulsory purchase. Discounted and paid services
              must state their full price and limits. A skill swap must explain
              what is expected in return.
            </p>
            <p className="v2-note">
              BCN reviews suitability and can investigate reports. We do not
              certify helpers or guarantee work, discounts or response times.
              Agree confidentiality and ownership before sharing anything
              sensitive.
            </p>
          </aside>
        </div>
        {own ? (
          <>
            <h2 style={{ marginTop: 35, fontSize: 30 }}>
              Reviewed offers, just for you.
            </h2>
            {!offers.length && (
              <p>
                No reviewed offers yet. You will see them here after moderation.
              </p>
            )}
            <div className="v2-grid v2-grid-two">
              {offers.map((o) => (
                <article className="v2-card" key={o.id}>
                  <h3>{o.displayName}</h3>
                  <p>
                    <strong>{offerPrice(o)}</strong>
                  </p>
                  <p className="v2-message-text">{o.scope}</p>
                  <p>{o.timing}</p>
                  <p className="v2-message-text">{o.priceTerms}</p>
                  {o.status === "ACCEPTED" && o.threadId ? (
                    <Link
                      className="v2-button"
                      href={`/messages/${o.threadId}`}
                    >
                      Open your conversation
                    </Link>
                  ) : (
                    open && (
                      <IdeaActionForm
                        action={{ action: "accept", offerId: o.id }}
                        label="Choose offer & open private chat"
                      >
                        <label className="v2-check">
                          <input type="checkbox" required />
                          <span>
                            I choose to discuss this offer privately using my
                            BCN account name. This is not an order or payment;
                            we will agree the work and terms separately.
                          </span>
                        </label>
                      </IdeaActionForm>
                    )
                  )}
                  <details>
                    <summary>Report this offer</summary>
                    <IdeaActionForm
                      action={{ action: "report", id, offerId: o.id }}
                      label="Submit report"
                    >
                      <label className="v2-field">
                        What concerns you?
                        <textarea
                          name="detail"
                          required
                          minLength={10}
                          maxLength={1000}
                        />
                      </label>
                    </IdeaActionForm>
                  </details>
                </article>
              ))}
            </div>
            {item.status === "MATCHED" && (
              <IdeaActionForm
                action={{ action: "complete", id }}
                label="Record that we made progress"
              >
                <label className="v2-field">
                  What useful step did the help lead to?
                  <textarea
                    name="outcome"
                    minLength={20}
                    maxLength={500}
                    required
                  />
                </label>
                <p className="v2-note">
                  This note stays private. We will ask separately before sharing
                  a story or testimonial.
                </p>
              </IdeaActionForm>
            )}
            <IdeaActionForm
              action={{ action: "close", id }}
              label="Close & remove my request"
            >
              <p className="v2-note">
                Closes new offers and removes this request from public
                discovery. Existing chats remain available.
              </p>
            </IdeaActionForm>
            {!["CLOSED", "MATCHED", "COMPLETED"].includes(item.status) && (
              <details>
                <summary>Edit my request</summary>
                <IdeaBriefForm
                  initial={{
                    id: item.id,
                    displayName: item.displayName,
                    title: item.title,
                    stage: item.stage,
                    category: item.category,
                    idea: item.idea,
                    helpNeeded: item.helpNeeded,
                    nextMilestone: item.nextMilestone,
                    location: item.location,
                    supportTypes: item.supportTypes,
                  }}
                />
              </details>
            )}
          </>
        ) : (
          open && (
            <div style={{ marginTop: 35 }}>
              {!viewer ? (
                <div className="v2-card">
                  <h2 style={{ fontSize: 26 }}>Could you help with this?</h2>
                  <p>
                    A free, verified BCN account lets you send a relevant offer.
                  </p>
                  <Link className="v2-button" href="/login">
                    Sign in to offer help
                  </Link>{" "}
                  <Link className="v2-text-link" href="/register">
                    Create a free account
                  </Link>
                </div>
              ) : viewer.suspended || !viewer.emailVerified ? (
                <p>
                  Verify your email before offering help.{" "}
                  <Link href="/verify-email">Email verification help</Link>.
                </p>
              ) : !rules ? (
                <RulesChoice />
              ) : (
                <IdeaOfferForm
                  requestId={id}
                  allowedKinds={item.supportTypes}
                />
              )}
            </div>
          )
        )}
        {viewer &&
          !viewer.suspended &&
          viewer.emailVerified &&
          !own &&
          open && (
            <details style={{ marginTop: 25 }}>
              <summary>Report this request</summary>
              <IdeaActionForm
                action={{ action: "report", id }}
                label="Send report"
              >
                <label className="v2-field">
                  What concerns you?
                  <textarea
                    name="detail"
                    required
                    minLength={10}
                    maxLength={1000}
                  />
                </label>
              </IdeaActionForm>
            </details>
          )}
      </div>
    </section>
  );
}
