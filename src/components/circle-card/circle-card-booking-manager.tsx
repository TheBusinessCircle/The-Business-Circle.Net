"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CalendarCheck2, ChevronDown, Loader2, Save } from "lucide-react";
import { upsertCircleCardBookingEnquiryInlineAction } from "@/actions/circle-card.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CircleCardBookingEnquiry } from "@/lib/circle-card/content-blocks";

export function CircleCardBookingManager({
  cardId,
  cardName,
  initialBooking
}: {
  cardId: string;
  cardName: string;
  initialBooking: CircleCardBookingEnquiry | null;
}) {
  const [booking, setBooking] = useState(initialBooking);
  const [heading, setHeading] = useState(initialBooking?.heading ?? "Ready to take the next step?");
  const [description, setDescription] = useState(
    initialBooking?.description ?? "Choose the best way to book, enquire or contact us."
  );
  const [primaryCtaLabel, setPrimaryCtaLabel] = useState(initialBooking?.primaryCtaLabel ?? "Book Now");
  const [primaryCtaUrl, setPrimaryCtaUrl] = useState(initialBooking?.primaryCtaUrl ?? "");
  const [secondaryCtaLabel, setSecondaryCtaLabel] = useState(initialBooking?.secondaryCtaLabel ?? "");
  const [secondaryCtaUrl, setSecondaryCtaUrl] = useState(initialBooking?.secondaryCtaUrl ?? "");
  const [enquiryEmail, setEnquiryEmail] = useState(initialBooking?.enquiryEmail ?? "");
  const [phoneNumber, setPhoneNumber] = useState(initialBooking?.phoneNumber ?? "");
  const [whatsappNumber, setWhatsappNumber] = useState(initialBooking?.whatsappNumber ?? "");
  const [showOnPublicCard, setShowOnPublicCard] = useState(initialBooking?.showOnPublicCard ?? true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setBooking(initialBooking);
    setHeading(initialBooking?.heading ?? "Ready to take the next step?");
    setDescription(initialBooking?.description ?? "Choose the best way to book, enquire or contact us.");
    setPrimaryCtaLabel(initialBooking?.primaryCtaLabel ?? "Book Now");
    setPrimaryCtaUrl(initialBooking?.primaryCtaUrl ?? "");
    setSecondaryCtaLabel(initialBooking?.secondaryCtaLabel ?? "");
    setSecondaryCtaUrl(initialBooking?.secondaryCtaUrl ?? "");
    setEnquiryEmail(initialBooking?.enquiryEmail ?? "");
    setPhoneNumber(initialBooking?.phoneNumber ?? "");
    setWhatsappNumber(initialBooking?.whatsappNumber ?? "");
    setShowOnPublicCard(initialBooking?.showOnPublicCard ?? true);
  }, [initialBooking]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await upsertCircleCardBookingEnquiryInlineAction(
        new FormData(event.currentTarget)
      );
      if (result.ok && result.booking) {
        setBooking(result.booking);
        setNotice(result.notice);
      } else if (!result.ok) {
        setError(result.message);
      }
    } catch {
      setError("Booking / Enquiry could not be saved. Your current settings are still shown.");
    } finally {
      setSaving(false);
    }
  }

  const status = !booking
    ? "Not set"
    : booking.isActive && booking.showOnPublicCard
      ? "Active"
      : "Hidden";

  return (
    <section id="business-card-booking" className="scroll-mt-24 rounded-2xl border border-gold/22 bg-gold/8">
      <details data-circle-card-module-details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-display text-xl font-semibold text-foreground">Booking / Enquiry</span>
              <Badge variant="outline" className="border-gold/28 text-gold">Pro</Badge>
              <Badge variant="muted">{status}</Badge>
            </span>
            <span className="mt-1 block text-sm text-muted">{booking ? "Manage Booking" : "Add booking link"}</span>
          </span>
          <ChevronDown size={16} className="shrink-0 text-silver transition-transform group-open:rotate-180" />
        </summary>

        <div className="border-t border-silver/12 p-3 sm:p-4">
          <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Card: {cardName}</p>
          {notice ? <p role="status" className="mt-3 rounded-xl border border-emerald-400/24 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">{notice}</p> : null}
          {error ? <p role="alert" className="mt-3 rounded-xl border border-destructive/24 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
          {!booking ? (
            <p className="mt-3 rounded-xl border border-dashed border-silver/18 bg-background/18 p-3 text-sm text-muted">
              Add a booking or enquiry link so visitors can take action.
            </p>
          ) : null}

          <form onSubmit={save} className="mt-4 space-y-3" noValidate>
            <input type="hidden" name="cardId" value={cardId} />
            <input type="hidden" name="isActive" value="true" />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor={`booking-${cardId}-heading`}>Heading</Label>
                <Input id={`booking-${cardId}-heading`} name="heading" value={heading} onChange={(event) => setHeading(event.target.value)} maxLength={100} required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor={`booking-${cardId}-description`}>Description</Label>
                <Textarea id={`booking-${cardId}-description`} name="description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={500} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`booking-${cardId}-primary-label`}>Primary CTA label</Label>
                <Input id={`booking-${cardId}-primary-label`} name="primaryCtaLabel" value={primaryCtaLabel} onChange={(event) => setPrimaryCtaLabel(event.target.value)} maxLength={40} placeholder="Book Now" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`booking-${cardId}-primary-url`}>Primary CTA URL</Label>
                <Input id={`booking-${cardId}-primary-url`} name="primaryCtaUrl" type="url" value={primaryCtaUrl} onChange={(event) => setPrimaryCtaUrl(event.target.value)} maxLength={2048} placeholder="https://example.com/book" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`booking-${cardId}-secondary-label`}>Secondary CTA label (optional)</Label>
                <Input id={`booking-${cardId}-secondary-label`} name="secondaryCtaLabel" value={secondaryCtaLabel} onChange={(event) => setSecondaryCtaLabel(event.target.value)} maxLength={40} placeholder="Request a Quote" />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`booking-${cardId}-secondary-url`}>Secondary CTA URL (optional)</Label>
                <Input id={`booking-${cardId}-secondary-url`} name="secondaryCtaUrl" type="url" value={secondaryCtaUrl} onChange={(event) => setSecondaryCtaUrl(event.target.value)} maxLength={2048} placeholder="https://example.com/enquire" />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`booking-${cardId}-email`}>Enquiry email (optional)</Label>
                <Input id={`booking-${cardId}-email`} name="enquiryEmail" type="email" value={enquiryEmail} onChange={(event) => setEnquiryEmail(event.target.value)} maxLength={254} placeholder="hello@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`booking-${cardId}-phone`}>Phone number (optional)</Label>
                <Input id={`booking-${cardId}-phone`} name="phoneNumber" type="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} maxLength={40} placeholder="+44 20 1234 5678" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor={`booking-${cardId}-whatsapp`}>WhatsApp number (optional)</Label>
                <Input id={`booking-${cardId}-whatsapp`} name="whatsappNumber" type="tel" value={whatsappNumber} onChange={(event) => setWhatsappNumber(event.target.value)} maxLength={40} placeholder="+44 7700 900123" />
              </div>
              <label className="flex items-start gap-2 rounded-xl border border-silver/14 bg-background/22 p-3 text-sm text-foreground sm:col-span-2">
                <input name="showOnPublicCard" type="checkbox" value="on" checked={showOnPublicCard} onChange={(event) => setShowOnPublicCard(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border bg-background accent-primary" />
                <span>Visible on public card<span className="mt-1 block text-xs text-muted">Turn this off to keep the saved section hidden.</span></span>
              </label>
            </div>

            <p className="text-xs text-muted">Suggested CTA labels: Book Now, Request a Quote, Book a Call, Make an Enquiry, Reserve Now, Get Started or Message Us.</p>
            <Button type="submit" size="sm" className="h-10 gap-2" disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : booking ? <Save size={14} /> : <CalendarCheck2 size={14} />}
              {saving ? "Saving..." : booking ? "Save booking" : "Add booking link"}
            </Button>
          </form>
        </div>
      </details>
    </section>
  );
}
