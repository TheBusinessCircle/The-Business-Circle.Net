import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { FounderServiceRequestForm } from "@/components/founder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatFounderMembershipTierLabel,
  formatFounderServicePrice,
  getFounderServicePricing,
  isGrowthArchitectServiceSlug
} from "@/lib/founder";
import { requireUser } from "@/lib/session";
import { createPageMetadata } from "@/lib/seo";
import {
  getFounderServiceBySlug,
  getFounderServiceFormPrefill
} from "@/server/founder";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function billingSuffix(billingType: "ONE_TIME" | "MONTHLY_RETAINER") {
  return billingType === "MONTHLY_RETAINER" ? " / month" : "";
}

function safeSourceValue(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed && trimmed.length <= 120 ? trimmed : fallback;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = await getFounderServiceBySlug(slug);

  if (!service || !isGrowthArchitectServiceSlug(service.slug)) {
    return createPageMetadata({
      title: "Growth Architect Service",
      description: "Private Growth Architect service access for Business Circle members.",
      path: `/member/growth-architect/services/${slug}`
    });
  }

  return createPageMetadata({
    title: `${service.title} | Member Access`,
    description: service.shortDescription,
    path: `/member/growth-architect/services/${service.slug}`
  });
}

export default async function MemberGrowthArchitectServicePage({
  params,
  searchParams
}: PageProps) {
  const [{ slug }, parsedSearchParams, session] = await Promise.all([
    params,
    searchParams,
    requireUser()
  ]);
  const service = await getFounderServiceBySlug(slug);

  if (!service || !isGrowthArchitectServiceSlug(service.slug)) {
    notFound();
  }

  const [prefill] = await Promise.all([
    getFounderServiceFormPrefill(session.user.id)
  ]);
  const pricing = getFounderServicePricing(service, {
    role: session.user.role,
    membershipTier: session.user.membershipTier,
    hasActiveSubscription: session.user.hasActiveSubscription
  });
  const sourcePage = safeSourceValue(
    firstValue(parsedSearchParams.sourcePage),
    "Member Growth Architect"
  );
  const sourceSection = safeSourceValue(
    firstValue(parsedSearchParams.sourceSection),
    "Member Service Detail"
  );
  const status = firstValue(parsedSearchParams.status);
  const notice =
    status === "cancelled"
      ? "Payment was cancelled. Your member request is still here, so you can continue when you are ready."
      : null;
  const isApplicationOnly = pricing.isApplicationOnly || service.intakeMode === "APPLICATION";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/member/growth-architect"
          className="inline-flex items-center gap-2 text-sm text-silver transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Back to Growth Architect office
        </Link>
      </div>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="premium-surface p-5 sm:p-6 lg:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-gold/35 bg-gold/12 text-gold">
              MEMBER SERVICE
            </Badge>
            <Badge variant="outline" className="border-silver/18 text-silver">
              {service.title}
            </Badge>
          </div>

          <div className="mt-5 max-w-4xl space-y-3">
            <h1 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
              {service.title}
            </h1>
            <p className="text-base leading-relaxed text-muted sm:text-lg">
              {service.fullDescription}
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-gold/25 bg-gold/10 px-4 py-3 text-sm leading-relaxed text-gold">
            You are requesting this from inside The Business Circle. Member preferred rates are
            applied where eligible.
          </div>
        </div>

        <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/78 to-card/64">
          <CardHeader>
            <CardTitle className="text-xl">Member access summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted">
                Starting price
              </p>
              <p className="mt-2 font-display text-4xl text-gold">
                {service.billingType === "MONTHLY_RETAINER" ? "From " : ""}
                {formatFounderServicePrice(
                  pricing.finalAmount,
                  service.currency,
                  billingSuffix(service.billingType)
                )}
              </p>
              {pricing.discountPercent ? (
                <div className="mt-2 space-y-1 text-sm text-muted">
                  <p>
                    Regular rate{" "}
                    {formatFounderServicePrice(
                      pricing.baseAmount,
                      service.currency,
                      billingSuffix(service.billingType)
                    )}
                  </p>
                  <p>
                    {pricing.discountPercent}% member rate for{" "}
                    {formatFounderMembershipTierLabel(pricing.appliedMembershipTier)}.
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted">
                  Member preferred rates are applied where eligible.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-gold/25 bg-gold/10 px-4 py-3 text-sm text-gold">
              {pricing.appliedMessage ??
                pricing.memberBenefitMessage ??
                "Priority access is handled through the member request path."}
            </div>

            <p className="text-sm leading-relaxed text-muted">
              {isApplicationOnly
                ? "No payment is taken at request stage. I review the business first, then confirm the next step."
                : "Checkout follows the same secure founder service flow after the request is submitted."}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {service.includes.map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-silver/14 bg-card/58 px-4 py-4 text-sm text-foreground"
          >
            {item}
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-silver/14 bg-card/58 px-4 py-3 text-sm text-muted">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck size={17} className="mt-0.5 text-gold" />
            <p>
              This private route uses the same service record, pricing resolver, and request API as
              the public Founder service page.
            </p>
          </div>
          <Link href="#member-request">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              Start request
              <ArrowRight size={14} className="ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <section id="member-request">
        <FounderServiceRequestForm
          service={service}
          prefill={prefill}
          pricing={pricing}
          notice={notice}
          sourcePage={sourcePage}
          sourceSection={sourceSection}
          experience="member"
        />
      </section>
    </div>
  );
}
