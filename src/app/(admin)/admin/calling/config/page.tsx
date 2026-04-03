import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { updateRealtimeSystemConfigAction } from "@/actions/admin/calling.actions";
import { AdminCallingSubnav } from "@/components/calling";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createPageMetadata } from "@/lib/seo";
import { ensureRealtimeSystemConfig } from "@/server/calling";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Calling Config",
  description: "Control global calling flags and default room caps.",
  path: "/admin/calling/config"
});

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function feedbackMessage(params: { notice: string; error: string }) {
  const noticeMap: Record<string, string> = {
    "calling-config-updated": "The calling system configuration has been updated."
  };

  const errorMap: Record<string, string> = {
    "invalid-calling-config": "The calling system configuration form was invalid."
  };

  if (params.notice && noticeMap[params.notice]) {
    return { type: "notice" as const, message: noticeMap[params.notice] };
  }

  if (params.error && errorMap[params.error]) {
    return { type: "error" as const, message: errorMap[params.error] };
  }

  return null;
}

export default async function AdminCallingConfigPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const config = await ensureRealtimeSystemConfig();
  const feedback = feedbackMessage({
    notice: firstValue(params.notice),
    error: firstValue(params.error)
  });

  return (
    <div className="space-y-6">
      <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/80 to-card/70">
        <CardHeader className="space-y-4">
          <div>
            <Badge variant="outline" className="border-gold/35 bg-gold/15 text-gold">
              <Settings size={12} className="mr-1" />
              Realtime Config
            </Badge>
            <CardTitle className="mt-3 font-display text-3xl">Calling System Config</CardTitle>
            <CardDescription className="mt-2 text-base">
              Global toggles and default caps for the internal calling rollout.
            </CardDescription>
          </div>

          <AdminCallingSubnav />
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

      <Card>
        <CardHeader>
          <CardTitle>Platform switches</CardTitle>
          <CardDescription>
            These toggles are enforced before room creation and token issuance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateRealtimeSystemConfigAction} className="space-y-5">
            <input type="hidden" name="returnPath" value="/admin/calling/config" />

            <label className="flex items-start gap-3 rounded-2xl border border-border/80 bg-background/25 px-4 py-4 text-sm text-muted">
              <input
                type="checkbox"
                name="globalCallingEnabled"
                defaultChecked={config.globalCallingEnabled}
                className="mt-0.5 h-4 w-4 rounded border-border bg-background/40"
              />
              <span>
                <span className="block font-medium text-foreground">Global calling enabled</span>
                Allow the platform to create and join call rooms at all.
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-border/80 bg-background/25 px-4 py-4 text-sm text-muted">
              <input
                type="checkbox"
                name="memberHostedGroupCallsEnabled"
                defaultChecked={config.memberHostedGroupCallsEnabled}
                className="mt-0.5 h-4 w-4 rounded border-border bg-background/40"
              />
              <span>
                <span className="block font-medium text-foreground">Member-hosted group calls enabled</span>
                Allow approved non-admin hosts to create group rooms.
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
              <input
                type="checkbox"
                name="emergencyShutdownEnabled"
                defaultChecked={config.emergencyShutdownEnabled}
                className="mt-0.5 h-4 w-4 rounded border-red-400/40 bg-background/40"
              />
              <span>
                <span className="block font-medium text-white">Emergency shutdown</span>
                Immediately block new calling activity across the platform.
              </span>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-muted" htmlFor="default-host-cap">
                  Default member host cap
                </label>
                <Input
                  id="default-host-cap"
                  name="defaultHostParticipantCap"
                  type="number"
                  min={2}
                  max={100}
                  defaultValue={config.defaultHostParticipantCap}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted" htmlFor="founder-room-cap">
                  Founder room default cap
                </label>
                <Input
                  id="founder-room-cap"
                  name="founderRoomDefaultCap"
                  type="number"
                  min={2}
                  max={200}
                  defaultValue={config.founderRoomDefaultCap}
                />
              </div>
            </div>

            <Button type="submit">Save calling config</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
