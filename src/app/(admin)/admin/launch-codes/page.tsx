import type { Metadata } from "next";
import { LaunchCodeStatus } from "@prisma/client";
import { KeyRound, Pause, Play, Archive, Plus, Sparkles } from "lucide-react";
import {
  activateLaunchCodeAction,
  archiveLaunchCodeAction,
  createLaunchCodeAction,
  pauseLaunchCodeAction,
  seedDefaultLaunchCodesAction,
  updateLaunchCodeAction
} from "@/actions/admin/launch-codes.actions";
import {
  LaunchCodeCopyButton,
  LaunchCodeStatusBadge
} from "@/components/admin/launch-codes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { getLaunchCodesDashboard } from "@/server/admin/launch-codes.service";

export const metadata: Metadata = {
  title: "Launch Codes",
  description: "Manage platform-specific Founder Access codes."
};

function formatDate(date: Date | null | undefined) {
  return date
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(date)
    : "Not used yet";
}

function shortDateValue(date: Date | null | undefined) {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function AdminLaunchCodesPage() {
  const dashboard = await getLaunchCodesDashboard();
  const { stats, codes, recentRedemptions } = dashboard;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-gold/25 bg-gradient-to-br from-card/95 via-card/82 to-background/72 shadow-gold-soft">
        <CardHeader className="space-y-4">
          <Badge variant="premium" className="w-fit">
            <KeyRound size={13} className="mr-1" />
            Founder Access
          </Badge>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle className="font-display text-4xl">Launch Codes</CardTitle>
              <CardDescription className="mt-3 max-w-3xl text-base">
                Create and track limited Founder Access codes for Facebook, TikTok, Instagram and LinkedIn.
              </CardDescription>
            </div>
            <form action={seedDefaultLaunchCodesAction}>
              <Button type="submit">
                <Sparkles size={15} className="mr-2" />
                Create default launch codes
              </Button>
            </form>
          </div>
        </CardHeader>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total codes", stats.totalCodes],
          ["Active codes", stats.activeCodes],
          ["Places available", stats.totalPlacesAvailable],
          ["Places used", stats.totalPlacesUsed],
          ["Places remaining", stats.totalPlacesRemaining],
          ["Checkout starts", stats.totalCheckoutStarts],
          ["Completed joins", stats.totalCompletedJoins],
          ["Best platform", stats.bestPerformingPlatform],
          ["Most selected tier", stats.mostSelectedTier],
          ["Monthly after trials", stats.estimatedMonthlyRevenueAfterTrials],
          ["Annual after trials", stats.estimatedAnnualRevenueAfterTrials]
        ].map(([label, value]) => (
          <Card key={label} className="border-border/80 bg-card/72 shadow-panel-soft">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.08em] text-muted">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {!codes.length ? (
        <Card className="border-gold/25 bg-gold/10">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-2xl text-foreground">No launch codes yet</p>
              <p className="mt-2 text-sm text-muted">Create the four platform Founder Access codes to begin tracking early member access.</p>
            </div>
            <form action={seedDefaultLaunchCodesAction}>
              <Button type="submit">Create default launch codes</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-2">
        {codes.map((code) => (
          <Card key={code.id} className="border-border/80 bg-card/72 shadow-panel-soft">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-gold">{code.platform}</p>
                  <CardTitle className="mt-2 font-display text-2xl">{code.name}</CardTitle>
                  <CardDescription className="mt-1 font-mono text-sm text-foreground">{code.code}</CardDescription>
                </div>
                <LaunchCodeStatusBadge status={code.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Used", code.placesUsed],
                  ["Remaining", code.placesRemaining],
                  ["Trial", `${code.trialDays} days`],
                  ["Checkout starts", code.checkoutStarts],
                  ["Completed joins", code.completedJoins],
                  ["Conversion", `${code.conversionRate}%`],
                  ["Foundation", code.foundationJoins],
                  ["Inner Circle", code.innerCircleJoins],
                  ["Core", code.coreJoins]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-border/70 bg-background/24 p-3">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-muted">{label}</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <LaunchCodeCopyButton code={code.code} />
                <form action={pauseLaunchCodeAction}>
                  <input type="hidden" name="id" value={code.id} />
                  <Button type="submit" variant="outline" size="sm" disabled={code.status === LaunchCodeStatus.PAUSED}>
                    <Pause size={14} className="mr-2" />
                    Pause
                  </Button>
                </form>
                <form action={activateLaunchCodeAction}>
                  <input type="hidden" name="id" value={code.id} />
                  <Button type="submit" variant="outline" size="sm" disabled={code.status === LaunchCodeStatus.ACTIVE}>
                    <Play size={14} className="mr-2" />
                    Activate
                  </Button>
                </form>
                <form action={archiveLaunchCodeAction}>
                  <input type="hidden" name="id" value={code.id} />
                  <Button type="submit" variant="outline" size="sm" disabled={code.placesUsed > 0}>
                    <Archive size={14} className="mr-2" />
                    Archive
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.58fr)]">
        <Card className="border-border/80 bg-card/72 shadow-panel-soft">
          <CardHeader>
            <CardTitle>Codes Table</CardTitle>
            <CardDescription>Usage and tier mix across every platform founder code.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.08em] text-muted">
                <tr className="border-b border-border/70">
                  {["Code", "Platform", "Status", "Used", "Remaining", "Max", "Trial", "Checkout", "Completed", "Tier split", "Last used", "Created"].map((heading) => (
                    <th key={heading} className="px-3 py-3 font-medium">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {codes.map((code) => (
                  <tr key={code.id} className="border-b border-border/50">
                    <td className="px-3 py-3 font-mono text-foreground">{code.code}</td>
                    <td className="px-3 py-3 text-muted">{code.platform}</td>
                    <td className="px-3 py-3"><LaunchCodeStatusBadge status={code.status} /></td>
                    <td className="px-3 py-3 text-muted">{code.placesUsed}</td>
                    <td className="px-3 py-3 text-muted">{code.placesRemaining}</td>
                    <td className="px-3 py-3 text-muted">{code.maxRedemptions}</td>
                    <td className="px-3 py-3 text-muted">{code.trialDays}</td>
                    <td className="px-3 py-3 text-muted">{code.checkoutStarts}</td>
                    <td className="px-3 py-3 text-muted">{code.completedJoins}</td>
                    <td className="px-3 py-3 text-muted">{code.foundationJoins}/{code.innerCircleJoins}/{code.coreJoins}</td>
                    <td className="px-3 py-3 text-muted">{formatDate(code.lastUsed)}</td>
                    <td className="px-3 py-3 text-muted">{formatDate(code.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/72 shadow-panel-soft">
          <CardHeader>
            <CardTitle>Create Code</CardTitle>
            <CardDescription>Add a controlled Founder Access code for a platform or private outreach channel.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createLaunchCodeAction} className="space-y-4">
              <Field name="code" label="Code" placeholder="PARTNER25" />
              <Field name="name" label="Name" placeholder="Partner Founder Access" />
              <Field name="platform" label="Platform" placeholder="PARTNER" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field name="maxRedemptions" label="Max redemptions" type="number" defaultValue="25" />
                <Field name="trialDays" label="Trial days" type="number" defaultValue="90" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field name="startsAt" label="Starts at" type="date" />
                <Field name="endsAt" label="Ends at" type="date" />
              </div>
              <Field name="description" label="Description" placeholder="Optional internal note" />
              <Button type="submit" className="w-full">
                <Plus size={15} className="mr-2" />
                Create code
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 bg-card/72 shadow-panel-soft">
        <CardHeader>
          <CardTitle>Recent Redemptions</CardTitle>
          <CardDescription>Recent code activity, checkout state, and subscription state.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.08em] text-muted">
              <tr className="border-b border-border/70">
                {["Time", "Code", "Platform", "Email", "User", "Tier", "Status", "Checkout", "Subscription", "Source"].map((heading) => (
                  <th key={heading} className="px-3 py-3 font-medium">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentRedemptions.length ? recentRedemptions.map((redemption) => (
                <tr key={redemption.id} className="border-b border-border/50">
                  <td className="px-3 py-3 text-muted">{formatDate(redemption.createdAt)}</td>
                  <td className="px-3 py-3 font-mono text-foreground">{redemption.code}</td>
                  <td className="px-3 py-3 text-muted">{redemption.platform}</td>
                  <td className="px-3 py-3 text-muted">{redemption.email ?? "Unknown"}</td>
                  <td className="px-3 py-3 text-muted">{redemption.user?.name ?? redemption.user?.email ?? "Not linked"}</td>
                  <td className="px-3 py-3 text-muted">{redemption.tierSelected ?? "Unknown"}</td>
                  <td className="px-3 py-3 text-muted">{redemption.status}</td>
                  <td className="px-3 py-3 text-muted">{redemption.stripeCheckoutSessionId ? "Started" : "Pending"}</td>
                  <td className="px-3 py-3 text-muted">{redemption.stripeSubscriptionId ? "Linked" : "Not linked"}</td>
                  <td className="px-3 py-3 text-muted">{redemption.referrer ?? redemption.sourcePath ?? "Unknown"}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-muted">
                    No launch code redemptions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {codes.length ? (
        <Card className="border-border/80 bg-card/72 shadow-panel-soft">
          <CardHeader>
            <CardTitle>Edit Codes</CardTitle>
            <CardDescription>Code text only changes before any redemptions exist.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-2">
            {codes.map((code) => (
              <form key={code.id} action={updateLaunchCodeAction} className="space-y-3 rounded-2xl border border-border/70 bg-background/20 p-4">
                <input type="hidden" name="id" value={code.id} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field name="code" label="Code" defaultValue={code.code} />
                  <Field name="platform" label="Platform" defaultValue={code.platform} />
                </div>
                <Field name="name" label="Name" defaultValue={code.name} />
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field name="maxRedemptions" label="Max" type="number" defaultValue={String(code.maxRedemptions)} />
                  <Field name="trialDays" label="Trial days" type="number" defaultValue={String(code.trialDays)} />
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select name="status" defaultValue={code.status}>
                      {Object.values(LaunchCodeStatus).map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field name="startsAt" label="Starts" type="date" defaultValue={shortDateValue(code.startsAt)} />
                  <Field name="endsAt" label="Ends" type="date" defaultValue={shortDateValue(code.endsAt)} />
                </div>
                <Field name="description" label="Description" defaultValue={code.description ?? ""} />
                <Button type="submit" variant="outline" className="w-full">Save changes</Button>
              </form>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  defaultValue,
  placeholder
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`launch-code-${name}-${label}`}>{label}</Label>
      <Input
        id={`launch-code-${name}-${label}`}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
      />
    </div>
  );
}
