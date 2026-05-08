import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  ClipboardCheck,
  MessageSquareQuote,
  MousePointerClick,
  UserRoundCheck,
  UsersRound
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MembershipTierBadge } from "@/components/ui/membership-tier-badge";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import { formatDate, toTitleCase } from "@/lib/utils";
import { getLaunchCommandCentreData } from "@/server/admin";
import type {
  LaunchAnalyticsSignal,
  LaunchManualAction,
  LaunchPaidMember
} from "@/server/admin/launch-command.service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Launch Command Centre",
  description: "Soft launch monitoring and action dashboard for The Business Circle Network.",
  path: "/admin/launch",
  noIndex: true
});

function formatEventLabel(value: string) {
  return toTitleCase(value.replaceAll("_", " "));
}

function profileStateBadgeClass(state: LaunchPaidMember["profileState"]) {
  if (state === "Complete") {
    return "border-primary/35 bg-primary/10 text-primary";
  }

  if (state === "In progress") {
    return "border-gold/35 bg-gold/10 text-gold";
  }

  return "border-border/80 bg-background/25 text-muted";
}

function signalBadgeClass(status: LaunchAnalyticsSignal["status"]) {
  if (status === "connected") {
    return "border-primary/35 bg-primary/10 text-primary";
  }

  if (status === "proxy") {
    return "border-gold/35 bg-gold/10 text-gold";
  }

  return "border-silver/18 bg-background/25 text-silver";
}

function CountCard({
  label,
  value,
  hint,
  icon: Icon
}: {
  label: string;
  value: number | string;
  hint: string;
  icon: typeof Activity;
}) {
  return (
    <Card className="border-border/80 bg-card/70">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted">{label}</p>
            <p className="mt-2 font-display text-3xl text-foreground">{value}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted">{hint}</p>
          </div>
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-gold/24 bg-gold/10 text-gold">
            <Icon size={17} />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function ManualActionCard({ action }: { action: LaunchManualAction }) {
  return (
    <Link
      href={action.href}
      className="block rounded-2xl border border-border/80 bg-background/22 p-4 transition-colors hover:border-gold/30 hover:bg-background/32"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">{action.label}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{action.detail}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {typeof action.count === "number" ? (
            <Badge variant="outline" className="normal-case tracking-normal">
              {action.count}
            </Badge>
          ) : null}
          <ArrowUpRight size={15} className="text-silver" />
        </div>
      </div>
    </Link>
  );
}

