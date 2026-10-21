import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { hasAcceptedBcnRules } from "@/lib/rules-acceptance";
import {
  getDirectMessageThreadDetail,
  listDirectMessageRequests,
  listInboxThreads,
  markDirectMessageThreadRead,
} from "@/server/messages";
import {
  bcnDirectCallsConfigured,
  connectedPairCanTalk,
} from "@/server/bcn-v2/connections-policy";
import { canUserStartOneToOneCalls } from "@/server/calling/permissions";
import { toCallingUser } from "@/server/calling/session";
import {
  ConversationCall,
  ConversationForm,
  ConversationRefresh,
  ConversationRequest,
  RulesChoice,
} from "./conversation-client";

function name(member: { name: string | null }) {
  return member.name?.trim() || "BCN member";
}
function time(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  });
}
async function conversationUser() {
  const session = await requireUser({ allowUnentitled: true });
  return {
    user: session.user,
    verified: Boolean(session.user.emailVerified),
    rules: await hasAcceptedBcnRules(session.user.id),
  };
}
export async function BcnConversations({
  connect,
  archived = false,
}: {
  connect?: string;
  archived?: boolean;
}) {
  const { user, verified, rules } = await conversationUser();
  if (!verified)
    return (
      <section className="v2-card">
        <h1 style={{ fontSize: 32 }}>Verify your email to use private chat.</h1>
        <p>
          Free conversations are available to verified BCN accounts. Use the
          verification link sent when you registered.
        </p>
        <Link className="v2-text-link" href="/verify-email">
          Email verification help
        </Link>
      </section>
    );
  const allThreads = await listInboxThreads({
    userId: user.id,
    includeArchived: archived,
  });
  const threads = allThreads.filter((t) => t.isArchived === archived);
  const requests = await listDirectMessageRequests({
    userId: user.id,
    direction: "all",
  });
  const pending = requests.filter((r) => r.status === "PENDING");
  const profile = connect
    ? await prisma.bcnBusinessProfile.findFirst({
        where: {
          id: connect,
          approved: true,
          publicConsentAt: { not: null },
          acceptsMessages: true,
        },
        select: { id: true, userId: true, business: true },
      })
    : null;
  return (
    <>
      <p className="v2-eyebrow">YOUR PRIVATE BUSINESS CONVERSATIONS · FREE</p>
      <h1 style={{ fontSize: 38 }}>A useful conversation starts here.</h1>
      <p>
        Ask a question, share experience or explore working together. A request
        opens a chat only when the recipient accepts.
      </p>
      <p className="v2-note">
        Conversations refresh every 15 seconds while this tab is active.
        Messages are stored by BCN and may be reviewed to investigate reports.
        Do not share passwords or sensitive customer information.
      </p>
      <ConversationRefresh />
      {!rules && <RulesChoice />}
      {rules && profile && profile.userId !== user.id && (
        <ConversationRequest
          profileId={profile.id}
          business={profile.business}
        />
      )}
      {connect && (!profile || profile.userId === user.id) && (
        <p role="status">
          This profile is not available for a new request.{" "}
          <Link href="/business-directory">Find another business</Link>.
        </p>
      )}
      <section className="v2-section">
        <h2 style={{ fontSize: 28 }}>
          Conversation requests {pending.length ? `(${pending.length})` : ""}
        </h2>
        {!pending.length && (
          <p>
            No requests waiting. Find a business with a useful reason to connect
            in the{" "}
            <Link className="v2-text-link" href="/business-directory">
              directory
            </Link>
            .
          </p>
        )}
        <div className="v2-grid v2-grid-two">
          {pending.map((r) => (
            <article className="v2-card" key={r.id}>
              <h3>
                {r.recipient.id === user.id
                  ? `From ${name(r.requester)}`
                  : `Waiting for ${name(r.recipient)}`}
              </h3>
              <p className="v2-message-text">
                {r.introMessage || "A BCN member would like to talk."}
              </p>
              <p className="v2-note">{time(r.createdAt)}</p>
              {r.recipient.id === user.id && (
                <>
                  <div className="v2-actions">
                    {rules && (
                      <ConversationForm
                        action={{
                          action: "respond",
                          requestId: r.id,
                          choice: "accept",
                        }}
                        label="Accept chat"
                      />
                    )}
                    <ConversationForm
                      action={{
                        action: "respond",
                        requestId: r.id,
                        choice: "decline",
                      }}
                      label="Decline"
                    />
                    <ConversationForm
                      danger
                      action={{
                        action: "respond",
                        requestId: r.id,
                        choice: "block",
                      }}
                      label="Block"
                    />
                  </div>
                  <details>
                    <summary>Report this request</summary>
                    <ConversationForm
                      action={{ action: "report", requestId: r.id }}
                      label="Submit report"
                    >
                      <label className="v2-field">
                        What happened?
                        <textarea
                          name="detail"
                          required
                          minLength={10}
                          maxLength={1000}
                        />
                      </label>
                    </ConversationForm>
                  </details>
                </>
              )}
            </article>
          ))}
        </div>
      </section>
      <section>
        <div className="v2-section-head">
          <h2 style={{ fontSize: 28 }}>
            {archived ? "Archived chats" : "Your chats"}
          </h2>
          <Link
            className="v2-text-link"
            href={archived ? "/messages" : "/messages?view=archived"}
          >
            {archived ? "Active chats" : "Archived chats"}
          </Link>
        </div>
        <div className="v2-grid v2-grid-two">
          {threads.map((t) => (
            <Link
              className="v2-card v2-card-link"
              key={t.id}
              href={`/messages/${t.id}`}
            >
              <h3>
                {name(t.otherMember)}{" "}
                {t.unreadCount > 0 && (
                  <span className="v2-status">{t.unreadCount} unread</span>
                )}
              </h3>
              <p>{t.lastMessagePreview || "Your conversation is open."}</p>
              <span className="v2-text-link">Open private chat ↗</span>
            </Link>
          ))}
        </div>
        {!threads.length && (
          <div className="v2-empty">
            <h3>Your next connection could start with one good question.</h3>
            <p>
              Create a profile to explain how you help, or find someone with
              relevant experience.
            </p>
            <div className="v2-actions" style={{ justifyContent: "center" }}>
              <Link className="v2-button" href="/business-directory">
                Find other businesses
              </Link>
              <Link className="v2-text-link" href="/profile">
                Edit your free profile
              </Link>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
export async function BcnConversation({ threadId }: { threadId: string }) {
  const { user, verified, rules } = await conversationUser();
  if (!verified) return <BcnConversations />;
  const thread = await getDirectMessageThreadDetail({
    threadId,
    userId: user.id,
  });
  if (!thread) notFound();
  await markDirectMessageThreadRead({ threadId, userId: user.id });
  const canTalk = await connectedPairCanTalk(user.id, thread.otherMember.id);
  const callDecision =
    canTalk && bcnDirectCallsConfigured()
      ? await canUserStartOneToOneCalls(toCallingUser(user))
      : null;
  return (
    <>
      <Link className="v2-text-link" href="/messages">
        ← All conversations
      </Link>
      <p className="v2-eyebrow" style={{ marginTop: 25 }}>
        PRIVATE CHAT
      </p>
      <h1 style={{ fontSize: 36 }}>{name(thread.otherMember)}</h1>
      <ConversationRefresh />
      {!rules && <RulesChoice />}
      <div className="v2-chat-layout">
        <section aria-label="Conversation messages">
          <div className="v2-messages">
            {thread.messages.map((m) => (
              <article
                className={`v2-message ${m.senderId === user.id ? "v2-message-mine" : ""}`}
                key={m.id}
              >
                <p className="v2-note">
                  {m.messageType === "SYSTEM"
                    ? "BCN"
                    : m.senderId === user.id
                      ? "You"
                      : name(m.sender)}{" "}
                  · <time dateTime={m.createdAt}>{time(m.createdAt)}</time>
                </p>
                <p className="v2-message-text">
                  {m.content
                    .split(/(\/calls\/c[a-z0-9]{20,30})/g)
                    .map((text, i) =>
                      /^\/calls\/c[a-z0-9]{20,30}$/.test(text) ? (
                        <Link className="v2-text-link" key={i} href={text}>
                          Join the private call ↗
                        </Link>
                      ) : (
                        text
                      ),
                    )}
                </p>
                {m.attachments.map((a) => (
                  <p key={a.id}>
                    <a
                      className="v2-text-link"
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open attachment: {a.fileName}
                    </a>
                  </p>
                ))}
              </article>
            ))}
          </div>
          <p className="v2-note">
            Showing the most recent 200 messages in chronological order. Times
            are UK local time.
          </p>
          {canTalk ? (
            <ConversationForm
              action={{ action: "send", threadId }}
              label="Send message"
            >
              <label className="v2-field">
                Your message
                <textarea
                  name="content"
                  required
                  minLength={1}
                  maxLength={4000}
                  placeholder="What would help move this forward?"
                />
              </label>
            </ConversationForm>
          ) : (
            <p className="v2-note">
              This conversation is read-only. A participant may be blocked,
              unverified or currently unavailable.
            </p>
          )}
        </section>
        <aside className="v2-card v2-chat-aside">
          <h2 style={{ fontSize: 24 }}>Make the conversation useful.</h2>
          <p>
            Agree one next step. Be clear about whether you are offering advice,
            a collaboration or a paid service.
          </p>
          <h3>Prefer to talk?</h3>
          {callDecision?.allowed ? (
            <>
              <p>
                Agree a time in chat first. Opening a call posts an invitation
                here; the other person chooses whether to join. Camera and
                microphone permissions are your choice.
              </p>
              <ConversationCall targetUserId={thread.otherMember.id} />
            </>
          ) : (
            <p>
              Video calling is currently unavailable here. You can keep talking
              by private message.
            </p>
          )}
          <hr />
          <div className="v2-actions">
            <ConversationForm
              action={{
                action: "archive",
                threadId,
                archived: !thread.isArchived,
              }}
              label={thread.isArchived ? "Restore chat" : "Archive chat"}
            />
            <ConversationForm
              danger
              action={{ action: "block", threadId }}
              label="Block this member"
            />
          </div>
          <details>
            <summary>Report a problem</summary>
            <ConversationForm
              action={{ action: "report", threadId }}
              label="Send report"
            >
              <label className="v2-field">
                What happened?
                <textarea
                  name="detail"
                  required
                  minLength={10}
                  maxLength={1000}
                />
              </label>
            </ConversationForm>
          </details>
          <p className="v2-note">
            BCN can review reported conversations. Blocking also prevents calls.
            Private chat is not end-to-end encrypted.
          </p>
        </aside>
      </div>
    </>
  );
}
