"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import {
  approveCircleCardWalletTestimonialAction,
  rejectCircleCardWalletTestimonialAction
} from "@/actions/circle-card.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { circleCardReportReasonLabel, circleCardReportStatusLabel } from "@/lib/circle-card/reports";
import { circleCardWalletTestimonialRelationshipLabel } from "@/lib/circle-card/wallet-testimonials";

type PendingTestimonial = {
  id: string;
  reviewerName: string;
  reviewerRoleOrCompany: string | null;
  testimonialText: string;
  rating: number | null;
  relationship: string | null;
  createdAt: Date;
};

type PendingConcern = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: Date;
};

export function CircleTrustOwnerModeration({
  cardId,
  initialPendingTestimonials,
  pendingConcerns
}: {
  cardId: string;
  initialPendingTestimonials: PendingTestimonial[];
  pendingConcerns: PendingConcern[];
}) {
  const [testimonials, setTestimonials] = useState(initialPendingTestimonials);
  const [pendingId, setPendingId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function moderate(testimonialId: string, status: "APPROVED" | "REJECTED") {
    setPendingId(testimonialId);
    setNotice("");
    setError("");
    try {
      const input = { testimonialId, targetCardId: cardId };
      const result = status === "APPROVED"
        ? await approveCircleCardWalletTestimonialAction(input)
        : await rejectCircleCardWalletTestimonialAction(input);
      if (result.ok) {
        setTestimonials((items) => items.filter((item) => item.id !== testimonialId));
        setNotice(result.message);
      } else {
        setError(result.message);
      }
    } catch {
      setError("The trust submission could not be updated.");
    } finally {
      setPendingId("");
    }
  }

  if (!testimonials.length && !pendingConcerns.length && !notice) {
    return null;
  }

  return (
    <section aria-labelledby="circle-trust-owner-title" className="rounded-[1.75rem] border border-cyan-300/20 bg-cyan-400/[0.045] p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <ShieldCheck size={20} className="mt-0.5 shrink-0 text-cyan-100" />
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-cyan-100">Private owner view</p>
          <h2 id="circle-trust-owner-title" className="mt-1 font-display text-2xl text-foreground">Pending moderation</h2>
          <p className="mt-2 text-sm text-muted">These submissions are visible only to you and platform moderators.</p>
        </div>
      </div>

      {notice ? <p className="mt-4 rounded-xl border border-emerald-400/24 bg-emerald-400/10 p-3 text-sm text-emerald-100">{notice}</p> : null}
      {error ? <p role="alert" className="mt-4 rounded-xl border border-red-400/24 bg-red-400/10 p-3 text-sm text-red-100">{error}</p> : null}

      {testimonials.length ? (
        <div className="mt-4 grid gap-3">
          {testimonials.map((testimonial) => {
            const isPending = pendingId === testimonial.id;
            return (
              <article key={testimonial.id} className="rounded-2xl border border-silver/14 bg-background/26 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{testimonial.reviewerName}</p>
                    {testimonial.reviewerRoleOrCompany ? <p className="text-xs text-muted">{testimonial.reviewerRoleOrCompany}</p> : null}
                  </div>
                  {testimonial.relationship ? <Badge variant="outline">{circleCardWalletTestimonialRelationshipLabel(testimonial.relationship)}</Badge> : null}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-silver">&ldquo;{testimonial.testimonialText}&rdquo;</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" disabled={isPending} onClick={() => moderate(testimonial.id, "APPROVED")} className="gap-2">
                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Approve
                  </Button>
                  <Button variant="outline" size="sm" disabled={isPending} onClick={() => moderate(testimonial.id, "REJECTED")} className="gap-2">
                    <XCircle size={14} /> Reject
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {pendingConcerns.length ? (
        <div className="mt-5 border-t border-silver/12 pt-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><AlertTriangle size={15} className="text-gold" />Concerns awaiting human moderation</div>
          <div className="mt-3 grid gap-2">
            {pendingConcerns.map((concern) => (
              <article key={concern.id} className="rounded-xl border border-gold/18 bg-gold/[0.055] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{circleCardReportReasonLabel(concern.reason)}</p>
                  <Badge variant="outline" className="border-gold/24 text-gold">{circleCardReportStatusLabel(concern.status)}</Badge>
                </div>
                {concern.details ? <p className="mt-2 text-sm leading-relaxed text-muted">{concern.details}</p> : null}
                <p className="mt-2 text-xs text-muted">No Circle Trust reduction is applied before a moderation decision.</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
