import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatFounderMembershipTierLabel,
  formatFounderPaymentStatusLabel,
  formatFounderServicePrice,
  formatFounderServiceStatusLabel
} from "@/lib/founder";
import { requireUser } from "@/lib/session";
import { createPageMetadata } from "@/lib/seo";
import { getFounderServiceRequestSummary } from "@/server/founder";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Growth Architect Request Received",
  description: "Your private Growth Architect request has been received.",
  path: "/member/growth-architect/thanks"
});

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function MemberGrowthArchitectThanksPage({ searchParams }: PageProps) {
  const [session, params] = await Promise.all([requireUser(), searchParams]);
  const requestId = firstValue(params.request);
  const status = firstValue(params.status);
  const request = requestId ? await getFounderServiceRequestSummary(requestId) : null;

  if (!request || (session.user.role !== "ADMIN" && request.userId !== session.user.id)) {
    notFound();
  }

  const submittedOnly = status === "submitted";
  const title = submittedOnly ? "Your member request has been received" : "Your member request is confirmed";
  const description = submittedOnly
    ? "I have the context and will review the business before confirming the cleanest next step."
    : "The request is connected to your Business Circle account and the payment status is reflected below.";

  return (
    <div className="space-y-6">
      <section className="premium-surface p-5 sm:p-6 lg:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-gold/35 bg-gold/12 text-gold">
            MEMBER REQUEST
          </Badge>
          <Badge variant="outline" className="border-silver/18 text-silver">
            Growth Architect
          </Badge>
        </div>

        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
              <CheckCircle2 size={20} />
            </span>
            <h1 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            <p className="text-base leading-relaxed text-muted">{description}</p>
          </div>

          <div className="rounded-2xl border border-gold/25 bg-gold/10 px-4 py-3 text-sm text-gold lg:max-w-xs">
            This stays inside your member environment. Member rates and priority access are applied
            where available.
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <Card className="border-silver/16 bg-card/62">
          <CardHeader>
            <CardTitle>Request summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-silver/14 bg-background/20 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Service</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {request.service.title}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-silver/14 bg-background/20 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Amount</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {formatFounderServicePrice(request.amount, request.currency)}
                </p>
                {request.membershipDiscountPercent ? (
                  <p className="mt-1 text-xs text-muted">
                    Regular rate {formatFounderServicePrice(request.baseAmount, request.currency)}
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-silver/14 bg-background/20 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
                  Member rate
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {request.membershipDiscountPercent
                    ? `${request.membershipDiscountPercent}% applied`
                    : "Applied where eligible"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {formatFounderMembershipTierLabel(request.membershipTierApplied)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/78 to-card/64">
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted">
            <div className="rounded-2xl border border-gold/25 bg-gold/10 px-4 py-3 text-gold">
              Payment: {formatFounderPaymentStatusLabel(request.paymentStatus)}
            </div>
            <div className="rounded-2xl border border-silver/14 bg-background/20 px-4 py-3 text-foreground">
              Service: {formatFounderServiceStatusLabel(request.serviceStatus)}
            </div>
            <div className="space-y-3 pt-2">
              <Link href="/member/growth-architect">
                <Button className="w-full">
                  Back to Growth Architect office
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </Link>
              <Link href={`/member/growth-architect/services/${request.service.slug}`}>
                <Button variant="outline" className="w-full">
                  View service
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
