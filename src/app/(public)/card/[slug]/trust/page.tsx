import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  CircleUserRound,
  Link2,
  LockKeyhole,
  MessageSquareQuote,
  ShieldCheck,
  Sparkles,
  Star,
  Users
} from "lucide-react";
import { auth } from "@/auth";
import { CircleCardFramedImage } from "@/components/circle-card/circle-card-framed-image";
import { CircleCardLogoMark } from "@/components/circle-card/circle-card-logo-mark";
import { CircleCardReportForm } from "@/components/circle-card/circle-card-report-form";
import { CircleTrustOwnerModeration } from "@/components/circle-card/circle-trust-owner-moderation";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { getRuntimeBrand } from "@/config/runtime-brand";
import { getCircleCardTypeLabel } from "@/lib/circle-card/card-types";
import type { CircleTrustTimelineEvent } from "@/lib/circle-card/circle-trust";
import { CIRCLE_CARD_PWA_METADATA } from "@/lib/circle-card/metadata";
import { circleCardPublicThemeClasses } from "@/lib/circle-card/public-theme-classes";
import { resolveCircleCardLiveTheme } from "@/lib/circle-card/theme";
import {
  circleCardTestimonialFlowHref,
  circleCardWalletTestimonialRelationshipLabel
} from "@/lib/circle-card/wallet-testimonials";
import { absoluteUrl, cn } from "@/lib/utils";
import { getCircleTrustOwnerModeration } from "@/server/circle-card/circle-trust.service";
import { getPublicCircleCard } from "@/server/circle-card/public-card.service";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric"
});

function initials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function timelineDate(value: Date) {
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const eventDay = Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
  const days = Math.max(0, Math.floor((today - eventDay) / 86_400_000));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return dateFormatter.format(value);
}