export default async function AdminLaunchCommandPage() {
  await requireAdmin();
  const launch = await getLaunchCommandCentreData();

  return (
    <div className="space-y-6">
      <Card className="border-gold/35 bg-gradient-to-br from-gold/12 via-card/82 to-card/70 shadow-gold-soft">
        <CardHeader className="space-y-4">
          <Badge variant="outline" className="w-fit border-gold/35 bg-gold/12 text-gold">
            <Activity size={12} className="mr-1" />
            Soft launch control
          </Badge>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle className="font-display text-3xl">Launch Command Centre</CardTitle>
              <CardDescription className="mt-2 max-w-4xl text-base">
                One place to monitor new members, proof, audit signals, checkout movement, and
                quick launch follow-ups.
              </CardDescription>
            </div>
            <Badge variant="outline" className="w-fit normal-case tracking-normal text-muted">
              Analytics storage: {launch.analyticsStorageConnected ? "Connected" : "Prepared"}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CountCard
          label="New paid members"
          value={launch.counts.newPaidMembers7d}
          hint="Active or trialing subscriptions created in the last 7 days."
          icon={UsersRound}
        />
        <CountCard
          label="Pending testimonials"
          value={launch.counts.pendingTestimonials}
          hint="Submitted proof waiting for admin approval."
          icon={MessageSquareQuote}
        />
        <CountCard
          label="Checkout started"
          value={launch.counts.checkoutStarted7d}
          hint="Proxy count from pending registrations with checkout sessions."
          icon={MousePointerClick}
        />
        <CountCard
          label="Founder requests"
          value={launch.counts.founderRequests7d}
          hint="Founder service requests submitted in the last 7 days."
          icon={ClipboardCheck}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <UsersRound size={18} className="text-gold" />
              Latest paid members
            </CardTitle>
            <CardDescription>
              Recent members with active or trialing access, tier, join date, and onboarding state.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {launch.latestPaidMembers.length ? (
              launch.latestPaidMembers.map((member) => (
                <div
                  key={member.id}
                  className="rounded-2xl border border-border/80 bg-background/22 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/members/${member.id}`}
                        className="font-medium text-foreground transition-colors hover:text-gold"
                      >
                        {member.name || member.email}
                      </Link>
                      <p className="mt-1 truncate text-sm text-muted">{member.email}</p>
                      <p className="mt-2 text-xs text-muted">Joined {formatDate(member.joinedAt)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <MembershipTierBadge tier={member.tier} />
                      <Badge variant="outline" className={profileStateBadgeClass(member.profileState)}>
                        {member.profileState}
                      </Badge>
                      {member.acceptedRules ? (
                        <Badge variant="success" className="normal-case tracking-normal">
                          Rules accepted
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="normal-case tracking-normal text-muted">
                          Rules pending
                        </Badge>
                      )}
                      {member.accentThemeSelected ? (
                        <Badge variant="outline" className="normal-case tracking-normal text-muted">
                          Theme set
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={UsersRound}
                title="No paid members yet"
                description="Active and trialing members will appear here after checkout confirmation."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <ClipboardCheck size={18} className="text-gold" />
              Manual action list
            </CardTitle>
            <CardDescription>Fast follow-ups for launch momentum and member care.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {launch.manualActions.map((action) => (
              <ManualActionCard key={action.id} action={action} />
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <MessageSquareQuote size={18} className="text-gold" />
              Pending testimonial approvals
            </CardTitle>
            <CardDescription>
              Only pending submitted quotes are shown here. Approval rules remain unchanged.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {launch.pendingTestimonials.length ? (
              launch.pendingTestimonials.map((testimonial) => (
                <Link
                  key={testimonial.id}
                  href="/admin/testimonials?status=PENDING"
                  className="block rounded-2xl border border-border/80 bg-background/22 p-4 transition-colors hover:border-gold/30"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="normal-case tracking-normal text-muted">
                      {formatEventLabel(testimonial.proofType)}
                    </Badge>
                    <Badge variant="outline" className="normal-case tracking-normal text-muted">
                      {formatEventLabel(testimonial.sourceType)}
                    </Badge>
                  </div>
                  <p className="mt-3 font-medium text-foreground">{testimonial.authorName}</p>
                  {testimonial.businessName ? (
                    <p className="text-sm text-muted">{testimonial.businessName}</p>
                  ) : null}
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {testimonial.quotePreview}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    Submitted {formatDate(testimonial.createdAt)}
                  </p>
                </Link>
              ))
            ) : (
              <EmptyState
                icon={MessageSquareQuote}
                title="No pending testimonials"
                description="Submitted testimonials awaiting approval will appear here."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <UserRoundCheck size={18} className="text-gold" />
              Founder service requests
            </CardTitle>
            <CardDescription>Recent Growth Architect and founder service request activity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {launch.founderRequests.length ? (
              launch.founderRequests.map((request) => (
                <Link
                  key={request.id}
                  href={`/admin/founder-services/${request.id}`}
                  className="block rounded-2xl border border-border/80 bg-background/22 p-4 transition-colors hover:border-gold/30"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium text-foreground">{request.businessName}</p>
                      <p className="mt-1 text-sm text-muted">
                        {request.fullName} | {request.serviceTitle}
                      </p>
                      <p className="mt-1 text-xs text-muted">{request.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="normal-case tracking-normal text-muted">
                        {formatEventLabel(request.paymentStatus)}
                      </Badge>
                      <Badge variant="outline" className="normal-case tracking-normal text-muted">
                        {formatEventLabel(request.serviceStatus)}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted">Submitted {formatDate(request.createdAt)}</p>
                </Link>
              ))
            ) : (
              <EmptyState
                icon={UserRoundCheck}
                title="No Founder requests yet"
                description="Submitted founder service requests will appear here."
              />
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <Activity size={18} className="text-gold" />
            Audit and conversion event structure
          </CardTitle>
          <CardDescription>
            The analytics helper is ready. Persisted proxy signals are shown until event storage is
            connected.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {launch.analyticsSignals.map((signal) => (
            <div key={signal.event} className="rounded-2xl border border-border/80 bg-background/22 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.08em] text-muted">
                    {signal.label}
                  </p>
                  <p className="mt-2 font-display text-3xl text-foreground">
                    {typeof signal.count === "number" ? signal.count : "Ready"}
                  </p>
                </div>
                <Badge variant="outline" className={signalBadgeClass(signal.status)}>
                  {signal.status}
                </Badge>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted">{signal.source}</p>
              <p className="mt-2 text-xs text-muted">Event: {signal.event}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
