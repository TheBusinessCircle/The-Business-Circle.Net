"use client";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Action = Record<string, unknown>;
export function ConversationForm({
  action,
  label,
  children,
  danger = false,
}: {
  action: Action;
  label: string;
  children?: ReactNode;
  danger?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (
      danger &&
      !window.confirm(
        "Block this member? They will no longer be able to reply or call you through BCN.",
      )
    )
      return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/bcn/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(new FormData(form)),
          ...action,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Please try again later.");
      if (action.action === "send") form.reset();
      setNotice(
        data.message ||
          (action.action === "report"
            ? "Report submitted for moderation."
            : "Saved."),
      );
      if (data.threadId) router.push(`/messages/${data.threadId}`);
      router.refresh();
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to connect. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="v2-conversation-form">
      {children}
      <button className="v2-button" disabled={busy}>
        {busy ? "Please wait…" : label}
      </button>
      {notice && (
        <p className="v2-note" role="status">
          {notice}
        </p>
      )}
    </form>
  );
}

export function ConversationRefresh() {
  const router = useRouter();
  useEffect(() => {
    // No new realtime vendor needed. Pause polling when this tab is hidden.
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [router]);
  return (
    <button
      type="button"
      className="v2-text-link"
      onClick={() => router.refresh()}
    >
      Refresh conversations
    </button>
  );
}

export function ConversationRequest({
  profileId,
  business,
}: {
  profileId: string;
  business: string;
}) {
  const [intro, setIntro] = useState("");
  const starters = [
    "I’m starting a business and would value your experience with…",
    "I’m working through a challenge with… Could we compare notes?",
    "I think our businesses could help each other by…",
  ];
  return (
    <section className="v2-card">
      <h2 style={{ fontSize: 25 }}>Say hello to {business}.</h2>
      <p>
        Explain why you chose this business and what a useful conversation would
        look like. Your account name is visible to them. Your email is not
        shown.
      </p>
      <div className="v2-starters" aria-label="Conversation starters">
        {starters.map((text, i) => (
          <button type="button" key={text} onClick={() => setIntro(text)}>
            {
              ["Ask for experience", "Compare notes", "Explore collaboration"][
                i
              ]
            }
          </button>
        ))}
      </div>
      <ConversationForm
        action={{ action: "request", profileId }}
        label="Request a conversation"
      >
        <label className="v2-field">
          Your introduction
          <textarea
            name="intro"
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            minLength={20}
            maxLength={1200}
            required
          />
        </label>
        <p className="v2-note">
          No bulk pitches or unsolicited promotions. They can accept, decline,
          block or report the request.
        </p>
      </ConversationForm>
    </section>
  );
}
export function RulesChoice() {
  return (
    <section className="v2-card">
      <h2 style={{ fontSize: 24 }}>A good conversation starts with respect.</h2>
      <p>
        Be helpful and honest. Keep private information private, respect a no
        and avoid unsolicited sales pitches.
      </p>
      <ConversationForm
        action={{ action: "rules" }}
        label="Accept BCN rules and open conversations"
      >
        <label className="v2-check">
          <input type="checkbox" required />
          <span>
            I have read and accept the{" "}
            <Link href="/rules" target="_blank">
              BCN rules
            </Link>
            .
          </span>
        </label>
      </ConversationForm>
    </section>
  );
}
export function ConversationCall({ targetUserId }: { targetUserId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  return (
    <div>
      <button
        className="v2-button"
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setNotice("");
          try {
            const response = await fetch("/api/calls/one-to-one", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ targetUserId }),
            });
            const data = await response.json();
            if (!response.ok || !data.roomPath)
              throw new Error(
                data.error ||
                  "Calling is unavailable. You can continue chatting.",
              );
            router.push(data.roomPath);
          } catch (e) {
            setNotice(
              e instanceof Error ? e.message : "Unable to open a call.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Opening…" : "Open a private video call"}
      </button>
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
