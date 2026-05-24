import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function DeviceBreakdown({
  devices
}: {
  devices: Array<{ device: string; views: number }>;
}) {
  const total = devices.reduce((sum, device) => sum + device.views, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Device Breakdown</CardTitle>
        <CardDescription>Anonymous public page views by broad device type.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {devices.map((device) => (
          <div key={device.device} className="rounded-2xl border border-border/70 bg-background/22 p-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">{device.device}</p>
            <p className="mt-3 text-3xl font-semibold text-foreground">{device.views.toLocaleString("en-GB")}</p>
            <p className="mt-1 text-xs text-muted">{total ? Math.round((device.views / total) * 100) : 0}% of views</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
