"use client";
import Link from "next/link";
import { useState } from "react";
import { CUSTOM_BUILD_PATH } from "@/lib/circle-card/custom-build";

type Props = {
  cards: { id: string; fullName: string; businessName: string | null }[];
  orders: { id: string; cardId: string; paymentStatus: string; brief: string }[];
};
export function CustomBuildCheckout({ cards, orders }: Props) {
  const [cardId, setCardId] = useState(cards[0]?.id ?? "");
  const [brief, setBrief] = useState(orders.find(order => order.cardId === cards[0]?.id)?.brief ?? "");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const existing = orders.find(order => order.cardId === cardId && ["PAID","REFUNDED","DISPUTED","PROCESSING"].includes(order.paymentStatus));
  async function checkout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/stripe/circle-card/custom-build/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, brief, termsAccepted: accepted })
      });
      const data = await response.json();
      if (!response.ok || typeof data.url !== "string") throw new Error(data.error || "Checkout could not be prepared.");
      const destination = new URL(data.url, window.location.origin);
      if (destination.origin !== window.location.origin && destination.hostname !== "checkout.stripe.com") throw new Error("Unexpected checkout destination.");
      window.location.assign(destination.href);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Please try again.");
      setBusy(false);
    }
  }
  if (!cards.length) return <Link href="/app/onboarding" className="inline-flex min-h-11 items-center rounded-xl bg-gold px-5 font-semibold text-[#081429]">Create your card first</Link>;
  return <form onSubmit={checkout} className="space-y-4">
    <label className="block space-y-2 text-sm"><span>Which card should we design?</span>
      <select value={cardId} onChange={event => { setCardId(event.target.value); setBrief(orders.find(order => order.cardId === event.target.value)?.brief ?? ""); setAccepted(false); }} disabled={busy} className="min-h-11 w-full rounded-xl border border-silver/25 bg-background px-3">
        {cards.map(card => <option key={card.id} value={card.id}>{card.businessName || card.fullName}</option>)}
      </select>
    </label>
    {existing ? <div className="rounded-xl border border-gold/25 p-4"><p className="text-sm">An order already exists for this card. Your saved design does not need to be purchased again when you renew Pro.</p><Link href={`${CUSTOM_BUILD_PATH}?order=${encodeURIComponent(existing.id)}`} className="mt-3 inline-flex min-h-11 items-center text-gold underline">View your design order</Link></div> : <>
      <label className="block space-y-2 text-sm"><span>Tell us about your design</span><textarea value={brief} onChange={event => setBrief(event.target.value)} minLength={20} maxLength={3000} required rows={5} disabled={busy} placeholder="Your brand colours, website, preferred style and what you want customers to do. We will arrange any logos or photos with you." className="w-full rounded-xl border border-silver/25 bg-background p-3" /></label>
      <label className="flex items-start gap-3 text-sm text-muted"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} required disabled={busy} className="mt-1 h-5 w-5 shrink-0" /><span>I agree to £49.99 once for one custom card design and one round of changes. Pro at £9.99/month is separate. Custom presentation requires active paid Pro; the design stays saved if Pro ends and returns when paid Pro resumes. Extra functionality and later redesigns are quoted separately.</span></label>
      {error ? <p role="alert" className="text-sm text-red-200">{error}</p> : null}
      <button disabled={busy || !accepted || brief.trim().length < 20} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-gold px-5 font-semibold text-[#081429] disabled:opacity-50">{busy ? "Opening secure checkout…" : "Order custom design · £49.99"}</button>
      <p className="text-xs text-muted">A done-for-you design service. Payment places your brief in our design queue; it does not instantly generate a finished card.</p>
    </>}
  </form>;
}
