import type { Metadata } from "next";
import { Lock, ShieldCheck, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { getAdminSecuritySnapshot } from "@/server/admin";

export const metadata: Metadata = createPageMetadata({
  title: "Admin Security",
  description: "Security visibility, auth safeguards, and operational warnings for The Business Circle Network.",
  path: "/admin/security",
  noIndex: true
});

export const dynamic = "force-dynamic";

export default async function AdminSecurityPage() {
  await requireAdmin();
  const security = await getAdminSecuritySnapshot();

  return (
    <div className="space-y-6">
      <Card className="border-gold/35 bg-gradient-to-br from-gold/12 via-card/82 to-card/68">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="outline" className="border-gold/35 bg-gold/12 text-gold">
                <ShieldCheck size={12} className="mr-1" />
                Security Visibility
              </Badge>
              <CardTitle className="mt-3 font-display text-3xl">Security posture and trust signals</CardTitle>
              <CardDescription className="mt-2 max-w-3xl text-base">
                Monitor the essentials without exposing secrets: auth configuration, HTTPS posture, rate-limiting, payment risk, and recent auth-sensitive activity.
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={
                security.warnings.length
                  ? "border-gold/35 bg-gold/12 text-gold"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              }
            >
              {security.warnings.length ? `${security.warnings.length} warnings` : "No active warnings"}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {security.warnings.length ? (
        <Card className="border-gold/30 bg-gold/10">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <TriangleAlert size={18} className="text-gold" />
              Warnings
            </CardTitle>
            <CardDescription>These items do not expose secrets, but they do need attention.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {security.warnings.map((warning) => (
              <div key={warning} className="rounded-xl border border-gold/24 bg-background/20 px-4 py-3 text-sm text-foreground">
                {warning}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatusCard
          label="Auth secret"
          value={security.authSecretConfigured ? "Configured" : "Missing"}
          description="NextAuth secret present for production-safe session signing."
          tone={security.authSecretConfigured ? "healthy" : "attention"}
        />
        <StatusCard
          label="HTTPS"
          value={security.httpsConfigured ? "Configured" : "Needs attention"}
          description="Primary application URL should resolve over HTTPS."
          tone={security.httpsConfigured ? "healthy" : "attention"}
        />
        <StatusCard
          label="Billing"
          value={security.billingEnabled ? "Enabled" : "Disabled"}
          description="Stripe-backed billing availability in the current environment."
          tone={security.billingEnabled ? "healthy" : "default"}
        />
        <StatusCard
          label="Rate limiting"
          value={security.rateLimitBackend === "upstash" ? "Upstash" : "In-memory"}
          description="Backend currently enforcing API rate limits."
          tone={security.rateLimitBackend === "upstash" ? "healthy" : "attention"}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <ShieldAlert size={18} className="text-gold" />
              Admin-safe security indicators
            </CardTitle>
            <CardDescription>Operational counts that help you spot pressure without exposing underlying secrets.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <CountPanel label="Suspended users" value={security.suspendedUsers} description="Accounts currently blocked from access." />
            <CountPanel label="Unverified members" value={security.unverifiedMembers} description="Members who have not verified email yet." />
            <CountPanel label="Payment-risk members" value={security.paymentRiskMembers} description="Subscriptions marked past due or unpaid." />
            <CountPanel label="Reset requests (24h)" value={security.passwordResetRequests24h} description="Password reset requests created in the last day." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <Lock size={18} className="text-gold" />
              Protection summary
            </CardTitle>
            <CardDescription>Current guardrails enforced across the platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted">
            <ProtectionItem title="Admin routes" description="Protected in middleware and server session checks. Non-admin users are redirected away from /admin." />
            <ProtectionItem title="Member access" description="Protected routes require a valid entitled membership unless the user is an administrator." />
            <ProtectionItem title="Tier enforcement" description="Community access, resources, and billing changes are enforced server-side, not only in the UI." />
            <ProtectionItem title="Sensitive logging" description="Server error logging is sanitized so raw secrets and payload contents are not written to logs." />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Recent password reset requests</CardTitle>
          <CardDescription>Latest auth-sensitive activity visible to admins only.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {security.recentPasswordResetRequests.length ? (
            security.recentPasswordResetRequests.map((request) => (
              <div key={request.id} className="rounded-2xl border border-silver/16 bg-background/18 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {request.user.name || request.user.email}
                    </p>
                    <p className="text-xs text-muted">{request.user.email}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      request.usedAt
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                        : "border-silver/16 bg-silver/10 text-silver"
                    }
                  >
                    {request.usedAt ? "Used" : "Pending"}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
                  <span>Requested {formatDate(request.createdAt)}</span>
                  <span>IP: {request.requestedIp || "Unknown"}</span>
                  {request.usedAt ? <span>Completed {formatDate(request.usedAt)}</span> : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-silver/16 bg-background/14 px-4 py-4 text-sm text-muted">
              No password reset requests have been recorded in the last 24 hours.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusCard({
  label,
  value,
  description,
  tone = "default"
}: {
  label: string;
  value: string;
  description: string;
  tone?: "default" | "healthy" | "attention";
}) {
  const toneClassName =
    tone === "healthy"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : tone === "attention"
        ? "border-gold/35 bg-gold/12 text-gold"
        : "border-silver/16 bg-background/20 text-foreground";

  return (
    <Card className="interactive-card">
      <CardHeader className="space-y-1 pb-2">
        <CardDescription>{label}</CardDescription>
        <div className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-sm ${toneClassName}`}>
          {value}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted">{description}</p>
      </CardContent>
    </Card>
  );
}

function CountPanel({
  label,
  value,
  description
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-silver/16 bg-background/20 px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.08em] text-silver">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-foreground">{value.toLocaleString("en-GB")}</p>
      <p className="mt-2 text-sm text-muted">{description}</p>
    </div>
  );
}

function ProtectionItem({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-silver/16 bg-background/20 px-4 py-4">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-2">{description}</p>
    </div>
  );
}
