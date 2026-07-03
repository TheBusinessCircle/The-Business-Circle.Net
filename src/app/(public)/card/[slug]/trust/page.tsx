import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3, LockKeyhole, ShieldCheck, Sparkles, Star, Users } from "lucide-react";
import { auth } from "@/auth";
import { CircleCardReportForm } from "@/components/circle-card/circle-card-report-form";
import { CircleTrustOwnerModeration } from "@/components/circle-card/circle-trust-owner-moderation";
import { buttonVariants } from "@/components/ui/button";
import { SITE_CONFIG } from "@/config/site";
import { CIRCLE_CARD_PWA_METADATA } from "@/lib/circle-card/metadata";
import {
  circleCardTestimonialFlowHref,
  circleCardWalletTestimonialRelationshipLabel
} from "@/lib/circle-card/wallet-testimonials";
import { absoluteUrl, cn } from "@/lib/utils";
import { getCircleTrustOwnerModeration } from "@/server/circle-card/circle-trust.service";
import { getPublicCircleCard } from "@/server/circle-card/public-card.service";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const card = await getPublicCircleCard(slug);
  if (!card) {
    return { title: "Circle Trust", robots: { index: false, follow: false } };
  }

  const title = `${card.fullName} | Circle Trust`;
  const description = `Circle Trust for ${card.fullName}, built from verified Circle Card connections and testimonials.`;
  return {
    ...CIRCLE_CARD_PWA_METADATA,
    metadataBase: new URL(SITE_CONFIG.url),
    title,
    description,
    alternates: { canonical: `/card/${card.slug}/trust` },
    openGraph: {
      title,
      description,
      type: "profile",
      url: absoluteUrl(`/card/${card.slug}/trust`)
    }
  };
}

