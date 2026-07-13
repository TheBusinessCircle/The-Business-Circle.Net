import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  CircleHelp,
  Crown,
  Eye,
  Handshake,
  Layers3,
  Palette,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UserRound
} from "lucide-react";
import { registerCircleCardProInterestAction } from "@/actions/circle-card-pro.actions";
import { auth } from "@/auth";
import {
  CircleCardInterestSubmitButton,
  CircleCardProCheckoutButtons,
  CircleCardProPageAnalytics
} from "@/components/circle-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCircleCardPageMetadata } from "@/lib/circle-card/metadata";
import {
  circleCardProCapabilityLabel,
  normalizeCircleCardProIntent,
  type CircleCardProCapability,
  type CircleCardProSource
} from "@/lib/circle-card/pro-intent";
import { CIRCLE_CARD_DASHBOARD_PATH } from "@/lib/circle-card/routes";
import { formatCircleCardPrice, getCircleCardBillingReadiness } from "@/lib/circle-card/pricing";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { loadCircleCardAccessForUser } from "@/server/circle-card";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createCircleCardPageMetadata({
  title: "Circle Card Pro — £9.99/month",
  description:
    "Circle Card Pro is the active working layer for a living professional identity: two cards, Circle Studio, Business Builder and expanded Creator tools.",
  path: "/circle-card/pro",
  keywords: ["Circle Card Pro", "professional identity platform", "creator media kit", "business card builder"]
});

const FREE_FEATURES = [
  "One useful Circle Card",
  "Five active links",
  "Personal, Business and Creator base layouts",
  "Profile image and business logo",
  "Contact and social details",
  "QR, sharing, vCard and wallet",
  "Spin to Connect",
  "Referrals and introductions",
  "Core Circle Trust signals",
  "Basic analytics"
] as const;

const PRO_FEATURES = [
  "Two Circle Cards",
  "25 active links",
  "Circle Studio public activation",
  "Private Studio drafts and real-card preview",
  "Business Card Builder",
  "Creator Media Kit",
  "Audience Snapshot",
  "Expanded creator content, offers, proof and partnerships",
  "Paid business presentation modules",
  "Subscription management",
  "Automatic downgrade preservation and restoration"
] as const;

const FAQS = [
  {
    question: "Is there a trial?",
    answer: "No. Circle Card Pro launches as a straightforward £9.99 monthly subscription with no trial."
  },
  {
    question: "Can I cancel?",
    answer: "Yes. Manage or cancel the monthly subscription through the secure Stripe Customer Portal."
  },
  {
    question: "What happens if a payment fails?",
    answer: "A seven-day recovery period gives you time to update your payment method. Your saved content is not deleted."
  },
  {
    question: "What happens after I downgrade?",
    answer: "Your public card safely follows Free limits while Pro cards, links, Studio designs and presentation content remain stored. Reactivating Pro restores them automatically."
  },
  {
    question: "Do I need Pro for Circle Trust or networking?",
    answer: "No. Referrals, introductions, Spin to Connect and core Circle Trust remain useful parts of Free."
  },
  {
    question: "Is BCN membership the same subscription?",
    answer: "No. Circle Card billing is separate. Where an active BCN membership already includes Pro, no separate Circle Card checkout is needed."
  }
] as const;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function feedbackMessage(input: { registered: string; error: string; billing: string }) {
  if (input.registered === "1") {
    return { type: "notice" as const, message: "Your Pro interest is registered. We’ll keep your intended next step ready." };
  }
  if (input.billing === "cancelled") {
    return { type: "notice" as const, message: "Checkout was cancelled. No paid access was opened and your Circle Card is unchanged." };
  }
  const errors: Record<string, string> = {
    invalid: "Check the form and confirm contact permission.",
    "rate-limited": "Too many interest requests were submitted recently. Try again later.",
    failed: "The interest form could not be saved. Your details remain in the form; please try again."
  };
  return input.error && errors[input.error] ? { type: "error" as const, message: errors[input.error] } : null;
}

