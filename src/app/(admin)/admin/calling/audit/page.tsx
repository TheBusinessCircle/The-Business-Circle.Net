import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { AdminCallingSubnav } from "@/components/calling";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createPageMetadata } from "@/lib/seo";
import { formatDateTime } from "@/lib/utils";
import { listCallAuditLogs } from "@/server/calling";

export const metadata: Metadata = createPageMetadata({
  title: "Calling Audit",
  description: "Audit trail for calling permissions, room activity, and config changes.",
  path: "/admin/calling/audit"
});

export const dynamic = "force-dynamic";

export default async function AdminCallingAuditPage() {
  const logs = await listCallAuditLogs(80);

  return (
    <div className="space-y-6">
      <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/80 to-card/70">
        <CardHeader className="space-y-4">
          <div>
            <Badge variant="outline" className="border-gold/35 bg-gold/15 text-gold">
              <FileText size={12} className="mr-1" />
              Audit Log
            </Badge>
            <CardTitle className="mt-3 font-display text-3xl">Calling Audit Trail</CardTitle>
            <CardDescription className="mt-2 text-base">
              Review permission changes, request decisions, room creation, endings, and config changes.
            </CardDescription>
          </div>

          <AdminCallingSubnav />
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {logs.length ? (
            logs.map((log) => (
              <div key={log.id} className="rounded-2xl border border-border/80 bg-background/25 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{log.action}</p>
                    <p className="mt-1 text-xs text-muted">
                      Actor: {log.actorUser?.name || log.actorUser?.email || "System"}
                      {log.targetUser ? ` | Target: ${log.targetUser.name || log.targetUser.email}` : ""}
                      {log.room ? ` | Room: ${log.room.title}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline">{formatDateTime(log.createdAt)}</Badge>
                </div>
                {log.metadata ? (
                  <pre className="mt-3 overflow-x-auto rounded-2xl border border-border/70 bg-background/35 p-3 text-xs text-muted">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted">No audit entries have been written yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
