"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { helpCategories } from "@/lib/bcn-v2/validation";
type Request = {
  id: string;
  name: string;
  email: string;
  business: string;
  category: string;
  summary: string;
  status: string;
  providerId: string | null;
  outcome: string | null;
  createdAt: string;
  audit: { action: string; createdAt: string }[];
};
type Provider = { id: string; name: string; approved: boolean };
export function HelpAdmin({
  requests,
  providers,
  profiles,
}: {
  requests: Request[];
  providers: Provider[];
  profiles: {
    id: string;
    business: string;
    description: string;
    website: string;
    approved: boolean;
  }[];
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function action(data: unknown) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/bcn/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const r = await res.json();
      if (!res.ok) throw new Error(r.error);
      setMessage(
        r.consentPath
          ? `Permission link (send privately to the requester only): ${window.location.origin}${r.consentPath}`
          : r.message || "Saved.",
      );
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  function addProvider(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void action({
      action: "provider",
      data: {
        ...Object.fromEntries(f),
        approved: f.get("approved") === "on",
        publicListingConsent: f.get("publicListingConsent") === "on",
      },
    });
  }
  function recordRevenue(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void action({
      ...Object.fromEntries(f),
      action: "revenue",
      amountPence: Math.round(Number(f.get("amount")) * 100),
      receivedAt: new Date(`${f.get("receivedAt")}T12:00:00Z`).toISOString(),
    });
  }
  return (
    <div>
      <p
        role="status"
        className={message ? "v2-success" : ""}
        style={{ overflowWrap: "anywhere" }}
      >
        {message}
      </p>
      <h2 style={{ marginTop: 30 }}>Private help queue</h2>
      <p className="v2-note">
        Showing the latest 50 requests. Review first, propose an approved
        provider, send the permission link privately, then record an
        introduction only after consent. This system does not send the
        introduction automatically.
      </p>
      {requests.length === 0 && (
        <p className="v2-empty">No help requests yet.</p>
      )}
      {requests.map((r) => (
        <article className="v2-card" style={{ margin: "20px 0" }} key={r.id}>
          <span className="v2-status">{r.status}</span>
          <h3 style={{ marginTop: 15 }}>
            {r.business} · {r.category}
          </h3>
          <p>
            {r.name} · {r.email}
          </p>
          <p style={{ whiteSpace: "pre-wrap" }}>{r.summary}</p>
          <p className="v2-note">
            {r.id} · {new Date(r.createdAt).toLocaleDateString("en-GB")}
          </p>
          {r.outcome && <p>Outcome: {r.outcome}</p>}
          <div className="v2-actions">
            {r.status === "RECEIVED" && (
              <button
                className="v2-button"
                disabled={busy}
                onClick={() => action({ action: "review", id: r.id })}
              >
                Mark reviewed
              </button>
            )}
            {r.status === "CONSENTED" && (
              <button
                className="v2-button"
                disabled={busy}
                onClick={() => action({ action: "introduce", id: r.id })}
              >
                Record introduction
              </button>
            )}
          </div>
          {["REVIEWED", "AWAITING_CONSENT"].includes(r.status) && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void action({
                  action: "propose",
                  id: r.id,
                  providerId: f.get("providerId"),
                  agreedFeePence: Math.round(Number(f.get("fee")) * 100),
                });
              }}
            >
              <div className="v2-form-grid" style={{ marginTop: 15 }}>
                <label className="v2-field">
                  Named provider
                  <select
                    name="providerId"
                    required
                    defaultValue={r.providerId || ""}
                  >
                    <option value="" disabled>
                      Select an approved provider
                    </option>
                    {providers
                      .filter((p) => p.approved)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="v2-field">
                  Potential agreed BCN referral fee (£)
                  <input
                    name="fee"
                    type="number"
                    min="0"
                    max="100000"
                    step="0.01"
                    defaultValue="0"
                    required
                  />
                </label>
              </div>
              <button
                className="v2-button"
                disabled={busy}
                style={{ marginTop: 15 }}
              >
                Prepare named-provider permission link
              </button>
            </form>
          )}
          {!["CLOSED", "REJECTED"].includes(r.status) && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void action({
                  action: ["CONSENTED", "INTRODUCED"].includes(r.status)
                    ? "close"
                    : "reject",
                  id: r.id,
                  outcome: f.get("outcome"),
                });
              }}
            >
              <label className="v2-field" style={{ marginTop: 20 }}>
                Outcome / reason
                <textarea
                  name="outcome"
                  minLength={5}
                  maxLength={1000}
                  required
                />
              </label>
              <button
                className="v2-button v2-button-outline"
                disabled={busy}
                style={{ marginTop: 10 }}
              >
                {["CONSENTED", "INTRODUCED"].includes(r.status)
                  ? "Close request"
                  : "Reject request"}
              </button>
            </form>
          )}
          <details style={{ marginTop: 20 }}>
            <summary>Audit trail</summary>
            {r.audit.map((a, i) => (
              <p key={i} className="v2-note">
                {a.action} · {new Date(a.createdAt).toLocaleString("en-GB")}
              </p>
            ))}
          </details>
        </article>
      ))}
      <h2 style={{ marginTop: 45 }}>Profile moderation</h2>
      <p className="v2-note">
        Email verification and active account status are checked before
        approval. New edits remove existing approval.
      </p>
      {profiles.length === 0 && <p>No profiles awaiting listing review.</p>}
      {profiles.map((p) => (
        <article className="v2-card" key={p.id} style={{ marginTop: 15 }}>
          <h3>{p.business}</h3>
          <p>{p.description}</p>
          <p>{p.website}</p>
          <button
            className="v2-button"
            disabled={busy}
            onClick={() =>
              action({
                action: "profile-review",
                id: p.id,
                approved: !p.approved,
              })
            }
          >
            {p.approved ? "Withdraw approval" : "Approve profile"}
          </button>
        </article>
      ))}
      <h2 style={{ marginTop: 45 }}>Provider register</h2>
      <p className="v2-note">
        Approval is a moderation decision. Record a real agreement reference
        before using a referral fee. Listing permission is separate.
      </p>
      {providers.map((p) => (
        <p key={p.id}>
          {p.name} · {p.approved ? "Approved" : "Not approved"}{" "}
          {p.approved && (
            <button
              disabled={busy}
              className="v2-text-link"
              onClick={() => action({ action: "provider-withdraw", id: p.id })}
            >
              Withdraw approval
            </button>
          )}
        </p>
      ))}
      <details className="v2-card" style={{ marginTop: 20 }}>
        <summary>Add a reviewed provider</summary>
        <form onSubmit={addProvider}>
          <div className="v2-form-grid" style={{ marginTop: 20 }}>
            {[
              ["business", "Business name"],
              ["location", "Town / area"],
              ["website", "HTTPS website (optional)"],
              ["agreementReference", "Written agreement reference (optional)"],
              [
                "relatedBusinessDisclosure",
                "Related-business disclosure (optional)",
              ],
            ].map(([key, label]) => (
              <label className="v2-field" key={key}>
                {label}
                <input
                  name={key}
                  maxLength={
                    key === "website" || key === "relatedBusinessDisclosure"
                      ? 500
                      : key === "agreementReference"
                        ? 200
                        : 160
                  }
                  required={["business", "location"].includes(key)}
                />
              </label>
            ))}
            <label className="v2-field">
              Category
              <select name="category">
                {helpCategories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="v2-field v2-field-full">
              Description
              <textarea
                name="description"
                minLength={20}
                maxLength={1500}
                required
              />
            </label>
          </div>
          <label className="v2-check">
            <input name="approved" type="checkbox" />
            Reviewed and approved for matching
          </label>
          <label className="v2-check">
            <input name="publicListingConsent" type="checkbox" />
            Provider has expressly agreed to a public listing
          </label>
          <button disabled={busy} className="v2-button">
            Save provider
          </button>
        </form>
      </details>
      <h2 style={{ marginTop: 45 }}>Record actual BCN receipts</h2>
      <p className="v2-note">
        Only record received payments supported by settlement or bank evidence.
        Use unique references. Provider sales, clicks, submitted forms and
        potential fees are not BCN revenue. Correct mistakes with a separate
        reversal; preserve the audit trail.
      </p>
      <form className="v2-card" onSubmit={recordRevenue}>
        <div className="v2-form-grid">
          <label className="v2-field">
            Stream
            <select name="stream">
              {[
                "introduction",
                "affiliate",
                "download",
                "sponsorship",
                "reversal",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="v2-field">
            Amount received (£, negative for reversal)
            <input
              name="amount"
              type="number"
              step="0.01"
              min="-1000000"
              max="1000000"
              required
            />
          </label>
          <label className="v2-field">
            Unique payment / settlement reference
            <input
              name="externalReference"
              minLength={3}
              maxLength={200}
              required
            />
          </label>
          <label className="v2-field">
            Internal evidence reference
            <input
              name="evidenceReference"
              minLength={5}
              maxLength={300}
              required
            />
          </label>
          <label className="v2-field">
            Date received
            <input
              name="receivedAt"
              type="date"
              required
              max={new Date().toISOString().slice(0, 10)}
            />
          </label>
        </div>
        <button className="v2-button" style={{ marginTop: 20 }} disabled={busy}>
          Record received GBP payment
        </button>
      </form>
    </div>
  );
}
