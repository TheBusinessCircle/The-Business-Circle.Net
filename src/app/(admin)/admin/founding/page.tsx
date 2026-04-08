import type { Metadata } from "next";
import { Crown, Download, ShieldCheck, Sparkles, Users } from "lucide-react";
import { MembershipTier } from "@prisma/client";
import { answerInnerCircleQuestionAction } from "@/actions/inner-circle/question.actions";
import { getMembershipBillingPlan, getMembershipTierLabel } from "@/config/membership";
import { FoundingOfferCounters } from "@/components/public";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FoundingBadge } from "@/components/ui/founding-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MembershipTierBadge } from "@/components/ui/membership-tier-badge";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getFoundingOfferSnapshot, listFoundingMembers } from "@/server/founding";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Founding Launch",
  description: "Manage founding launch settings, founding members, and premium community intake.",
  path: "/admin/founding"
});

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function feedbackMessage(input: { notice: string; error: string }) {
  const noticeMap: Record<string, string> = {
    "founding-settings-updated": "Founding launch settings were updated."
  };
  const errorMap: Record<string, string> = {
    invalid: "The founding launch form payload was invalid.",
    "limit-below-claimed": "Limits cannot be set below already claimed founding members."
  };

  if (input.notice && noticeMap[input.notice]) {
    return { type: "notice" as const, message: noticeMap[input.notice] };
  }

  if (input.error && errorMap[input.error]) {
    return { type: "error" as const, message: errorMap[input.error] };
  }

  return null;
}

function LaunchSnapshotCard(input: {
  title: string;
  enabled: boolean;
  claimed: number;
  limit: number;
  price: number;
  accentClassName: string;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-background/30 p-4">
      <p className="text-sm font-medium text-foreground">{input.title}</p>
      <p className={`mt-2 text-2xl font-display ${input.accentClassName}`}>
        {input.claimed} / {input.limit}
      </p>
      <p className="text-xs text-muted">Founders rate: GBP {input.price}/month</p>
      <p className="mt-1 text-xs text-muted">
        Status: {input.enabled ? "Active" : "Inactive"} · {Math.max(0, input.limit - input.claimed)} remaining
      </p>
    </div>
  );
}

function TierLaunchControls(input: {
  inputNamePrefix: "foundation" | "innerCircle" | "core";
  title: string;
  description: string;
  enabled: boolean;
  limit: number;
  claimed: number;
  monthlyPrice: number;
  annualPrice: number;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-background/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">{input.title}</p>
          <p className="mt-1 text-sm text-muted">{input.description}</p>
        </div>
        <span className="rounded-full border border-border/80 bg-background/45 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-silver">
          {input.claimed} claimed
        </span>
      </div>

      <p className="mt-3 text-xs text-muted">
        Founders rate: GBP {input.monthlyPrice}/month or GBP {input.annualPrice}/year
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
        <label className="flex items-center gap-2 rounded-xl border border-border/80 bg-background/35 px-3 py-2 text-sm text-muted">
          <input
            name={`${input.inputNamePrefix}Enabled`}
            type="checkbox"
            defaultChecked={input.enabled}
            className="h-4 w-4 rounded border-border bg-background"
          />
          Founders offer active for this tier
        </label>

        <div className="space-y-2">
          <Label htmlFor={`${input.inputNamePrefix}Limit`}>Founders Capacity</Label>
          <Input
            id={`${input.inputNamePrefix}Limit`}
            name={`${input.inputNamePrefix}Limit`}
            type="number"
            min={0}
            defaultValue={input.limit}
          />
        </div>
      </div>
    </div>
  );
}

