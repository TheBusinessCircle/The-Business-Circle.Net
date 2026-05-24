import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ConversionSignalsPanel({
  signals
}: {
  signals: {
    auditToMembershipClicks: number;
    membershipPageVisits: number;
    joinCtaClicks: number;
    checkoutStarts: number;
    checkoutCompletions: number;
    bestConvertingSource: string;
  };
}) {
  const rows = [
    ["Audit to membership clicks", signals.auditToMembershipClicks],
    ["Membership page visits", signals.membershipPageVisits],
    ["Join CTA clicks", signals.joinCtaClicks],
    ["Checkout starts", signals.checkoutStarts],
    ["Checkout completions", signals.checkoutCompletions]
  ] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Signals</CardTitle>
        <CardDescription>Intent markers from audit, membership, join, and checkout journeys.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border/70 bg-background/22 p-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-foreground">{value.toLocaleString("en-GB")}</p>
          </div>
        ))}
        <div className="rounded-2xl border border-gold/24 bg-gold/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Best source</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">{signals.bestConvertingSource}</p>
          <p className="mt-2 text-sm text-muted">Based on available source volume.</p>
        </div>
      </CardContent>
    </Card>
  );
}
