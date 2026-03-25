import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, CircleAlert, CreditCard, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import { getAdminRevenueSnapshot } from "@/server/admin";

export const metadata: Metadata = createPageMetadata({
  title: "Admin Revenue",
  description: "Revenue, subscription mix, pricing discipline, and billing risk across the Circle.",
  path: "/admin/revenue",
  noIndex: true
});

export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(value);
}

export default async function AdminRevenuePage() {
  await requireAdmin();
  const revenue = await getAdminRevenueSnapshot();

  return (
    <div className="space-y-6">
      <Card className="border-gold/35 bg-gradient-to-br from-gold/12 via-card/82 to-card/68">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="outline" className="border-gold/35 bg-gold/12 text-gold">
                <Briefcase size={12} className="mr-1" />
                Revenue Intelligence
              </Badge>
              <CardTitle className="mt-3 font-display text-3xl">Subscription health and pricing discipline</CardTitle>
              <CardDescription className="mt-2 max-w-3xl text-base">
                Track active revenue, tier mix, founding-price exposure, and payment risk without leaving the admin area.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/founding">
                <Button variant="outline" size="sm">Founding Settings</Button>
              </Link>
              <Link href="/admin/members?subscription=PAST_DUE">
                <Button variant="outline" size="sm">Payment Risk Members</Button>
              </Link>
            </div>
          </div>
        </CardHeader>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Current MRR" value={formatCurrency(revenue.currentMrr)} hint="Active and trialing subscriptions" />
        <MetricCard label="Active subscriptions" value={revenue.activeSubscriptions.toLocaleString("en-GB")} hint="Members with current paid access" />
        <MetricCard label="Trialing subscriptions" value={revenue.trialingSubscriptions.toLocaleString("en-GB")} hint="Still inside trial period" />
        <MetricCard label="Failed payments" value={revenue.failedPayments.toLocaleString("en-GB")} hint="Past due or unpaid subscriptions" tone={revenue.failedPayments ? "attention" : "default"} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <TrendingUp size={18} className="text-gold" />
              Subscription mix
            </CardTitle>
            <CardDescription>Tier distribution across active and trialing memberships.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <TierCard
              label="Foundation"
              value={revenue.subscriptionsByTier.FOUNDATION}
              accentClassName="border-foundation/30 bg-foundation/10 text-foundation"
            />
            <TierCard
              label="Inner Circle"
              value={revenue.subscriptionsByTier.INNER_CIRCLE}
              accentClassName="border-silver/30 bg-silver/12 text-silver"
            />
            <TierCard
              label="Core"
              value={revenue.subscriptionsByTier.CORE}
              accentClassName="border-gold/35 bg-gold/12 text-gold"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <CreditCard size={18} className="text-gold" />
              Pricing integrity
            </CardTitle>
            <CardDescription>Founding discounts remain controlled server-side and separated from standard billing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-silver/16 bg-background/22 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Discounted active members</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {revenue.discountedActiveMembers.toLocaleString("en-GB")}
              </p>
            </div>
            <div className="rounded-2xl border border-silver/16 bg-background/22 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Full-price active members</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {revenue.fullPriceActiveMembers.toLocaleString("en-GB")}
              </p>
            </div>
            <div className="rounded-2xl border border-gold/24 bg-gold/10 px-4 py-4 text-sm text-muted">
              <p className="font-medium text-foreground">Discounted pricing rule</p>
              <p className="mt-2">
                Eligible new members can claim discounted pricing once. If membership ends and they later rejoin, standard pricing applies.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Retention watch</CardTitle>
            <CardDescription>Members already scheduled to step away at the end of the current period.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-silver/16 bg-background/20 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Cancel at period end</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {revenue.cancelAtPeriodEnd.toLocaleString("en-GB")}
              </p>
              <p className="mt-2 text-sm text-muted">
                Keep an eye on this count when reviewing upgrade, downgrade, and save-flow clarity.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <CircleAlert size={18} className="text-gold" />
              Billing risk
            </CardTitle>
            <CardDescription>Payment issues are surfaced here so they can be handled early and calmly.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-gold/24 bg-gold/10 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Members needing payment attention</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {revenue.failedPayments.toLocaleString("en-GB")}
              </p>
              <p className="mt-2 text-sm text-muted">
                This count includes subscriptions marked past due or unpaid by Stripe.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone = "default"
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "attention";
}) {
  return (
    <Card className="interactive-card">
      <CardHeader className="space-y-1 pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className={tone === "attention" ? "text-3xl text-gold" : "text-3xl"}>
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted">{hint}</p>
      </CardContent>
    </Card>
  );
}

function TierCard({
  label,
  value,
  accentClassName
}: {
  label: string;
  value: number;
  accentClassName: string;
}) {
  return (
    <div className="rounded-2xl border border-silver/16 bg-background/20 px-4 py-4">
      <div className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] ${accentClassName}`}>
        {label}
      </div>
      <p className="mt-3 text-3xl font-semibold text-foreground">{value.toLocaleString("en-GB")}</p>
      <p className="mt-2 text-sm text-muted">Active or trialing subscriptions currently assigned to this tier.</p>
    </div>
  );
}
