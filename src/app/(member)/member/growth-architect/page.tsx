import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Compass, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MembershipTierBadge } from "@/components/ui/membership-tier-badge";
import {
  formatFounderMembershipTierLabel,
  formatFounderServicePrice,
  getFounderServicePricing,
  isGrowthArchitectServiceSlug
} from "@/lib/founder";
import { roleToTier } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { createPageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { listActiveFounderServices } from "@/server/founder";
import type { FounderServiceModel } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Growth Architect Support",
  description:
    "Private Growth Architect support for Business Circle members who want sharper clarity, stronger positioning, and a more focused growth path.",
  path: "/member/growth-architect"
});

const OFFICE_NOTES = [
  {
    label: "Private route",
    value: "Inside the Circle",
    icon: ShieldCheck
  },
  {
    label: "Request path",
    value: "Connected to your account",
    icon: BadgeCheck
  },
  {
    label: "Service data",
    value: "Shared with Founder services",
    icon: Compass
  }
] as const;

function billingSuffix(service: FounderServiceModel) {
  return service.billingType === "MONTHLY_RETAINER" ? " / month" : "";
}

function buildMemberServiceHref(slug: string, sourceSection: string) {
  const params = new URLSearchParams({
    sourcePage: "Member Growth Architect",
    sourceSection
  });

  return `/member/growth-architect/services/${slug}?${params.toString()}`;
}

function memberCtaLabel(index: number) {
  if (index === 0) {
    return "Start a Member Request";
  }

  if (index === 1) {
    return "Request Member Access";
  }

  return "Apply From Inside The Circle";
}

export default async function MemberGrowthArchitectPage() {
  const [session, allServices] = await Promise.all([
    requireUser(),
    listActiveFounderServices().catch(() => [])
  ]);
  const effectiveTier = roleToTier(session.user.role, session.user.membershipTier);
  const viewer = {
    role: session.user.role,
    membershipTier: session.user.membershipTier,
    hasActiveSubscription: session.user.hasActiveSubscription
  };
  const services = allServices.filter((service) => isGrowthArchitectServiceSlug(service.slug));

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="premium-surface overflow-hidden p-5 sm:p-6 lg:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-gold/35 bg-gold/12 text-gold">
              MEMBER ACCESS
            </Badge>
            <MembershipTierBadge tier={effectiveTier} />
          </div>

          <div className="mt-5 max-w-4xl space-y-3">
            <h1 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
              Growth Architect support inside The Circle
            </h1>
            <p className="text-base leading-relaxed text-muted sm:text-lg">
              Direct strategic support for members who want sharper clarity, stronger positioning,
              and a more focused growth path.
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-gold/25 bg-gold/10 px-4 py-3 text-sm leading-relaxed text-gold">
            You are viewing this as a Business Circle member. Member rates and priority access are
            applied where available.
          </div>
        </div>

        <Card className="border-silver/16 bg-card/62">
          <CardHeader>
            <CardTitle className="text-xl">Growth Architect office</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {OFFICE_NOTES.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="rounded-2xl border border-silver/14 bg-background/20 px-4 py-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold/25 bg-gold/10 text-gold">
                      <Icon size={16} />
                    </span>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
                        {item.label}
                      </p>
                      <p className="mt-1 text-sm text-foreground">{item.value}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="border-b border-silver/12 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles size={16} className="text-gold" />
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
              Member services
            </p>
          </div>
          <h2 className="mt-2 font-display text-2xl text-foreground">
            Choose the level of support that fits what you need next.
          </h2>
          <p className="mt-2 max-w-4xl text-sm leading-relaxed text-muted sm:text-base">
            The services remain the same, but member access keeps your journey connected to the
            environment you are already building inside.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {services.map((service, index) => {
            const pricing = getFounderServicePricing(service, viewer);
            const isFeatured = service.slug === "growth-architect-growth-strategy";
            const hasDiscount = pricing.discountPercent > 0;
            const pricePrefix = service.billingType === "MONTHLY_RETAINER" ? "From " : "";

            return (
              <Card
                key={service.id}
                className={cn(
                  "border-silver/16 bg-card/62 shadow-panel-soft",
                  isFeatured ? "border-gold/35 bg-gradient-to-br from-gold/10 via-card/78 to-card/64" : ""
                )}
              >
                <CardHeader className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-silver/18 text-silver">
                      {service.title}
                    </Badge>
                    {isFeatured ? (
                      <Badge variant="outline" className="border-gold/35 bg-gold/12 text-gold">
                        Focused strategy
                      </Badge>
                    ) : null}
                  </div>

                  <div>
                    <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Member view</p>
                    <p className="mt-2 font-display text-4xl text-foreground">
                      {pricePrefix}
                      {formatFounderServicePrice(
                        pricing.finalAmount,
                        service.currency,
                        billingSuffix(service)
                      )}
                    </p>
                    {hasDiscount ? (
                      <p className="mt-2 text-sm text-muted">
                        Member rate applied from{" "}
                        {formatFounderServicePrice(
                          pricing.baseAmount,
                          service.currency,
                          billingSuffix(service)
                        )}
                        .
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-muted">
                        Member preferred rates are applied where eligible.
                      </p>
                    )}
                  </div>

                  <p className="text-sm leading-relaxed text-muted">{service.shortDescription}</p>
                </CardHeader>

                <CardContent className="space-y-4">
                  {pricing.appliedMessage ? (
                    <div className="rounded-2xl border border-gold/25 bg-gold/10 px-4 py-3 text-sm text-gold">
                      {pricing.appliedMessage}
                    </div>
                  ) : pricing.memberBenefitMessage ? (
                    <div className="rounded-2xl border border-silver/14 bg-background/20 px-4 py-3 text-sm text-muted">
                      {pricing.memberBenefitMessage}
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    {service.includes.map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-silver/14 bg-background/20 px-4 py-3 text-sm text-foreground"
                      >
                        {item}
                      </div>
                    ))}
                  </div>

                  <Link href={buildMemberServiceHref(service.slug, "Member Service Cards")}>
                    <Button size="lg" className="group w-full">
                      {memberCtaLabel(index)}
                      <ArrowRight
                        size={16}
                        className="ml-2 transition-transform group-hover:translate-x-1"
                      />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="rounded-2xl border border-silver/14 bg-card/58 px-4 py-3 text-sm text-muted">
          Pricing uses the same Founder service records and checkout pathway as the public service
          page. {formatFounderMembershipTierLabel(effectiveTier)} access is recognised for eligible
          member rates.
        </div>
      </section>
    </div>
  );
}
