"use client";
import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { helpCategories } from "@/lib/bcn-v2/validation";
import { ideaStages, supportKinds, supportLabels } from "@/lib/bcn-v2/ideas";
async function post(data: unknown) {
  const res = await fetch("/api/bcn/ideas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || "Unable to save.");
  return result;
}
export function IdeaActionForm({
  action,
  label,
  children,
}: {
  action: Record<string, unknown>;
  label: string;
  children?: ReactNode;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <form
      className="v2-conversation-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage("");
        try {
          const r = await post({
            ...Object.fromEntries(new FormData(e.currentTarget)),
            ...action,
          });
          setMessage(r.message || "Saved.");
          if (r.threadId) router.push(`/messages/${r.threadId}`);
          router.refresh();
        } catch (e) {
          setMessage(e instanceof Error ? e.message : "Unable to save.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
      <button className="v2-button" disabled={busy}>
        {busy ? "Saving…" : label}
      </button>
      {message && (
        <p role="status" className="v2-note">
          {message}
        </p>
      )}
    </form>
  );
}
type Brief = {
  id: string;
  displayName: string;
  title: string;
  stage: string;
  category: string;
  idea: string;
  helpNeeded: string;
  nextMilestone: string;
  location: string;
  supportTypes: string[];
};
export function IdeaBriefForm({ initial }: { initial?: Brief }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const f = new FormData(event.currentTarget);
    try {
      const data = {
        displayName: f.get("displayName"),
        title: f.get("title"),
        stage: f.get("stage"),
        category: f.get("category"),
        idea: f.get("idea"),
        helpNeeded: f.get("helpNeeded"),
        nextMilestone: f.get("nextMilestone"),
        location: f.get("location"),
        supportTypes: f.getAll("supportTypes"),
        publicConsent: f.get("publicConsent") === "on",
        practicalHelpOnly: f.get("practicalHelpOnly") === "on",
      };
      await post({
        action: initial ? "edit" : "create",
        ...(initial ? { id: initial.id } : {}),
        data,
      });
      router.push("/ideas/mine?submitted=1");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="v2-card" onSubmit={submit}>
      <div className="v2-form-grid">
        <label className="v2-field">
          Public name or business name
          <input
            name="displayName"
            required
            minLength={2}
            maxLength={80}
            defaultValue={initial?.displayName}
          />
          <small>
            This name appears on the public request. Your account email is not
            published.
          </small>
        </label>
        <label className="v2-field">
          Location or remote working area
          <input
            name="location"
            required
            maxLength={160}
            defaultValue={initial?.location}
            placeholder="Bristol or remote across the UK"
          />
        </label>
        <label className="v2-field v2-field-full">
          What is the one thing you need help with?
          <input
            name="title"
            required
            minLength={15}
            maxLength={140}
            defaultValue={initial?.title}
            placeholder="Help me test the first version of my dog-walking booking page"
          />
        </label>
        <label className="v2-field">
          Where are you with the idea?
          <select name="stage" defaultValue={initial?.stage}>
            {ideaStages.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="v2-field">
          Type of help
          <select name="category" defaultValue={initial?.category}>
            {helpCategories.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="v2-field v2-field-full">
          The idea or business, and who it helps
          <textarea
            name="idea"
            required
            minLength={50}
            maxLength={2000}
            defaultValue={initial?.idea}
            placeholder="Explain the customer problem, what you want to build and what you have tried so far."
          />
        </label>
        <label className="v2-field v2-field-full">
          The practical help you need
          <textarea
            name="helpNeeded"
            required
            minLength={50}
            maxLength={2000}
            defaultValue={initial?.helpNeeded}
            placeholder="Be specific: a 30-minute review, help with a first prototype, an introduction or feedback from a potential customer."
          />
        </label>
        <label className="v2-field v2-field-full">
          What would a useful next milestone look like?
          <textarea
            name="nextMilestone"
            required
            minLength={20}
            maxLength={500}
            defaultValue={initial?.nextMilestone}
            placeholder="State the small outcome and any deadline, time or budget limits."
          />
        </label>
      </div>
      <fieldset>
        <legend className="v2-field">
          What kinds of help are you open to? Choose at least one.
        </legend>
        {supportKinds.map((kind) => (
          <label className="v2-check" key={kind}>
            <input
              type="checkbox"
              name="supportTypes"
              value={kind}
              defaultChecked={
                initial
                  ? initial.supportTypes.includes(kind)
                  : kind === "FREE" || kind === "DISCOUNTED"
              }
            />
            <span>{supportLabels[kind]}</span>
          </label>
        ))}
      </fieldset>
      <label className="v2-check">
        <input type="checkbox" name="practicalHelpOnly" required />
        <span>
          This asks for practical help, not donations, loans, investment,
          funding or promotion of a scheme.
        </span>
      </label>
      <label className="v2-check">
        <input type="checkbox" name="publicConsent" required />
        <span>
          I agree to publish this brief after moderation. It contains no private
          contact details, customer data or confidential idea details.
          <small>
            Requests expire after 30 days. I can close mine at any time. BCN
            stores moderation records as explained in the{" "}
            <Link href="/privacy-policy">privacy information</Link>.
          </small>
        </span>
      </label>
      <p className="v2-note">
        Posting is free. Help is not guaranteed. Editing a request sends it back
        for review and withdraws earlier offers so nobody agrees to an outdated
        brief.
      </p>
      <button className="v2-button" disabled={busy}>
        {busy
          ? "Submitting…"
          : initial
            ? "Submit changes for review"
            : "Submit my help request"}
      </button>
      {message && (
        <p className="v2-error" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
export function IdeaOfferForm({
  requestId,
  allowedKinds,
}: {
  requestId: string;
  allowedKinds: string[];
}) {
  const [kind, setKind] = useState(allowedKinds[0] || "FREE");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const f = new FormData(form);
    setBusy(true);
    setMessage("");
    try {
      const r = await post({
        action: "offer",
        data: {
          requestId,
          displayName: f.get("displayName"),
          kind,
          scope: f.get("scope"),
          timing: f.get("timing"),
          pricePence: Math.round(Number(f.get("price") || 0) * 100),
          usualPricePence:
            kind === "DISCOUNTED"
              ? Math.round(Number(f.get("usualPrice")) * 100)
              : null,
          priceTerms: f.get("priceTerms"),
          agreesToContact: f.get("agreesToContact") === "on",
          honestPricing: f.get("honestPricing") === "on",
        },
      });
      setMessage(r.message);
      form.reset();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to send.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="v2-card" onSubmit={submit}>
      <h2 style={{ fontSize: 28 }}>Offer practical help.</h2>
      <p>
        Your offer is reviewed, then shown privately to the person asking. Other
        visitors do not see a stream of sales pitches.
      </p>
      <div className="v2-form-grid">
        <label className="v2-field">
          Your name or business name
          <input name="displayName" required minLength={2} maxLength={80} />
        </label>
        <label className="v2-field">
          Type of offer
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            {allowedKinds.map((k) => (
              <option value={k} key={k}>
                {supportLabels[k as keyof typeof supportLabels]}
              </option>
            ))}
          </select>
        </label>
        <label className="v2-field v2-field-full">
          What exactly will you help with?
          <textarea
            name="scope"
            required
            minLength={40}
            maxLength={2000}
            placeholder="Describe a clear deliverable, limits, what you need from the owner and relevant experience. No links, contact details or generic pitches."
          />
        </label>
        <label className="v2-field">
          When and for how long?
          <input
            name="timing"
            required
            minLength={5}
            maxLength={300}
            placeholder="One 30-minute review next week"
          />
        </label>
        {["DISCOUNTED", "PAID"].includes(kind) && (
          <label className="v2-field">
            Total offered price (£)
            <input
              name="price"
              type="number"
              min="0.01"
              max="100000"
              step="0.01"
              required
            />
            <small>
              Include VAT if charged and all compulsory charges for the stated
              scope.
            </small>
          </label>
        )}
        {kind === "DISCOUNTED" && (
          <label className="v2-field">
            Genuine usual total price (£)
            <input
              name="usualPrice"
              type="number"
              min="0.02"
              max="100000"
              step="0.01"
              required
            />
            <small>
              For the same scope. Do not inflate a usual price to claim a
              discount.
            </small>
          </label>
        )}
        <label className="v2-field v2-field-full">
          Price, scope limits and terms
          <textarea
            name="priceTerms"
            required
            minLength={10}
            maxLength={500}
            placeholder={
              kind === "FREE"
                ? "No fee, deposit, compulsory purchase or hidden upsell. State any limits."
                : kind === "SKILL_SWAP"
                  ? "Explain what skill you would ask for in return and any limits. No cash price."
                  : "State VAT treatment, payment timing, exclusions and anything the owner needs to know before agreeing."
            }
          />
        </label>
      </div>
      <label className="v2-check">
        <input type="checkbox" name="honestPricing" required />
        <span>
          The scope and price are honest. Free means no compulsory purchase; any
          discount uses a genuine usual price.
        </span>
      </label>
      <label className="v2-check">
        <input type="checkbox" name="agreesToContact" required />
        <span>
          If the owner chooses this offer, I agree to open a private BCN
          conversation with them. My BCN account name will be visible to them;
          my account email is not shown.
        </span>
      </label>
      <p className="v2-note">
        This is an offer to discuss help. Choosing it does not place an order.
        Agree scope, price, rights and terms in writing before starting. BCN
        does not collect payments or guarantee the work.
      </p>
      <button className="v2-button" disabled={busy}>
        {busy ? "Sending…" : "Send offer for review"}
      </button>
      {message && (
        <p role="status" className="v2-note">
          {message}
        </p>
      )}
    </form>
  );
}
