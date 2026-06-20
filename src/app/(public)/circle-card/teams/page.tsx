import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  ContactRound,
  Crown,
  Network,
  QrCode,
  ShieldCheck,
  UsersRound,
  WalletCards
} from "lucide-react";
import { registerCircleCardTeamsInterestAction } from "@/actions/circle-card-pro.actions";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CIRCLE_CARD_DASHBOARD_PATH } from "@/lib/circle-card/routes";
import {
  formatCircleCardPrice,
  getCircleCardBillingReadiness
} from "@/lib/circle-card/pricing";
import { prisma } from "@/lib/prisma";
import { createPageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type FeatureStatus = "Available" | "Coming soon / early access";

export const metadata: Metadata = createPageMetadata({
  title: "Circle Card Teams",
  description:
    "Register interest in Circle Card Teams, the company-wide relationship system for staff cards, shared contacts, and team control.",
  path: "/circle-card/teams",
  keywords: [
    "Circle Card Teams",
    "company digital business cards",
    "staff digital cards",
    "team networking",
    "shared contacts"
  ]
});

const DECISION_STEPS = [
  {
    label: "What",
    title: "Company-wide Circle Card.",
    body: "Teams connects staff cards, company identity, shared contacts and team visibility."
  },
  {
    label: "Who",
    title: "Built for organisations.",
    body: "Companies, teams, franchises, local groups and operators with more than one public face."
  },
  {
    label: "How",
    title: "One relationship system.",
    body: "Company wallet, employee cards, team analytics, staff verification and owner/admin control."
  },
  {
    label: "When",
    title: "Upgrade when the team networks.",
    body: "When staff meet prospects, collect contacts, share referrals or need consistent company visibility."
  }
] as const;

const TEAMS_FEATURES: Array<{ label: string; status: FeatureStatus }> = [
  { label: "Company wallet", status: "Coming soon / early access" },
  { label: "Employee cards", status: "Coming soon / early access" },
  { label: "Shared contacts", status: "Coming soon / early access" },
  { label: "Team analytics", status: "Coming soon / early access" },
  { label: "Owner/admin control", status: "Coming soon / early access" },
  { label: "Owner/staff verification", status: "Coming soon / early access" },
  { label: "Company profile", status: "Coming soon / early access" },
  { label: "Team networking visibility", status: "Coming soon / early access" }
];

const PLAN_BOUNDARY = [
  {
    name: "Free",
    fit: "Personal/basic use",
    icon: QrCode
  },
  {
    name: "Pro",
    fit: "Individual visibility, analytics, leads and relationship growth",
    icon: Crown
  },
  {
    name: "Teams",
    fit: "Company-wide relationship system for staff and shared contacts",
    icon: Building2
  },
  {
    name: "BCN",
    fit: "Founder environment, community, support, resources and business relationships",
    icon: Network
  }
] as const;

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function feedbackMessage(input: { registered: string; error: string }) {
  if (input.registered === "1") {
    return {
      type: "notice" as const,
      message: "Interest registered. We have logged this as Circle Card Teams interest."
    };
  }

  const errors: Record<string, string> = {
    invalid: "Check the form and confirm contact permission.",
    "rate-limited": "Too many interest requests were submitted recently. Try again later.",
    failed: "The interest form could not be saved. Please try again."
  };

  return input.error && errors[input.error]
    ? { type: "error" as const, message: errors[input.error] }
    : null;
}

export default async function CircleCardTeamsPage({ searchParams }: PageProps) {
  const [params, session] = await Promise.all([searchParams, auth()]);
  const billingReadiness = getCircleCardBillingReadiness();
  const userContext = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          suspended: true,
          circleCards: {
            orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
            take: 1,
            select: {
              slug: true,
              fullName: true,
              businessName: true,
              websiteUrl: true
            }
          }
        }
      })
    : null;
  const activeUser = userContext && !userContext.suspended ? userContext : null;
  const primaryCard = activeUser?.circleCards[0] ?? null;
  const feedback = feedbackMessage({
    registered: firstValue(params.registered),
    error: firstValue(params.error)
  });
  const defaultName = activeUser?.name || primaryCard?.fullName || "";
  const defaultEmail = activeUser?.email || "";
  const defaultBusinessName = primaryCard?.businessName || "";
  const defaultWebsite = primaryCard?.websiteUrl || "";
  const teamsPrice = formatCircleCardPrice("TEAMS");

  return (
    <div className="public-page-stack">
      <section className="grid gap-6 py-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.55fr)] lg:items-center lg:py-8">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/24 bg-gold/10 px-3 py-1 text-xs uppercase tracking-[0.08em] text-gold">
            <UsersRound size={14} />
            Circle Card Teams / {teamsPrice}
          </div>
          <h1 className="mt-4 font-display text-4xl leading-tight text-foreground sm:text-6xl">
            Give every staff connection a company relationship layer.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-silver sm:text-lg">
            Teams turns Circle Card into a shared company system for staff cards, contacts,
            analytics, identity and owner control.
          </p>
          <Badge variant="outline" className="mt-4 w-fit border-gold/28 text-gold">
            {billingReadiness.billingEnabled ? "Billing prepared" : "Early access"}
          </Badge>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {billingReadiness.billingEnabled ? (
              <Button type="button" size="lg" disabled className="w-full gap-2 sm:w-auto">
                Checkout CTA prepared
                <ArrowRight size={16} />
              </Button>
            ) : (
              <a
                href="#register-interest"
                className={cn(buttonVariants({ size: "lg" }), "w-full gap-2 sm:w-auto")}
              >
                Register Teams Interest
                <ArrowRight size={16} />
              </a>
            )}
            <Link
              href={CIRCLE_CARD_DASHBOARD_PATH}
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full gap-2 sm:w-auto")}
            >
              Open Circle Card
              <QrCode size={16} />
            </Link>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
            Teams upgrades the company card system. BCN membership stays separate as the founder
            environment and community behind the wider ecosystem.
          </p>
        </div>

        <div className="rounded-xl border border-silver/14 bg-card/72 p-4 shadow-panel-soft">
          <div className="rounded-lg border border-silver/18 bg-[linear-gradient(145deg,rgba(9,19,43,0.96),rgba(6,12,27,0.9))] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Teams preview</p>
                <h2 className="mt-2 font-display text-2xl text-foreground">Company relationship layer</h2>
              </div>
              <Image
                src="/branding/circle-card-logo.png"
                width={52}
                height={52}
                alt="Circle Card logo"
                className="h-12 w-12 object-contain"
              />
            </div>
            <div className="mt-5 grid gap-2">
              {[
                { label: "Staff cards", icon: ContactRound },
                { label: "Shared contacts", icon: WalletCards },
                { label: "Team analytics", icon: BarChart3 },
                { label: "Owner control", icon: ShieldCheck }
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.label} className="flex items-center gap-3 rounded-lg border border-silver/12 bg-background/24 px-3 py-2">
                    <Icon size={16} className="text-gold" />
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {feedback ? (
        <section
          className={cn(
            "rounded-xl border p-4",
            feedback.type === "error"
              ? "border-red-500/40 bg-red-500/10 text-red-100"
              : "border-gold/30 bg-gold/10 text-gold"
          )}
        >
          <p className="text-sm">{feedback.message}</p>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {DECISION_STEPS.map((step) => (
          <article key={step.label} className="rounded-xl border border-silver/14 bg-card/62 p-4">
            <Badge variant="outline" className="border-gold/25 text-gold">
              {step.label}
            </Badge>
            <h2 className="mt-3 text-lg font-semibold text-foreground">{step.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
        <div className="rounded-xl border border-gold/24 bg-gold/10 p-5">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gold/28 bg-background/24 text-gold">
            <Building2 size={18} />
          </div>
          <h2 className="mt-4 font-display text-3xl text-foreground">Which option fits?</h2>
          <div className="mt-4 grid gap-2">
            {PLAN_BOUNDARY.map((plan) => {
              const Icon = plan.icon;

              return (
                <div key={plan.name} className="rounded-lg border border-silver/12 bg-background/24 p-3">
                  <div className="flex items-start gap-2">
                    <Icon size={15} className="mt-0.5 shrink-0 text-gold" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted">{plan.fit}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <article className="rounded-xl border border-silver/14 bg-card/62 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Teams feature preview</h3>
              <p className="mt-1 text-sm text-muted">Company-wide tools prepared for early access.</p>
            </div>
            <Badge variant="outline" className="border-silver/18 bg-silver/10 text-silver">
              Coming soon / early access
            </Badge>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {TEAMS_FEATURES.map((feature) => (
              <div key={feature.label} className="rounded-lg border border-silver/12 bg-background/24 p-3">
                <div className="flex items-start gap-2">
                  <BadgeCheck size={15} className="mt-0.5 shrink-0 text-gold" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{feature.label}</p>
                    <p className="mt-1 text-xs text-muted">{feature.status}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section id="register-interest" className="scroll-mt-24 rounded-xl border border-gold/24 bg-card/72 p-5 shadow-panel-soft sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(320px,0.65fr)]">
          <div>
            <Badge variant="outline" className="border-gold/28 text-gold">
              Where next
            </Badge>
            <h2 className="mt-3 font-display text-3xl text-foreground">Register Teams Interest</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Join the Teams early-access list. No payment, no Stripe checkout, no BCN membership change.
            </p>
            {billingReadiness.billingEnabled ? (
              <p className="mt-3 rounded-lg border border-gold/24 bg-gold/10 p-3 text-xs leading-relaxed text-gold">
                Billing flag is enabled, but checkout is intentionally not active in this prep phase.
              </p>
            ) : null}
            <div className="mt-4 grid gap-2 text-sm text-muted">
              <p className="inline-flex items-center gap-2">
                <ShieldCheck size={15} className="text-gold" />
                Source logged as Circle Card Teams interest.
              </p>
              <p className="inline-flex items-center gap-2">
                <WalletCards size={15} className="text-gold" />
                Logged-in card context attached automatically.
              </p>
              <p className="inline-flex items-center gap-2">
                <Crown size={15} className="text-gold" />
                Pro and Teams interest stay separate.
              </p>
            </div>
          </div>

          <form action={registerCircleCardTeamsInterestAction} className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={defaultName} required autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={defaultEmail} required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessName">Company/business name</Label>
              <Input id="businessName" name="businessName" defaultValue={defaultBusinessName} required autoComplete="organization" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="teamSize">Team size optional</Label>
                <Input id="teamSize" name="teamSize" placeholder="5-20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website optional</Label>
                <Input id="website" name="website" defaultValue={defaultWebsite} autoComplete="url" />
              </div>
            </div>
            {primaryCard ? (
              <div className="rounded-lg border border-silver/14 bg-background/24 p-3 text-xs text-muted">
                Logged-in card: /card/{primaryCard.slug}
              </div>
            ) : null}
            <label
              htmlFor="contactConsent"
              className="flex items-start gap-3 rounded-lg border border-silver/14 bg-background/24 p-3 text-sm text-muted"
            >
              <input
                id="contactConsent"
                name="contactConsent"
                type="checkbox"
                value="on"
                required
                className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
              />
              <span>You may contact me about Circle Card Teams early access.</span>
            </label>
            <label
              htmlFor="marketingEmailOptIn"
              className="flex items-start gap-3 rounded-lg border border-silver/14 bg-background/24 p-3 text-sm text-muted"
            >
              <input
                id="marketingEmailOptIn"
                name="marketingEmailOptIn"
                type="checkbox"
                value="on"
                className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
              />
              <span>Send occasional Circle Card and Business Circle updates.</span>
            </label>
            <Button type="submit" className="w-full gap-2">
              Register Teams Interest
              <ArrowRight size={16} />
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