export default async function CircleTrustPage({ params }: PageProps) {
  const [{ slug }, session] = await Promise.all([params, auth()]);
  const card = await getPublicCircleCard(slug);
  if (!card) notFound();

  const viewerIsOwner = Boolean(session?.user?.id && session.user.id === card.userId);
  const ownerModeration = viewerIsOwner && !card.isDemo
    ? await getCircleTrustOwnerModeration(card.id, card.userId)
    : null;
  const canReceiveTestimonials = card.cardType === "BUSINESS" || card.cardType === "CREATOR";
  const testimonialFlowHref = circleCardTestimonialFlowHref(card.id);
  const testimonialHref = session?.user
    ? testimonialFlowHref
    : `/login?from=${encodeURIComponent(testimonialFlowHref)}`;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(212,175,95,0.12),transparent_32%),#030813] px-3 py-5 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl space-y-4 sm:space-y-5">
        <Link href={`/card/${card.slug}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}>
          <ArrowLeft size={14} /> Back to Circle Card
        </Link>

        <section className="overflow-hidden rounded-[2rem] border border-gold/26 bg-[radial-gradient(circle_at_top_right,rgba(212,175,95,0.14),transparent_38%),linear-gradient(145deg,rgba(12,25,32,0.96),rgba(4,10,24,0.99))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.34)] sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-gold">Circle Trust</p>
              <h1 className="mt-2 font-display text-3xl font-semibold text-foreground sm:text-5xl">{card.fullName}</h1>
              <p className="mt-2 text-sm text-silver">Trusted by your Circle</p>
            </div>
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gold/28 bg-gold/10 text-gold"><ShieldCheck size={22} /></span>
          </div>
          <div className="mt-7 flex flex-wrap items-end gap-x-5 gap-y-2">
            <p className="font-display text-7xl font-semibold leading-none text-foreground sm:text-8xl">{card.trust.score}</p>
            <p className="max-w-xl pb-1 text-sm leading-relaxed text-muted sm:text-base">{card.trust.summary}</p>
          </div>
          {!viewerIsOwner && canReceiveTestimonials && !card.isDemo ? (
            <Link href={testimonialHref} className={cn(buttonVariants(), "mt-6 min-h-11 gap-2")}>
              <ShieldCheck size={15} /> Help build my Circle Trust
            </Link>
          ) : null}
        </section>

        {ownerModeration ? (
          <CircleTrustOwnerModeration
            cardId={card.id}
            initialPendingTestimonials={ownerModeration.pendingTestimonials}
            pendingConcerns={ownerModeration.pendingConcerns}
          />
        ) : null}

        <section aria-labelledby="trust-summary-title" className="rounded-[1.75rem] border border-silver/14 bg-white/[0.035] p-5 shadow-panel-soft sm:p-6">
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-gold">Trust Summary</p>
          <h2 id="trust-summary-title" className="mt-2 font-display text-2xl text-foreground">Verified relationship proof</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-400/18 bg-emerald-400/[0.055] p-4">
              <Users size={18} className="text-emerald-200" />
              <p className="mt-3 text-3xl font-semibold text-foreground">{card.trust.verifiedConnectionCount}</p>
              <p className="mt-1 text-sm font-medium text-silver">Verified Connections</p>
              <p className="mt-2 text-xs leading-relaxed text-muted">Mutually accepted Circle Card connections.</p>
            </div>
            <div className="rounded-2xl border border-gold/18 bg-gold/[0.055] p-4">
              <ShieldCheck size={18} className="text-gold" />
              <p className="mt-3 text-3xl font-semibold text-foreground">{card.trust.verifiedTestimonialCount}</p>
              <p className="mt-1 text-sm font-medium text-silver">Verified Testimonials</p>
              <p className="mt-2 text-xs leading-relaxed text-muted">Approved proof submitted through saved Wallet relationships.</p>
            </div>
          </div>
          {card.trust.manualTestimonialCount > 0 ? (
            <p className="mt-3 text-xs leading-relaxed text-muted">
              {card.trust.manualTestimonialCount} owner-managed testimonial{card.trust.manualTestimonialCount === 1 ? " is" : "s are"} shown on the Circle Card, but not counted as verified relationship proof.
            </p>
          ) : null}
        </section>

        <section aria-labelledby="trust-signals-title" className="rounded-[1.75rem] border border-silver/14 bg-white/[0.035] p-5 shadow-panel-soft sm:p-6">
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-gold">Trust Signals</p>
          <h2 id="trust-signals-title" className="mt-2 font-display text-2xl text-foreground">Signals supported by platform data</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {card.trust.signals.map((signal) => (
              <article key={signal.id} className="rounded-2xl border border-silver/12 bg-background/24 p-4">
                <CheckCircle2 size={16} className="text-emerald-300" />
                <p className="mt-3 text-sm font-semibold text-foreground">{signal.count !== undefined ? `${signal.count} ` : ""}{signal.label}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted">{signal.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="verified-testimonials-title" className="rounded-[1.75rem] border border-silver/14 bg-white/[0.035] p-5 shadow-panel-soft sm:p-6">
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-gold">Verified Testimonials</p>
          <h2 id="verified-testimonials-title" className="mt-2 font-display text-2xl text-foreground">Latest verified trust</h2>
          {card.trust.latestVerifiedTestimonials.length ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {card.trust.latestVerifiedTestimonials.map((testimonial) => (
                <article key={testimonial.id} className="rounded-2xl border border-silver/12 bg-background/24 p-4 sm:p-5">
                  {testimonial.rating ? (
                    <div className="flex text-gold" aria-label={`${testimonial.rating} out of 5 stars`}>
                      {Array.from({ length: testimonial.rating }, (_, index) => <Star key={index} size={13} fill="currentColor" />)}
                    </div>
                  ) : null}
                  <blockquote className={testimonial.rating ? "mt-3" : ""}>
                    <p className="text-sm leading-relaxed text-silver">&ldquo;{testimonial.testimonialText}&rdquo;</p>
                  </blockquote>
                  <footer className="mt-4 border-t border-silver/12 pt-3">
                    <p className="text-sm font-semibold text-foreground">{testimonial.reviewerName}</p>
                    {testimonial.reviewerRoleOrCompany ? <p className="mt-1 text-xs text-muted">{testimonial.reviewerRoleOrCompany}</p> : null}
                    {testimonial.relationship ? <p className="mt-2 text-xs text-muted">{circleCardWalletTestimonialRelationshipLabel(testimonial.relationship)}</p> : null}
                  </footer>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-dashed border-silver/16 bg-background/18 p-4 text-sm text-muted">Building Circle Trust. No verified testimonials are public yet.</p>
          )}
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <section aria-labelledby="future-timeline-title" className="rounded-[1.5rem] border border-dashed border-silver/16 bg-white/[0.025] p-5">
            <Clock3 size={18} className="text-silver" />
            <h2 id="future-timeline-title" className="mt-3 text-base font-semibold text-foreground">Trust Timeline</h2>
            <p className="mt-2 text-sm text-muted">Reserved for a future Circle Trust release.</p>
          </section>
          <section aria-labelledby="future-achievements-title" className="rounded-[1.5rem] border border-dashed border-silver/16 bg-white/[0.025] p-5">
            <Sparkles size={18} className="text-silver" />
            <h2 id="future-achievements-title" className="mt-3 text-base font-semibold text-foreground">Achievements</h2>
            <p className="mt-2 text-sm text-muted">Reserved for a future Circle Trust release.</p>
          </section>
        </div>

        {!card.isDemo ? (
          <section aria-labelledby="trust-concern-title" className="rounded-[1.5rem] border border-silver/12 bg-white/[0.025] p-5">
            <div className="flex items-start gap-3">
              <LockKeyhole size={18} className="mt-0.5 shrink-0 text-silver" />
              <div>
                <h2 id="trust-concern-title" className="text-base font-semibold text-foreground">Raise a concern</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">Concerns enter pending human moderation. They are not published and do not reduce Circle Trust before a moderation decision.</p>
              </div>
            </div>
            <CircleCardReportForm cardId={card.id} cardSlug={card.slug} className="mt-4" />
          </section>
        ) : null}
      </div>
    </main>
  );
}