function timelineIcon(kind: CircleTrustTimelineEvent["kind"]) {
  switch (kind) {
    case "CONNECTION":
      return <Users size={16} aria-hidden="true" />;
    case "TESTIMONIAL":
      return <MessageSquareQuote size={16} aria-hidden="true" />;
    case "VERIFICATION":
      return <BadgeCheck size={16} aria-hidden="true" />;
    default:
      return <CircleUserRound size={16} aria-hidden="true" />;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const card = await getPublicCircleCard(slug);
  if (!card) {
    return { title: "Circle Trust", robots: { index: false, follow: false } };
  }

  const title = `${card.fullName} | Circle Trust`;
  const description = `Explore the living Circle Trust profile for ${card.fullName}, built from verified relationships and completed platform trust signals.`;
  return {
    ...CIRCLE_CARD_PWA_METADATA,
    metadataBase: new URL(getRuntimeBrand().canonicalOrigin),
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
  const canReceiveTrustSignals = card.cardType === "BUSINESS" || card.cardType === "CREATOR";
  const testimonialFlowHref = circleCardTestimonialFlowHref(card.id);
  const testimonialHref = session?.user
    ? testimonialFlowHref
    : `/login?from=${encodeURIComponent(testimonialFlowHref)}`;
  const liveTheme = resolveCircleCardLiveTheme(card);
  const theme = liveTheme.theme;
  const themeStyle = liveTheme.style as CSSProperties;
  const cardTypeLabel = getCircleCardTypeLabel(card.cardType) ?? "Professional";
  const identityImage = card.profileImageUrl || card.businessLogoUrl;
  const identityImagePositionX = card.profileImageUrl
    ? card.profileImagePositionX
    : card.businessLogoPositionX;
  const identityImagePositionY = card.profileImageUrl
    ? card.profileImagePositionY
    : card.businessLogoPositionY;
  const identityImageScale = card.profileImageUrl
    ? card.profileImageScale
    : card.businessLogoScale;
  const platformSignalCount = card.trust.signals.filter(
    (signal) => signal.id !== "verified-connections" && signal.id !== "verified-testimonials"
  ).length;

  return (
    <div
      className={cn(circleCardPublicThemeClasses.backgroundShell, "pb-12 sm:pb-16")}
      style={themeStyle}
      data-circle-card-surface={theme.surfaceStyle.toLowerCase()}
      {...liveTheme.attributes}
    >
      <div className="public-page-stack relative max-w-6xl pt-3 sm:pt-5 lg:pt-7">
        <header className="sticky top-2 z-30 flex min-w-0 items-center justify-between gap-3 rounded-[1.35rem] border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-secondary-bg)] p-2.5 shadow-[var(--cc-theme-secondary-shadow)] backdrop-blur-xl sm:p-3">
          <Link
            href={`/card/${card.slug}`}
            className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-silver/14 bg-background/24 px-3 text-sm font-semibold text-silver transition hover:border-[color:var(--cc-theme-button-border)] hover:text-foreground"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            <span className="hidden sm:inline">Back</span>
          </Link>

          <div className="flex min-w-0 flex-1 items-center justify-center gap-2.5 text-center">
            <CircleCardLogoMark className="h-9 w-9" alt="" />
            <span className="min-w-0 text-left">
              <span className="block truncate text-sm font-semibold text-foreground">Circle Trust</span>
              <span className="block truncate text-[11px] text-muted">{card.fullName}</span>
            </span>
          </div>

          <span className="inline-flex min-h-10 shrink-0 items-center rounded-xl border border-[color:var(--cc-theme-accent-badge-border)] bg-[var(--cc-theme-accent-badge-bg)] px-2.5 text-[11px] font-semibold text-gold sm:px-3">
            {cardTypeLabel}
          </span>
        </header>

        <main className="mt-4 space-y-4 sm:mt-5 sm:space-y-5">
          <section className="relative isolate overflow-hidden rounded-[2rem] border border-[color:var(--cc-theme-secondary-border)] bg-[image:var(--cc-theme-hero-bg)] p-4 shadow-[var(--cc-theme-hero-shadow)] sm:p-6 lg:p-8">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[image:var(--cc-theme-hero-line)]" />
            <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-8 h-64 w-64 rounded-full bg-[radial-gradient(circle,hsl(var(--cc-theme-primary-hsl)/0.2),transparent_68%)] blur-2xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-[-10%] h-80 w-80 rounded-full bg-[radial-gradient(circle,hsl(var(--cc-theme-accent-hsl)/0.17),transparent_68%)] blur-2xl" />

            <div className="relative z-10 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
              <div className="min-w-0 text-center lg:text-left">
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:text-left lg:justify-start">
                  <div className="cc-theme-avatar grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-[color:var(--cc-theme-button-border)] bg-[image:var(--cc-theme-media-bg)] text-lg font-semibold text-foreground shadow-[0_0_38px_hsl(var(--cc-theme-primary-hsl)/0.24)]">
                    {identityImage ? (
                      <CircleCardFramedImage
                        src={identityImage}
                        alt={card.fullName}
                        positionX={identityImagePositionX}
                        positionY={identityImagePositionY}
                        scale={identityImageScale}
                      >
                        <span>{initials(card.fullName)}</span>
                      </CircleCardFramedImage>
                    ) : (
                      <span>{initials(card.fullName)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Circle Trust</p>
                    <h1 className="mt-1 truncate font-display text-3xl font-semibold text-foreground sm:text-4xl">{card.fullName}</h1>
                    <p className="mt-1 text-sm text-silver">
                      {[card.role, card.businessName].filter(Boolean).join(" · ") || `${cardTypeLabel} Circle Card`}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/24 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold"><ShieldCheck size={13} /> Trusted by their Circle</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-silver/14 bg-white/[0.04] px-3 py-1.5 text-xs text-silver"><CircleUserRound size={13} /> {cardTypeLabel} Circle Card</span>
                  {card.trust.signals.some((signal) => signal.id === "profile-complete") ? <span className="inline-flex items-center gap-1.5 rounded-full border border-silver/14 bg-white/[0.04] px-3 py-1.5 text-xs text-silver"><CheckCircle2 size={13} /> Profile complete</span> : null}
                  {card.trust.signals.some((signal) => signal.id === "verified-account-email") ? <span className="inline-flex items-center gap-1.5 rounded-full border border-silver/14 bg-white/[0.04] px-3 py-1.5 text-xs text-silver"><BadgeCheck size={13} /> Account verified</span> : null}
                  {card.trust.signals.some((signal) => signal.id === "bcn-member") ? <span className="inline-flex items-center gap-1.5 rounded-full border border-silver/14 bg-white/[0.04] px-3 py-1.5 text-xs text-silver"><Sparkles size={13} /> Circle Card Member</span> : null}
                </div>

                <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted sm:text-base lg:mx-0">{card.trust.summary}</p>

                {!viewerIsOwner && canReceiveTrustSignals && !card.isDemo ? (
                  <Link href={testimonialHref} className={cn(buttonVariants(), "mt-5 min-h-11 w-full gap-2 sm:w-auto")}>
                    <ShieldCheck size={15} /> Leave a Trust Signal
                  </Link>
                ) : null}
              </div>

              <div className="mx-auto flex aspect-square w-full max-w-[15rem] flex-col items-center justify-center rounded-full border border-[color:var(--cc-theme-button-border)] bg-[radial-gradient(circle_at_50%_38%,hsl(var(--cc-theme-accent-hsl)/0.2),rgba(4,10,24,0.88)_64%)] p-5 text-center shadow-[0_0_0_10px_hsl(var(--cc-theme-primary-hsl)/0.05),0_28px_80px_rgba(0,0,0,0.42),0_0_74px_hsl(var(--cc-theme-primary-hsl)/0.2)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-silver">Trust Score</p>
                <p className="mt-2 font-display text-7xl font-semibold leading-none text-foreground sm:text-8xl">{card.trust.score}</p>
                <p className="mt-3 text-xs font-semibold text-gold">Trusted by your Circle</p>
              </div>
            </div>

            <div className="relative z-10 mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <div className="cc-theme-card rounded-2xl border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-card-bg)] p-3 sm:p-4"><Users size={16} className="text-gold" /><p className="mt-2 text-2xl font-semibold text-foreground">{card.trust.verifiedConnectionCount}</p><p className="mt-1 text-xs text-muted">Verified Connections</p></div>
              <div className="cc-theme-card rounded-2xl border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-card-bg)] p-3 sm:p-4"><MessageSquareQuote size={16} className="text-gold" /><p className="mt-2 text-2xl font-semibold text-foreground">{card.trust.verifiedTestimonialCount}</p><p className="mt-1 text-xs text-muted">Verified Testimonials</p></div>
              {card.averageWalletTestimonialRating !== null ? <div className="cc-theme-card rounded-2xl border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-card-bg)] p-3 sm:p-4"><Star size={16} className="text-gold" fill="currentColor" /><p className="mt-2 text-2xl font-semibold text-foreground">{card.averageWalletTestimonialRating}</p><p className="mt-1 text-xs text-muted">Average Rating</p></div> : null}
              <div className="cc-theme-card rounded-2xl border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-card-bg)] p-3 sm:p-4"><CalendarDays size={16} className="text-gold" /><p className="mt-2 text-sm font-semibold text-foreground">{dateFormatter.format(card.createdAt)}</p><p className="mt-1 text-xs text-muted">Circle Card Member Since</p></div>
              <div className="cc-theme-card rounded-2xl border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-card-bg)] p-3 sm:p-4"><Sparkles size={16} className="text-gold" /><p className="mt-2 text-2xl font-semibold text-foreground">{platformSignalCount}</p><p className="mt-1 text-xs text-muted">Platform Signals</p></div>
            </div>
          </section>

          {ownerModeration ? (
            <CircleTrustOwnerModeration
              cardId={card.id}
              initialPendingTestimonials={ownerModeration.pendingTestimonials}
              pendingConcerns={ownerModeration.pendingConcerns}
            />
          ) : null}

          <section aria-labelledby="trust-summary-title" className="rounded-[1.75rem] border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-secondary-bg)] p-4 shadow-[var(--cc-theme-secondary-shadow)] sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gold">Trust Summary</p>
            <h2 id="trust-summary-title" className="mt-2 font-display text-2xl font-semibold text-foreground sm:text-3xl">Trust you can understand at a glance</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">Every signal below comes from stored platform data. Nothing is inferred, purchased or added because of a rating.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {card.trust.signals.map((signal) => (
                <article key={signal.id} className="cc-theme-card group rounded-2xl border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-card-bg)] p-4 transition-colors hover:border-[color:var(--cc-theme-button-border)] hover:bg-[var(--cc-theme-secondary-hover-bg)]">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gold/22 bg-gold/10 text-gold"><CheckCircle2 size={16} /></span>
                  <p className="mt-3 text-sm font-semibold text-foreground">{signal.count !== undefined ? `${signal.count} ` : ""}{signal.label}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">{signal.description}</p>
                </article>
              ))}
            </div>
            {card.trust.manualTestimonialCount > 0 ? <p className="mt-4 text-xs leading-relaxed text-muted">Owner-managed testimonials may appear on the Circle Card, but only approved Wallet testimonials contribute verified relationship proof.</p> : null}
          </section>

          <section aria-labelledby="trust-timeline-title" className="overflow-hidden rounded-[1.75rem] border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-secondary-bg)] shadow-[var(--cc-theme-secondary-shadow)]">
            <div className="p-4 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gold">Living Trust Profile</p>
              <h2 id="trust-timeline-title" className="mt-2 font-display text-2xl font-semibold text-foreground sm:text-3xl">Trust Timeline</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">A dated history of genuine connections, approved trust signals and platform verification.</p>
            </div>
            {card.trust.timeline.length ? (
              <ol className="border-t border-silver/10 px-4 py-2 sm:px-6">
                {card.trust.timeline.map((event, index) => (
                  <li key={event.id} className="relative grid grid-cols-[36px_minmax(0,1fr)] gap-3 py-4 sm:grid-cols-[42px_minmax(0,1fr)_120px]">
                    {index < card.trust.timeline.length - 1 ? <span aria-hidden="true" className="absolute bottom-0 left-[17px] top-10 w-px bg-gradient-to-b from-gold/34 to-silver/8 sm:left-[20px]" /> : null}
                    <span className="relative z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gold/24 bg-background text-gold sm:h-10 sm:w-10">{timelineIcon(event.kind)}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground">{event.title}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted">{event.description}</span>
                      <span className="mt-1.5 block text-[11px] font-medium text-gold sm:hidden">{timelineDate(event.occurredAt)}</span>
                    </span>
                    <span className="hidden text-right text-xs font-medium text-silver sm:block">{timelineDate(event.occurredAt)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="border-t border-silver/10 p-5 text-sm text-muted sm:p-6">This trust timeline will grow as verified relationships and approved trust signals are recorded.</p>
            )}
          </section>

          <section aria-labelledby="verified-testimonials-title" className="rounded-[1.75rem] border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-secondary-bg)] p-4 shadow-[var(--cc-theme-secondary-shadow)] sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gold">Verified Trust Signals</p>
                <h2 id="verified-testimonials-title" className="mt-2 font-display text-2xl font-semibold text-foreground sm:text-3xl">Verified Testimonials</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">Only approved testimonials tied to a genuine Circle Wallet relationship appear here.</p>
              </div>
              {!viewerIsOwner && canReceiveTrustSignals && !card.isDemo ? <Link href={testimonialHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-10 shrink-0 gap-2")}><ShieldCheck size={14} /> Build their Circle Trust</Link> : null}
            </div>

            {card.trust.latestVerifiedTestimonials.length ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {card.trust.latestVerifiedTestimonials.map((testimonial) => (
                  <article key={testimonial.id} className="cc-theme-card flex min-w-0 flex-col rounded-[1.35rem] border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-card-bg)] p-4 shadow-inner-surface sm:p-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={testimonial.reviewerName} image={testimonial.reviewerImageUrl} className="h-11 w-11 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{testimonial.reviewerName}</p>
                        {testimonial.reviewerRoleOrCompany ? <p className="truncate text-xs text-muted">{testimonial.reviewerRoleOrCompany}</p> : null}
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-300/18 bg-emerald-300/[0.06] px-2 py-1 text-[10px] font-semibold text-emerald-200"><BadgeCheck size={11} /> Verified Wallet</span>
                    </div>

                    {testimonial.rating ? <div className="mt-4 flex text-gold" aria-label={`${testimonial.rating} out of 5 stars`}>{Array.from({ length: testimonial.rating }, (_, index) => <Star key={index} size={13} fill="currentColor" aria-hidden="true" />)}</div> : null}
                    <blockquote className="mt-3 flex-1"><p className="text-sm leading-relaxed text-silver">&ldquo;{testimonial.testimonialText}&rdquo;</p></blockquote>
                    <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-silver/10 pt-3 text-[11px] text-muted">
                      <span>{testimonial.relationship ? circleCardWalletTestimonialRelationshipLabel(testimonial.relationship) : "Verified relationship"}</span>
                      <span>{dateFormatter.format(testimonial.verifiedAt)}</span>
                    </footer>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-2xl border border-dashed border-silver/16 bg-background/18 p-5 text-sm text-muted">No approved Wallet testimonials are public yet. Circle Trust can still grow through genuine connections and verified platform signals.</p>
            )}
          </section>

          <section aria-labelledby="trust-explanation-title" className="rounded-[1.75rem] border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-secondary-bg)] p-4 shadow-[var(--cc-theme-secondary-shadow)] sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gold">How Circle Trust Works</p>
            <h2 id="trust-explanation-title" className="mt-2 font-display text-2xl font-semibold text-foreground sm:text-3xl">Trust is earned, not averaged</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">Circle Trust is a living professional trust profile—not a five-star ranking. Verified relationships build over time, while concerns enter human moderation before they can affect trust.</p>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {[
                { icon: Users, title: "Why this score exists", body: "It brings verified relationships and completed platform signals into one clear, explainable profile." },
                { icon: Link2, title: "How trust grows", body: "Accepted connections, approved Wallet testimonials and genuine platform signals contribute transparently." },
                { icon: ShieldCheck, title: "Why fake reviews are harder", body: "Verified testimonials must come through a saved Circle Wallet relationship and be approved before publication." },
                { icon: LockKeyhole, title: "How concerns are handled", body: "Reports enter moderation. Trust is not reduced automatically, protecting people from malicious attacks." }
              ].map(({ icon: Icon, title, body }) => (
                <details key={title} className="group rounded-2xl border border-silver/12 bg-background/20">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-3.5 py-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden"><span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-gold/10 text-gold"><Icon size={14} /></span><span className="min-w-0 flex-1">{title}</span><span className="text-gold transition-transform group-open:rotate-45">+</span></summary>
                  <p className="border-t border-silver/10 px-4 py-3 text-xs leading-relaxed text-muted">{body}</p>
                </details>
              ))}
            </div>
          </section>

          {!card.isDemo ? (
            <section aria-labelledby="trust-concern-title" className="rounded-[1.5rem] border border-silver/12 bg-[var(--cc-theme-secondary-bg)] p-4 shadow-[var(--cc-theme-secondary-shadow)] sm:p-5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-silver/14 bg-background/24 text-silver"><LockKeyhole size={16} /></span>
                <div className="min-w-0">
                  <h2 id="trust-concern-title" className="text-base font-semibold text-foreground">Raise a concern</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted">Concerns enter pending human moderation. They are not published and do not reduce Circle Trust before a moderation decision.</p>
                </div>
              </div>
              <CircleCardReportForm cardId={card.id} cardSlug={card.slug} className="mt-4" />
            </section>
          ) : null}

          <footer className="flex flex-col gap-3 rounded-[1.35rem] border border-silver/10 bg-white/[0.025] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3"><CircleCardLogoMark className="h-9 w-9" alt="" /><div><p className="text-sm font-semibold text-foreground">Circle Trust by Circle Card</p><p className="text-xs text-muted">A living profile of professional trust.</p></div></div>
            <Link href={`/card/${card.slug}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-10 gap-2")}><ArrowLeft size={14} /> Return to Circle Card</Link>
          </footer>
        </main>
      </div>
    </div>
  );
}