export default async function CircleCardProPage({ searchParams }: PageProps) {
  const [params, session] = await Promise.all([searchParams, auth()]);
  const billingReadiness = getCircleCardBillingReadiness();
  const requestedIntent = normalizeCircleCardProIntent({
    source: firstValue(params.source) as CircleCardProSource,
    capability: firstValue(params.capability) as CircleCardProCapability,
    returnPath: firstValue(params.returnTo),
    cardId: firstValue(params.card) || undefined
  });
  const [userContext, circleCardAccess] = session?.user?.id
    ? await Promise.all([
        prisma.user.findUnique({
          where: { id: session.user.id },
          select: {
            id: true,
            name: true,
            email: true,
            suspended: true,
            circleCards: {
              where: { archivedAt: null },
              orderBy: [{ isDefaultCard: "desc" }, { isPrimary: "desc" }, { displayOrder: "asc" }],
              select: { id: true, slug: true, fullName: true, businessName: true }
            }
          }
        }),
        loadCircleCardAccessForUser(session.user.id)
      ])
    : [null, null];
  const activeUser = userContext && !userContext.suspended ? userContext : null;
  const ownedRequestedCard = activeUser?.circleCards.find((card) => card.id === requestedIntent.cardId);
  const intent = normalizeCircleCardProIntent({
    ...requestedIntent,
    cardId: ownedRequestedCard?.id
  });
  const primaryCard = activeUser?.circleCards[0] ?? null;
  const checkoutReady = billingReadiness.billingEnabled && billingReadiness.proLaunchConfigured;
  const feedback = feedbackMessage({
    registered: firstValue(params.registered),
    error: firstValue(params.error),
    billing: firstValue(params.billing)
  });
  const proPrice = formatCircleCardPrice("PRO");
  const intentLabel = circleCardProCapabilityLabel(intent.capability);
  const entitlementCopy = circleCardAccess?.hasProAccess
    ? `${circleCardAccess.entitlement.label} already includes Circle Card Pro. No separate checkout is needed.`
    : null;

  return (
    <div className="public-page-stack">
      <CircleCardProPageAnalytics
        source={intent.source}
        capability={intent.capability}
        billingEnabled={checkoutReady}
        authenticated={Boolean(activeUser)}
        hasProAccess={Boolean(circleCardAccess?.hasProAccess)}
      />

      <section className="relative overflow-hidden rounded-[2rem] border border-gold/24 bg-[radial-gradient(circle_at_80%_10%,rgba(212,175,55,.18),transparent_34%),linear-gradient(145deg,rgba(9,19,43,.98),rgba(4,9,20,.98))] p-6 shadow-panel-soft sm:p-9 lg:p-12">
        <div className="max-w-4xl">
          <Badge variant="outline" className="border-gold/32 bg-gold/10 text-gold">
            <Crown size={13} className="mr-1.5" /> Circle Card Pro
          </Badge>
          <h1 className="mt-5 font-display text-4xl leading-[1.04] text-foreground sm:text-6xl lg:text-7xl">
            Your professional identity should keep working after the introduction.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-silver sm:text-xl">
            Circle Card is a living professional identity, connection and relationship platform. Pro is the active working layer for people who need more than one card, a stronger public presentation, and focused Business or Creator tools.
          </p>
          <div className="mt-6 flex flex-wrap items-end gap-3">
            <p className="font-display text-4xl font-semibold text-foreground">£9.99</p>
            <p className="pb-1 text-sm text-muted">per month · monthly only · no trial</p>
          </div>
          {intent.capability !== "explore_pro" ? (
            <p className="mt-4 rounded-xl border border-gold/22 bg-gold/8 px-4 py-3 text-sm text-gold">
              You came here to {intentLabel}. We’ll keep that next step attached to your journey.
            </p>
          ) : null}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start">
            {entitlementCopy ? (
              <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                <BadgeCheck size={16} className="mr-2 inline" />{entitlementCopy}
              </div>
            ) : (
              <CircleCardProCheckoutButtons
                monthlyLabel={proPrice}
                billingEnabled={checkoutReady}
                authenticated={Boolean(activeUser)}
                intent={intent}
                label="Unlock Circle Card Pro — £9.99/month"
                earlyAccessLabel="Register for Pro early access"
                showPrice={false}
              />
            )}
            <Link href={CIRCLE_CARD_DASHBOARD_PATH} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "gap-2")}>
              Open Circle Card <ArrowRight size={16} />
            </Link>
          </div>
          {!checkoutReady && !entitlementCopy ? (
            <p className="mt-3 text-sm text-muted">Pro payments are opening shortly. The early-access journey never calls Stripe and takes no payment.</p>
          ) : null}
        </div>
      </section>

      {feedback ? (
        <section role={feedback.type === "error" ? "alert" : "status"} className={cn("rounded-xl border p-4 text-sm", feedback.type === "error" ? "border-red-400/35 bg-red-400/10 text-red-100" : "border-emerald-400/25 bg-emerald-400/10 text-emerald-100")}>{feedback.message}</section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[.72fr_1.28fr] lg:items-center">
        <div>
          <p className="premium-kicker">Why Pro exists</p>
          <h2 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">Free introduces you. Pro helps you work from that identity.</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">A useful card should be generous before payment. Pro becomes relevant when your identity needs distinct roles, richer proof, active presentation control or a clearer route from interest to conversation.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            [Layers3, "Separate contexts", "Use a second card for a distinct professional role."],
            [Palette, "Shape the experience", "Build privately in Studio, then apply with authority."],
            [Handshake, "Support real work", "Present services, creator proof and partnership context clearly."]
          ].map(([Icon, title, body]) => {
            const FeatureIcon = Icon as typeof Layers3;
            return <article key={String(title)} className="rounded-2xl border border-silver/14 bg-card/62 p-5"><FeatureIcon size={20} className="text-gold" /><h3 className="mt-4 font-semibold text-foreground">{String(title)}</h3><p className="mt-2 text-sm leading-relaxed text-muted">{String(body)}</p></article>;
          })}
        </div>
      </section>

      <section aria-labelledby="comparison-heading" className="rounded-[1.75rem] border border-silver/14 bg-card/58 p-5 sm:p-7">
        <div className="max-w-3xl"><p className="premium-kicker">Free versus Pro</p><h2 id="comparison-heading" className="mt-3 font-display text-3xl text-foreground sm:text-4xl">Choose the layer your work needs now.</h2><p className="mt-3 text-sm text-muted">Free remains a complete, useful professional card. Pro adds working depth; it does not remove the relationship tools that make Free valuable.</p></div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-silver/16 bg-background/25 p-5"><div className="flex items-center justify-between gap-3"><h3 className="font-display text-2xl text-foreground">Circle Card Free</h3><Badge variant="outline">£0</Badge></div><ul className="mt-5 grid gap-2 sm:grid-cols-2">{FREE_FEATURES.map((feature) => <li key={feature} className="flex gap-2 text-sm text-silver"><Check size={15} className="mt-0.5 shrink-0 text-emerald-300" />{feature}</li>)}</ul></article>
          <article className="rounded-2xl border border-gold/30 bg-gold/[.07] p-5"><div className="flex items-center justify-between gap-3"><h3 className="font-display text-2xl text-foreground">Circle Card Pro</h3><Badge variant="premium">£9.99/month</Badge></div><ul className="mt-5 grid gap-2 sm:grid-cols-2">{PRO_FEATURES.map((feature) => <li key={feature} className="flex gap-2 text-sm text-silver"><Sparkles size={15} className="mt-0.5 shrink-0 text-gold" />{feature}</li>)}</ul></article>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-gold/22 bg-card/62 p-6"><BriefcaseBusiness size={22} className="text-gold" /><h2 className="mt-4 font-display text-2xl text-foreground">For a business people need to understand quickly</h2><p className="mt-3 text-sm leading-relaxed text-muted">Use Business Card Builder to present services, products, prices, opening hours, booking routes, galleries and reviews as one coherent professional identity.</p></article>
        <article className="rounded-2xl border border-cyan-300/20 bg-card/62 p-6"><UserRound size={22} className="text-cyan-200" /><h2 className="mt-4 font-display text-2xl text-foreground">For a creator brands need to assess clearly</h2><p className="mt-3 text-sm leading-relaxed text-muted">Build a live Media Kit and Audience Snapshot, then add creator content, offers, proof and partnership context without turning your card into a generic landing page.</p></article>
        <article className="rounded-2xl border border-silver/16 bg-card/62 p-6"><Layers3 size={22} className="text-silver" /><h2 className="mt-4 font-display text-2xl text-foreground">For one person with more than one professional context</h2><p className="mt-3 text-sm leading-relaxed text-muted">Keep two Circle Cards under one account: for example, a personal relationship card and a focused Business or Creator card. Each remains intentional.</p></article>
      </section>

      <section className="grid gap-5 rounded-[1.75rem] border border-gold/24 bg-[linear-gradient(135deg,rgba(212,175,55,.1),rgba(6,12,27,.7))] p-6 lg:grid-cols-[.9fr_1.1fr] lg:items-center sm:p-8">
        <div><Palette size={24} className="text-gold" /><h2 className="mt-4 font-display text-3xl text-foreground">Circle Studio is a safe place to experiment before anything goes live.</h2><p className="mt-3 text-sm leading-relaxed text-muted">Everyone can edit colours and typography, explore layouts, preview their actual card and save a private draft. Pro activates that saved design publicly, replaces it later, or reverts it — always through server-authorised entitlement.</p></div>
        <div className="grid gap-3 sm:grid-cols-2">{["Real-card preview", "Private draft saving", "Public activation with Pro", "Revert and automatic restoration"].map((item) => <div key={item} className="rounded-xl border border-silver/14 bg-background/28 p-4 text-sm font-medium text-foreground"><BadgeCheck size={16} className="mb-2 text-gold" />{item}</div>)}</div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[.06] p-6"><ShieldCheck size={22} className="text-emerald-300" /><h2 className="mt-4 font-display text-2xl text-foreground">Trust and relationships stay Free</h2><p className="mt-3 text-sm leading-relaxed text-muted">Core Circle Trust, referrals, introductions, wallet, QR, sharing, vCard and Spin to Connect remain available on Free. Connection is not a paid gate.</p></article>
        <article className="rounded-2xl border border-gold/22 bg-gold/[.06] p-6"><RotateCcw size={22} className="text-gold" /><h2 className="mt-4 font-display text-2xl text-foreground">Your work is preserved through change</h2><p className="mt-3 text-sm leading-relaxed text-muted">Cancel through Stripe Customer Portal. Failed payments receive seven days to recover. After downgrade, Free styling and limits apply publicly while Pro content stays stored; confirmed reactivation restores it automatically.</p></article>
      </section>

      <section aria-labelledby="faq-heading" className="rounded-[1.75rem] border border-silver/14 bg-card/58 p-5 sm:p-7">
        <div className="flex items-center gap-3"><CircleHelp size={22} className="text-gold" /><h2 id="faq-heading" className="font-display text-3xl text-foreground">Questions before you choose</h2></div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">{FAQS.map((item) => <details key={item.question} className="group rounded-xl border border-silver/14 bg-background/22 p-4"><summary className="cursor-pointer list-none font-semibold text-foreground">{item.question}</summary><p className="mt-3 text-sm leading-relaxed text-muted">{item.answer}</p></details>)}</div>
      </section>

      <section id="register-interest" className="scroll-mt-24 rounded-[1.75rem] border border-gold/26 bg-card/72 p-5 shadow-panel-soft sm:p-7">
        {checkoutReady && !circleCardAccess?.hasProAccess ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="premium-kicker">Ready when you are</p><h2 className="mt-3 font-display text-3xl text-foreground">Put your Circle Card to work.</h2><p className="mt-2 text-sm text-muted">£9.99 per month. Monthly only. No trial. Your return to {intentLabel} is preserved.</p></div><CircleCardProCheckoutButtons monthlyLabel={proPrice} billingEnabled authenticated={Boolean(activeUser)} intent={intent} label="Unlock Circle Card Pro — £9.99/month" showPrice={false} /></div>
        ) : circleCardAccess?.hasProAccess ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="premium-kicker">Pro is confirmed</p><h2 className="mt-2 font-display text-3xl text-foreground">Your account already has the working layer.</h2><p className="mt-2 text-sm text-muted">{entitlementCopy}</p></div><Link href={intent.returnPath} className={cn(buttonVariants({ size: "lg" }), "gap-2")}>Continue to {intentLabel}<ArrowRight size={16} /></Link></div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[.85fr_1.15fr]"><div><p className="premium-kicker">Payments opening shortly</p><h2 className="mt-3 font-display text-3xl text-foreground">Register Pro interest</h2><p className="mt-3 text-sm leading-relaxed text-muted">Tell us you want Circle Card Pro. No payment is taken, Stripe Checkout is not called, and your intended return to {intentLabel} is kept with this journey.</p></div><form action={registerCircleCardProInterestAction} className="grid gap-4"><input type="hidden" name="source" value={intent.source} /><input type="hidden" name="capability" value={intent.capability} /><input type="hidden" name="returnTo" value={intent.returnPath} />{intent.cardId ? <input type="hidden" name="card" value={intent.cardId} /> : null}<div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" name="name" defaultValue={activeUser?.name || primaryCard?.fullName || ""} required autoComplete="name" /></div><div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" defaultValue={activeUser?.email || ""} required autoComplete="email" /></div></div><div className="space-y-2"><Label htmlFor="businessName">Business name optional</Label><Input id="businessName" name="businessName" defaultValue={primaryCard?.businessName || ""} autoComplete="organization" /></div><label className="flex items-start gap-3 rounded-xl border border-silver/14 bg-background/24 p-3 text-sm text-muted"><input name="contactConsent" type="checkbox" value="on" required className="mt-1 h-4 w-4 accent-primary" /><span>You may contact me about Circle Card Pro opening.</span></label><label className="flex items-start gap-3 rounded-xl border border-silver/14 bg-background/24 p-3 text-sm text-muted"><input name="marketingEmailOptIn" type="checkbox" value="on" className="mt-1 h-4 w-4 accent-primary" /><span>Send occasional Circle Card and Business Circle updates.</span></label><CircleCardInterestSubmitButton /></form></div>
        )}
      </section>

      <section className="pb-4 text-center text-xs leading-relaxed text-muted"><Eye size={14} className="mr-1.5 inline" />Billing status and Pro access are always confirmed by the server. A URL or browser message cannot grant paid access.</section>
    </div>
  );
}
