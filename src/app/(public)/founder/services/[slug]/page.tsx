import type { Metadata } from "next";
import { auth } from "@/auth";
import { FounderServiceRequestForm } from "@/components/founder";
import { PublicTopVisual } from "@/components/visual-media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SITE_CONFIG } from "@/config/site";
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
import { getVisualMediaPlacement } from "@/server/visual-media";
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
    return {
      ...createPageMetadata({
        title: "Founder Service",
        description: "Founder services from Trev Newton.",
        path: `/founder/services/${slug}`
      }),
      metadataBase: new URL(SITE_CONFIG.url)
    };
  }

  return {
    ...createPageMetadata({
      title: service.title,
      description: service.shortDescription,
      path: `/founder/services/${service.slug}`
    }),
    metadataBase: new URL(SITE_CONFIG.url)
  };
}

export default async function FounderServicePage({
  params,
  searchParams
}: PageProps) {
  const [{ slug }, parsedSearchParams] = await Promise.all([params, searchParams]);
  const [service, founderHeroPlacement] = await Promise.all([
    getFounderServiceBySlug(slug),
    getVisualMediaPlacement("services.hero")
  ]);

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
    <div className="space-y-20 pb-28 lg:space-y-28 lg:pb-36">
      <PublicTopVisual
        placement={founderHeroPlacement}
        eyebrow="Founder Service"
        title={service.title}
        description={service.shortDescription}
        tone="anchored"
        fallbackLabel="Founder top visual"
      />

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-card/56 px-6 py-28 shadow-panel sm:px-8 lg:px-10 lg:py-36">
        <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_36%,rgba(0,0,0,0.48)_100%),linear-gradient(180deg,rgba(0,0,0,0.34)_0%,rgba(0,0,0,0.62)_100%)]" />

        <div className="relative space-y-5">
          <Badge variant="outline" className="border-gold/35 bg-gold/12 text-gold">
            Founder Service
          </Badge>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl space-y-3">
              <h1 className="font-display text-4xl tracking-tight text-foreground sm:text-5xl">
                {service.title}
              </h1>
              <p className="text-lg leading-relaxed text-white/80">{service.fullDescription}</p>
            </div>

            <Card className="border-gold/35 bg-gold/10">
              <CardContent className="px-5 py-4">
                <p className="text-xs uppercase tracking-[0.08em] text-muted">
                  Starting price
                </p>
                <p className="mt-2 font-display text-3xl text-gold">
                  {service.billingType === "MONTHLY_RETAINER" ? "From " : ""}
                  {formatFounderServicePrice(
                    pricing.finalAmount,
                    service.currency,
                    billingSuffix(service.billingType)
                  )}
                </p>
                {pricing.discountPercent ? (
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
                      {pricing.discountPercent}% member rate for{" "}
                      {formatFounderMembershipTierLabel(pricing.appliedMembershipTier)}
                    </p>
                  </div>
                ) : null}
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {isApplicationOnly
                    ? "No payment is taken at application stage. I review the business first, then confirm the next step manually."
                    : "This moves into checkout after the application is reviewed."}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/founder">
              <Button variant="outline">Back to Founder Page</Button>
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {service.includes.map((item) => (
              <div
                key={item}
                className="rounded-[1.2rem] border border-white/8 bg-background/18 px-4 py-3 text-sm text-foreground"
              >
                {item}
              </div>
            ))}
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
      </section>

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