export default async function AdminFoundingPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;

  const [foundingOffer, foundingData, pendingQuestions] = await Promise.all([
    getFoundingOfferSnapshot(),
    listFoundingMembers(),
    prisma.innerCircleQuestion.findMany({
      where: {
        isAnswered: false
      },
      select: {
        id: true,
        question: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            foundingTier: true
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      },
      take: 12
    })
  ]);

  const feedback = feedbackMessage({
    notice: firstValue(params.notice),
    error: firstValue(params.error)
  });
  const foundingPricing = {
    foundation: {
      monthly: getMembershipBillingPlan(MembershipTier.FOUNDATION, "founding", "monthly").checkoutPrice,
      annual: getMembershipBillingPlan(MembershipTier.FOUNDATION, "founding", "annual").checkoutPrice
    },
    innerCircle: {
      monthly: getMembershipBillingPlan(MembershipTier.INNER_CIRCLE, "founding", "monthly").checkoutPrice,
      annual: getMembershipBillingPlan(MembershipTier.INNER_CIRCLE, "founding", "annual").checkoutPrice
    },
    core: {
      monthly: getMembershipBillingPlan(MembershipTier.CORE, "founding", "monthly").checkoutPrice,
      annual: getMembershipBillingPlan(MembershipTier.CORE, "founding", "annual").checkoutPrice
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/80 to-card/70">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="premium">
                <Sparkles size={12} className="mr-1" />
                Founding Launch
              </Badge>
              <CardTitle className="mt-3 font-display text-3xl">Founding Offer Control Center</CardTitle>
              <CardDescription className="mt-2 text-base">
                Manage launch availability across Foundation, Inner Circle, and Core, then review members who lock in founding pricing.
              </CardDescription>
            </div>
            <a href="/api/admin/founding/export">
              <Button variant="outline">
                <Download size={14} className="mr-2" />
                Export Founding Members
              </Button>
            </a>
          </div>
        </CardHeader>
      </Card>

      {feedback ? (
        <Card className={feedback.type === "error" ? "border-red-500/40 bg-red-500/10" : "border-gold/30 bg-gold/10"}>
          <CardContent className="py-3">
            <p className={feedback.type === "error" ? "text-sm text-red-200" : "text-sm text-gold"}>
              {feedback.message}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <FoundingOfferCounters offer={foundingOffer} />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Launch Settings</CardTitle>
            <CardDescription>
              Enable the founding launch and manage slot limits and per-tier availability.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/api/admin/founding" method="post" className="space-y-4">
              <input type="hidden" name="returnPath" value="/admin/founding" />

              <div className="space-y-2">
                <Label htmlFor="enabled">Launch Status</Label>
                <label className="flex items-center gap-2 rounded-xl border border-border/80 bg-background/30 px-3 py-2 text-sm text-muted">
                  <input
                    id="enabled"
                    name="enabled"
                    type="checkbox"
                    defaultChecked={foundingData.settings.enabled}
                    className="h-4 w-4 rounded border-border bg-background"
                  />
                  Founding launch is live
                </label>
              </div>

              <TierLaunchControls
                inputNamePrefix="foundation"
                title={getMembershipTierLabel(MembershipTier.FOUNDATION)}
                description="Early-stage and base-building entry point."
                enabled={foundingData.settings.foundationEnabled}
                limit={foundingData.settings.foundationLimit}
                claimed={foundingData.settings.foundationClaimed}
                monthlyPrice={foundingPricing.foundation.monthly}
                annualPrice={foundingPricing.foundation.annual}
              />

              <TierLaunchControls
                inputNamePrefix="innerCircle"
                title={getMembershipTierLabel(MembershipTier.INNER_CIRCLE)}
                description="Focused route for most active members."
                enabled={foundingData.settings.innerCircleEnabled}
                limit={foundingData.settings.innerCircleLimit}
                claimed={foundingData.settings.innerCircleClaimed}
                monthlyPrice={foundingPricing.innerCircle.monthly}
                annualPrice={foundingPricing.innerCircle.annual}
              />

              <TierLaunchControls
                inputNamePrefix="core"
                title={getMembershipTierLabel(MembershipTier.CORE)}
                description="Protected room for serious operators."
                enabled={foundingData.settings.coreEnabled}
                limit={foundingData.settings.coreLimit}
                claimed={foundingData.settings.coreClaimed}
                monthlyPrice={foundingPricing.core.monthly}
                annualPrice={foundingPricing.core.annual}
              />

              <div>
                <Button type="submit">Save Launch Settings</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Launch Snapshot</CardTitle>
            <CardDescription>
              Current live counts and founding prices for each launch tier.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <LaunchSnapshotCard
              title="Founding Foundation"
              enabled={foundingData.settings.foundationEnabled}
              claimed={foundingData.settings.foundationClaimed}
              limit={foundingData.settings.foundationLimit}
              price={foundingPricing.foundation.monthly}
              accentClassName="text-silver"
            />
            <LaunchSnapshotCard
              title="Founding Inner Circle"
              enabled={foundingData.settings.innerCircleEnabled}
              claimed={foundingData.settings.innerCircleClaimed}
              limit={foundingData.settings.innerCircleLimit}
              price={foundingPricing.innerCircle.monthly}
              accentClassName="text-gold"
            />
            <LaunchSnapshotCard
              title="Founding Core"
              enabled={foundingData.settings.coreEnabled}
              claimed={foundingData.settings.coreClaimed}
              limit={foundingData.settings.coreLimit}
              price={foundingPricing.core.monthly}
              accentClassName="text-primary"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <Users size={18} className="text-gold" />
            Founding Members
          </CardTitle>
          <CardDescription>Review every founding member and the tier they locked in.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border/70 text-xs uppercase tracking-[0.06em] text-muted">
                  <th className="px-3 py-2 font-medium">Member</th>
                  <th className="px-3 py-2 font-medium">Founding Badge</th>
                  <th className="px-3 py-2 font-medium">Current Tier</th>
                  <th className="px-3 py-2 font-medium">Founding Price</th>
                  <th className="px-3 py-2 font-medium">Claimed</th>
                </tr>
              </thead>
              <tbody>
                {foundingData.members.length ? (
                  foundingData.members.map((member) => (
                    <tr key={member.id} className="border-b border-border/70 align-top">
                      <td className="px-3 py-3">
                        <p className="font-medium text-foreground">{member.user.name || member.user.email}</p>
                        <p className="text-xs text-muted">{member.user.email}</p>
                      </td>
                      <td className="px-3 py-3">
                        <FoundingBadge tier={member.tier} />
                      </td>
                      <td className="px-3 py-3">
                        <MembershipTierBadge tier={member.user.membershipTier} />
                      </td>
                      <td className="px-3 py-3 text-muted">GBP {member.foundingPrice}/month</td>
                      <td className="px-3 py-3 text-muted">{formatDate(member.claimedAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center text-muted">
                      No founding members have claimed a slot yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <Crown size={18} className="text-gold" />
            Inner Circle Q&A Inbox
          </CardTitle>
          <CardDescription>
            Answer pending higher-intent questions from Inner Circle members.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingQuestions.length ? (
            pendingQuestions.map((question) => (
              <div key={question.id} className="rounded-2xl border border-border/80 bg-background/30 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">{question.user.name || question.user.email}</p>
                  <FoundingBadge tier={question.user.foundingTier} />
                  <p className="text-xs text-muted">{formatDate(question.createdAt)}</p>
                </div>
                <p className="mt-3 text-sm text-foreground">{question.question}</p>
                <form action={answerInnerCircleQuestionAction} className="mt-4 space-y-3">
                  <input type="hidden" name="questionId" value={question.id} />
                  <Textarea name="answer" rows={4} placeholder="Write the answer for the Inner Circle feed..." />
                  <Button type="submit" variant="outline">
                    <ShieldCheck size={14} className="mr-2" />
                    Publish Answer
                  </Button>
                </form>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted">No unanswered Inner Circle questions right now.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
