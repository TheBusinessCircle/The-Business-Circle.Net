import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  Crown,
  FileText,
  Handshake,
  Link as LinkIcon,
  Palette,
  QrCode,
  ShieldCheck,
  UsersRound,
  WalletCards
} from "lucide-react";
import { registerCircleCardProInterestAction } from "@/actions/circle-card-pro.actions";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CIRCLE_CARD_DASHBOARD_PATH } from "@/lib/circle-card/routes";
import { prisma } from "@/lib/prisma";
import { createPageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type FeatureStatus = "Available" | "Available during early access" | "Coming soon / early access";

export const metadata: Metadata = createPageMetadata({
  title: "Circle Card Pro",
  description:
    "Register interest in Circle Card Pro, the personal visibility and relationship upgrade for Circle Card.",
  path: "/circle-card/pro",
  keywords: [
    "Circle Card Pro",
    "digital business card analytics",
    "personal brand visibility",
    "lead capture card",
    "business networking profile"
  ]
});

const DECISION_STEPS = [
  {
    label: "What",
    title: "A stronger Circle Card.",
    body: "Pro turns a simple contact card into a sharper visibility and relationship tool."
  },
  {
    label: "Who",
    title: "Built for active operators.",
    body: "Founders, creators, consultants, tradespeople, service providers and personal brands."
  },
  {
    label: "How",
    title: "More control, more signal.",
    body: "Better links, analytics, profile control, lead capture, trust signals and verification prep."
  },
  {
    label: "When",
    title: "Upgrade when the card drives work.",
    body: "When your Circle Card helps you network, sell, get referrals or build your public profile."
  }
] as const;

const PLAN_COMPARISON: Array<{
  name: string;
  fit: string;
  icon: typeof Crown;
  status: FeatureStatus;
  features: Array<{ label: string; status: FeatureStatus }>;
}> = [
  {
    name: "Free",
    fit: "Personal/basic use",
    icon: QrCode,
    status: "Available",
    features: [
      { label: "1 card", status: "Available" },
      { label: "Basic profile", status: "Available" },
      { label: "QR sharing", status: "Available" },
      { label: "Save contacts", status: "Available" },
      { label: "Basic wallet", status: "Available" },
      { label: "5 featured links", status: "Available" }
    ]
  },
  {
    name: "Pro",
    fit: "Serious personal brand, founder, creator or business visibility",
    icon: Crown,
    status: "Coming soon / early access",
    features: [
      { label: "More featured links", status: "Coming soon / early access" },
      { label: "Better analytics", status: "Coming soon / early access" },
      { label: "File-backed links", status: "Available during early access" },
      { label: "Custom profile colours", status: "Available during early access" },
      { label: "Creator/business enhancements", status: "Available during early access" },
      { label: "Lead capture", status: "Coming soon / early access" },
      { label: "Trust/verification preparation", status: "Coming soon / early access" },
      { label: "Priority visibility preparation", status: "Coming soon / early access" }
    ]
  },
  {
    name: "Teams",
    fit: "Companies, staff, shared contacts and team control",
    icon: Building2,
    status: "Coming soon / early access",
    features: [
      { label: "Company wallet", status: "Coming soon / early access" },
      { label: "Employee cards", status: "Coming soon / early access" },
      { label: "Shared contacts", status: "Coming soon / early access" },
      { label: "Team analytics", status: "Coming soon / early access" },
      { label: "Owner/staff verification", status: "Coming soon / early access" },
      { label: "Company profile", status: "Coming soon / early access" }
    ]
  }
];

const PRO_OUTCOMES = [
  { label: "Identity", detail: "Sharper profile control", icon: Palette },
  { label: "Visibility", detail: "Better links and analytics", icon: BarChart3 },
  { label: "Leads", detail: "Capture stronger intent", icon: FileText },
  { label: "Relationships", detail: "More useful follow-up", icon: Handshake }
] as const;

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function statusClassName(status: FeatureStatus) {
  if (status === "Available") {
    return "border-emerald-500/28 bg-emerald-500/10 text-emerald-200";
  }

  if (status === "Available during early access") {
    return "border-gold/28 bg-gold/10 text-gold";
  }

  return "border-silver/18 bg-silver/10 text-silver";
}

function feedbackMessage(input: { registered: string; error: string }) {
  if (input.registered === "1") {
    return {
      type: "notice" as const,
      message: "Interest registered. We have logged this as Circle Card Pro interest."
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

export default async function CircleCardProPage({ searchParams }: PageProps) {
  const [params, session] = await Promise.all([searchParams, auth()]);
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
              businessName: true
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

  return (
    <div className="public-page-stack">
      <section className="grid gap-6 py-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.55fr)] lg:items-center lg:py-8">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/24 bg-gold/10 px-3 py-1 text-xs uppercase tracking-[0.08em] text-gold">
            <Crown size={14} />
            Circle Card Pro
          </div>
          <h1 className="mt-4 font-display text-4xl leading-tight text-foreground sm:text-6xl">
            Turn your Circle Card into a stronger visibility tool.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-silver sm:text-lg">
            Pro improves the card: identity, visibility, analytics, lead capture and relationship tools.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <a
              href="#register-interest"
              className={cn(buttonVariants({ size: "lg" }), "w-full gap-2 sm:w-auto")}
            >
              Register Pro Interest
              <ArrowRight size={16} />
            </a>
            <Link
              href={CIRCLE_CARD_DASHBOARD_PATH}
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full gap-2 sm:w-auto")}
            >
              Open Circle Card
              <QrCode size={16} />
            </Link>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
            The Business Circle membership stays separate. BCN gives the community, support,
            resources and business relationships behind the card.
          </p>
        </div>

        <div className="rounded-xl border border-silver/14 bg-card/72 p-4 shadow-panel-soft">
          <div className="rounded-lg border border-gold/24 bg-[linear-gradient(145deg,rgba(9,19,43,0.96),rgba(6,12,27,0.9))] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Pro preview</p>
                <h2 className="mt-2 font-display text-2xl text-foreground">Visibility layer</h2>
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
              {PRO_OUTCOMES.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.label} className="flex items-center gap-3 rounded-lg border border-silver/12 bg-background/24 px-3 py-2">
                    <Icon size={16} className="text-gold" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted">{item.detail}</p>
                    </div>
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
            <LinkIcon size={18} />
          </div>
          <h2 className="mt-4 font-display text-3xl text-foreground">Which option fits?</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Free handles personal/basic use. Pro improves personal visibility and lead intent.
            Teams handles companies, staff, shared contacts and team control.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Pro does not replace BCN membership. It upgrades the Circle Card itself.
          </p>
        </div>

        <div className="grid gap-3">
          {PLAN_COMPARISON.map((plan) => {
            const Icon = plan.icon;

            return (
              <article key={plan.name} className="rounded-xl border border-silver/14 bg-card/62 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon size={17} className="text-gold" />
                      <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                    </div>
                    <p className="mt-1 text-sm text-muted">{plan.fit}</p>
                  </div>
                  <Badge variant="outline" className={cn("normal-case tracking-normal", statusClassName(plan.status))}>
                    {plan.status}
                  </Badge>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {plan.features.map((feature) => (
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
            );
          })}
        </div>
      </section>

      <section id="register-interest" className="scroll-mt-24 rounded-xl border border-gold/24 bg-card/72 p-5 shadow-panel-soft sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(320px,0.65fr)]">
          <div>
            <Badge variant="outline" className="border-gold/28 text-gold">
              Where next
            </Badge>
            <h2 className="mt-3 font-display text-3xl text-foreground">Register Pro Interest</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Join the Pro early-access list. No payment, no Stripe checkout, no BCN membership change.
            </p>
            <div className="mt-4 grid gap-2 text-sm text-muted">
              <p className="inline-flex items-center gap-2">
                <ShieldCheck size={15} className="text-gold" />
                Source logged as Circle Card Pro interest.
              </p>
              <p className="inline-flex items-center gap-2">
                <WalletCards size={15} className="text-gold" />
                Logged-in card context attached automatically.
              </p>
              <p className="inline-flex items-center gap-2">
                <UsersRound size={15} className="text-gold" />
                Teams interest remains separate from Pro.
              </p>
            </div>
          </div>

          <form action={registerCircleCardProInterestAction} className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={defaultName} required autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={defaultEmail} required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessName">Business name optional</Label>
              <Input id="businessName" name="businessName" defaultValue={defaultBusinessName} autoComplete="organization" />
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
              <span>You may contact me about Circle Card Pro early access.</span>
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
              Register Pro Interest
              <ArrowRight size={16} />
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
