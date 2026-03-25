import type { Metadata } from "next";
import { auth } from "@/auth";
import { FounderServiceRequestForm } from "@/components/founder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatFounderMembershipTierLabel,
  formatFounderServicePrice,
  getFounderServicePricing
} from "@/lib/founder";
import { createPageMetadata } from "@/lib/seo";
import {
  getFounderServiceBySlug,
  getFounderServiceFormPrefill
} from "@/server/founder";
import { notFound } from "next/navigation";
import Link from "next/link";

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

  if (!service) {
    return createPageMetadata({
      title: "Founder Service",
      description: "Founder services from Trev Newton.",
      path: `/founder/services/${slug}`
    });
  }

  return createPageMetadata({
    title: service.title,
    description: service.shortDescription,
    path: `/founder/services/${service.slug}`
  });
}

export default async function FounderServicePage({
  params,
  searchParams
}: PageProps) {
  const [{ slug }, parsedSearchParams] = await Promise.all([params, searchParams]);
  const service = await getFounderServiceBySlug(slug);

  if (!service) {
    notFound();
  }

  const session = await auth();
  const prefill = await getFounderServiceFormPrefill(session?.user?.id ?? null);
  const pricing = getFounderServicePricing(
    service,
    session?.user
      ? {
          role: session.user.role,
          membershipTier: session.user.membershipTier,
          hasActiveSubscription: session.user.hasActiveSubscription
        }
      : null
  );
  const sourcePage = safeSourceValue(
    firstValue(parsedSearchParams.sourcePage),
    "Founder Service Page"
  );
  const sourceSection = safeSourceValue(
    firstValue(parsedSearchParams.sourceSection),
    pricing.isGrowthArchitect
      ? "Growth Architect Service Detail"
      : "Founder Service Detail"
  );
  const status = firstValue(parsedSearchParams.status);
  const notice =
    status === "cancelled"
      ? "Payment was cancelled. Your answers are still here, so you can continue whenever you're ready."
      : null;
  const isApplicationOnly = pricing.isApplicationOnly || service.intakeMode === "APPLICATION";

  return (
    <div className="space-y-8 pb-16">
      <div className="space-y-4">
        <Badge variant="outline" className="border-gold/35 bg-gold/12 text-gold">
          {pricing.isGrowthArchitect ? "Growth Architect Service" : "Founder Service"}
        </Badge>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-3">
            <h1 className="font-display text-4xl text-foreground sm:text-5xl">
              {service.title}
            </h1>
            <p className="max-w-3xl text-lg leading-relaxed text-muted">
              {service.fullDescription}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/founder">
              <Button variant="outline">Back to Founder Page</Button>
            </Link>
            <Card className="border-gold/35 bg-gold/10">
              <CardContent className="px-4 py-3">
                <p className="text-xs uppercase tracking-[0.08em] text-muted">
                  {isApplicationOnly
                    ? "Application Path"
                    : pricing.discountPercent
                      ? "Member Price"
                      : "Service Price"}
                </p>
                {isApplicationOnly ? (
                  <div className="mt-2 space-y-1 text-sm text-muted">
                    <p className="font-display text-2xl text-gold">Application / Enquiry</p>
                    <p>Scope and pricing are discussed after the business has been reviewed.</p>
                  </div>
                ) : (
                  <p className="font-display text-2xl text-gold">
                    {formatFounderServicePrice(
                      pricing.finalAmount,
                      service.currency,
                      billingSuffix(service.billingType)
                    )}
                  </p>
                )}
                {!isApplicationOnly && pricing.discountPercent ? (
                  <div className="mt-2 space-y-1 text-xs text-muted">
                    <p>
                      Regular rate{" "}
                      {formatFounderServicePrice(
                        pricing.baseAmount,
                        service.currency,
                        billingSuffix(service.billingType)
                      )}
                    </p>
                    <p>
                      {pricing.discountPercent}% off for{" "}
                      {formatFounderMembershipTierLabel(pricing.appliedMembershipTier)}
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
        {pricing.appliedMessage ? (
          <div className="rounded-2xl border border-gold/25 bg-gold/10 px-4 py-3 text-sm text-gold">
            {pricing.appliedMessage}
          </div>
        ) : pricing.memberBenefitMessage ? (
          <div className="rounded-2xl border border-border/80 bg-card/55 px-4 py-3 text-sm text-muted">
            {pricing.memberBenefitMessage}
          </div>
        ) : null}
      </div>

      <FounderServiceRequestForm
        service={service}
        prefill={prefill}
        pricing={pricing}
        notice={notice}
        sourcePage={sourcePage}
        sourceSection={sourceSection}
      />
    </div>
  );
}
