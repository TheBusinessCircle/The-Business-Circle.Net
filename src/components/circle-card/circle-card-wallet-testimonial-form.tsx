"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Search, Send, Star } from "lucide-react";
import { submitCircleCardWalletTestimonialAction } from "@/actions/circle-card.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CIRCLE_CARD_WALLET_TESTIMONIAL_RELATIONSHIPS,
  CIRCLE_CARD_WALLET_TESTIMONIAL_RELATIONSHIP_LABELS
} from "@/lib/circle-card/wallet-testimonials";

export type CircleCardWalletTestimonialContact = {
  walletContactId: string;
  targetCardId: string;
  fullName: string;
  businessName: string | null;
  cardType: string;
  profileImageUrl: string | null;
  businessLogoUrl: string | null;
  hasPendingTestimonial: boolean;
};

export function CircleCardWalletTestimonialForm({
  contacts,
  initialTargetCardId = ""
}: {
  contacts: CircleCardWalletTestimonialContact[];
  initialTargetCardId?: string;
}) {
  const initialTarget = contacts.find((contact) => contact.targetCardId === initialTargetCardId) ?? null;
  const [query, setQuery] = useState(initialTarget?.fullName ?? "");
  const [selectedCardId, setSelectedCardId] = useState(initialTarget?.targetCardId ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const testimonialTextRef = useRef<HTMLTextAreaElement>(null);
  const selected = contacts.find((contact) => contact.targetCardId === selectedCardId) ?? null;
  const matches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return contacts.slice(0, 8);
    return contacts
      .filter((contact) =>
        [contact.fullName, contact.businessName, contact.cardType]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery))
      )
      .slice(0, 8);
  }, [contacts, query]);

  useEffect(() => {
    if (initialTarget && !initialTarget.hasPendingTestimonial) {
      testimonialTextRef.current?.focus({ preventScroll: true });
    }
  }, [initialTarget]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || saving) return;

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await submitCircleCardWalletTestimonialAction(new FormData(event.currentTarget));
      if (result.ok) {
        setMessage(result.message);
      } else {
        setError(result.message);
      }
    } catch {
      setError("The trust signal could not be sent.");
    } finally {
      setSaving(false);
    }
  }

  if (!contacts.length) {
    return (
      <p className="rounded-xl border border-dashed border-silver/18 bg-background/18 p-4 text-sm text-muted">
        Save someone’s Circle Card first, then you can leave a verified trust signal.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="wallet-testimonial-search">Find a saved Business or Creator Card</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 text-muted" size={16} />
          <Input
            id="wallet-testimonial-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people in your wallet…"
            className="pl-10"
            role="combobox"
            aria-expanded={Boolean(matches.length)}
            aria-controls="wallet-testimonial-options"
          />
        </div>
        <div id="wallet-testimonial-options" role="listbox" className="grid max-h-64 gap-2 overflow-y-auto">
          {matches.map((contact) => {
            const selectedContact = contact.targetCardId === selectedCardId;
            return (
              <button
                key={contact.walletContactId}
                type="button"
                role="option"
                aria-selected={selectedContact}
                disabled={contact.hasPendingTestimonial}
                onClick={() => {
                  setSelectedCardId(contact.targetCardId);
                  setQuery(contact.fullName);
                  setError("");
                  setMessage("");
                }}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-silver/14 bg-background/20 p-3 text-left transition hover:border-gold/30 disabled:cursor-not-allowed disabled:opacity-55"
              >
                <span className="relative h-11 w-11 shrink-0">
                  <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl border border-silver/14 bg-card text-xs font-semibold">
                    {contact.profileImageUrl ? (
                      <img src={contact.profileImageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      contact.fullName.slice(0, 2).toUpperCase()
                    )}
                  </span>
                  {contact.businessLogoUrl ? (
                    <span className="absolute -bottom-1 -right-1 h-6 w-6 overflow-hidden rounded-lg border border-background bg-card">
                      <img src={contact.businessLogoUrl} alt="" className="h-full w-full object-cover" />
                    </span>
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">{contact.fullName}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted">
                    {contact.businessName || "Business Circle Card"}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <Badge variant="outline" className="border-silver/18 text-silver">{contact.cardType}</Badge>
                  {contact.hasPendingTestimonial ? <span className="text-[10px] text-muted">Pending approval</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selected ? (
        selected.hasPendingTestimonial ? (
          <p role="status" className="flex items-center gap-2 rounded-xl border border-gold/24 bg-gold/10 p-3 text-sm text-gold">
            <CheckCircle2 size={15} /> You’ve already sent a trust signal for approval.
          </p>
        ) : message ? (
          <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-400/24 bg-emerald-400/10 p-3 text-sm text-emerald-100">
            <CheckCircle2 size={15} /> {message}
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3 rounded-xl border border-gold/18 bg-gold/8 p-3" noValidate>
            <input type="hidden" name="targetCardId" value={selected.targetCardId} />
            <p className="text-xs font-medium text-gold">For {selected.fullName}</p>
            <div className="space-y-2">
              <Label htmlFor="wallet-testimonial-text">Your trust signal</Label>
              <Textarea
                ref={testimonialTextRef}
                id="wallet-testimonial-text"
                name="testimonialText"
                rows={4}
                maxLength={1200}
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="wallet-testimonial-rating">Rating (optional)</Label>
                <Select id="wallet-testimonial-rating" name="rating" defaultValue="">
                  <option value="">No rating</option>
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <option key={rating} value={rating}>{rating} star{rating === 1 ? "" : "s"}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wallet-testimonial-relationship">Relationship (optional)</Label>
                <Select id="wallet-testimonial-relationship" name="relationship" defaultValue="">
                  <option value="">Choose context</option>
                  {CIRCLE_CARD_WALLET_TESTIMONIAL_RELATIONSHIPS.map((relationship) => (
                    <option key={relationship} value={relationship}>
                      {CIRCLE_CARD_WALLET_TESTIMONIAL_RELATIONSHIP_LABELS[relationship]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" size="sm" className="gap-2" disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {saving ? "Sending..." : "Send trust signal"}
            </Button>
          </form>
        )
      ) : (
        <p className="flex items-center gap-2 text-xs text-muted"><Star size={13} /> Select someone to continue.</p>
      )}
    </div>
  );
}
