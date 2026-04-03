import type { Metadata } from "next";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import {
  approveGroupHostRequestAction,
  rejectGroupHostRequestAction
} from "@/actions/admin/calling.actions";
import { AdminCallingSubnav } from "@/components/calling";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPageMetadata } from "@/lib/seo";
import { formatDateTime } from "@/lib/utils";
import {
  listPendingGroupHostAccessRequests,
  listRecentGroupHostAccessRequests
} from "@/server/calling";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Calling Requests",
  description: "Review and process group host access requests.",
  path: "/admin/calling/requests"
});

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function feedbackMessage(params: { notice: string; error: string }) {
  const noticeMap: Record<string, string> = {
    "host-request-approved": "The host request has been approved and converted into permission settings.",
    "host-request-rejected": "The host request has been rejected."
  };

  const errorMap: Record<string, string> = {
    "invalid-host-request": "The host request form was invalid."
  };

  if (params.notice && noticeMap[params.notice]) {
    return { type: "notice" as const, message: noticeMap[params.notice] };
  }

  if (params.error && errorMap[params.error]) {
    return { type: "error" as const, message: errorMap[params.error] };
  }

  return null;
}

export default async function AdminCallingRequestsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [pendingRequests, recentRequests] = await Promise.all([
    listPendingGroupHostAccessRequests(),
    listRecentGroupHostAccessRequests(20)
  ]);
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
              <Clock3 size={12} className="mr-1" />
              Host Requests
            </Badge>
            <CardTitle className="mt-3 font-display text-3xl">Request Review Queue</CardTitle>
            <CardDescription className="mt-2 text-base">
              Approve or reject hosting requests and convert approvals directly into active permissions.
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
          <CardTitle>Pending requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingRequests.length ? (
            pendingRequests.map((request) => (
              <Card key={request.id} className="border-border/80 bg-background/20">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl">{request.user.name || request.user.email}</CardTitle>
                      <CardDescription>
                        {request.user.email} | {request.user.membershipTier.replaceAll("_", " ")}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">{formatDateTime(request.requestedAt)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-border/80 bg-background/25 px-4 py-3 text-sm text-muted">
                    {request.message || "No message was included with this request."}
                  </div>

                  <form action={approveGroupHostRequestAction} className="space-y-4">
                    <input type="hidden" name="requestId" value={request.id} />
                    <input type="hidden" name="returnPath" value="/admin/calling/requests" />
                    <input type="hidden" name="canHostGroupCalls" value="true" />
                    <input type="hidden" name="isActive" value="true" />

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor={`request-level-${request.id}`}>Host level</Label>
                        <Input id={`request-level-${request.id}`} name="hostLevel" type="number" min={1} max={3} defaultValue={1} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`request-cap-${request.id}`}>Max participants</Label>
                        <Input id={`request-cap-${request.id}`} name="maxParticipants" type="number" min={2} max={100} defaultValue={6} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`request-concurrency-${request.id}`}>Concurrent rooms</Label>
                        <Input id={`request-concurrency-${request.id}`} name="maxConcurrentRooms" type="number" min={1} max={20} defaultValue={1} />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`request-expiry-${request.id}`}>Expiry</Label>
                        <Input id={`request-expiry-${request.id}`} name="expiresAt" type="datetime-local" />
                      </div>
                      <div className="space-y-2">
                        <Label>Allowed tiers</Label>
                        <div className="flex flex-wrap gap-4 rounded-2xl border border-border/80 bg-background/25 p-4 text-sm text-muted">
                          {[
                            { label: "Foundation", value: "FOUNDATION" },
                            { label: "Inner Circle", value: "INNER_CIRCLE" },
                            { label: "Core", value: "CORE" }
                          ].map((tier) => (
                            <label key={`${request.id}-${tier.value}`} className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                name="allowedTierVisibility"
                                value={tier.value}
                                defaultChecked={tier.value === request.user.membershipTier}
                                className="h-4 w-4 rounded border-border bg-background/40"
                              />
                              {tier.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`request-notes-${request.id}`}>Review notes</Label>
                      <Textarea id={`request-notes-${request.id}`} name="reviewNotes" placeholder="Optional approval notes" />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button type="submit">
                        <CheckCircle2 size={15} className="mr-2" />
                        Approve request
                      </Button>
                      <Button formAction={rejectGroupHostRequestAction} variant="outline" type="submit">
                        <XCircle size={15} className="mr-2" />
                        Reject request
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted">No pending host access requests right now.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent request history</CardTitle>
          <CardDescription>The most recent approvals, rejections, and pending submissions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentRequests.map((request) => (
            <div key={request.id} className="rounded-2xl border border-border/80 bg-background/25 px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{request.user.name || request.user.email}</p>
                  <p className="text-xs text-muted">{request.user.email}</p>
                </div>
                <Badge variant="outline">{request.status}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted">
                Requested {formatDateTime(request.requestedAt)}
                {request.reviewedAt ? ` | Reviewed ${formatDateTime(request.reviewedAt)}` : ""}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
