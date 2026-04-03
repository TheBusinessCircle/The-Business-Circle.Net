import type { Metadata } from "next";
import { Search, ShieldCheck, Users } from "lucide-react";
import {
  revokeCallHostPermissionAction,
  updateCallHostPermissionAction
} from "@/actions/admin/calling.actions";
import { AdminCallingSubnav } from "@/components/calling";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createPageMetadata } from "@/lib/seo";
import { formatTierVisibility, getHostLevelLabel } from "@/lib/calling";
import { listCallHostPermissions } from "@/server/calling";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Calling Permissions",
  description: "Manage approved group-host permissions and participant limits.",
  path: "/admin/calling/permissions"
});

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function feedbackMessage(params: { notice: string; error: string }) {
  const noticeMap: Record<string, string> = {
    "host-permission-updated": "The host permission has been updated.",
    "host-permission-revoked": "The host permission has been revoked."
  };

  const errorMap: Record<string, string> = {
    "invalid-host-permission": "The host permission form was invalid."
  };

  if (params.notice && noticeMap[params.notice]) {
    return { type: "notice" as const, message: noticeMap[params.notice] };
  }

  if (params.error && errorMap[params.error]) {
    return { type: "error" as const, message: errorMap[params.error] };
  }

  return null;
}

export default async function AdminCallingPermissionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = firstValue(params.q).trim();
  const users = await listCallHostPermissions(query);
  const returnPath = query ? `/admin/calling/permissions?q=${encodeURIComponent(query)}` : "/admin/calling/permissions";
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
              <ShieldCheck size={12} className="mr-1" />
              Host Permissions
            </Badge>
            <CardTitle className="mt-3 font-display text-3xl">Group Host Management</CardTitle>
            <CardDescription className="mt-2 text-base">
              Search members, grant or revoke hosting access, and enforce server-side caps.
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
          <CardTitle className="inline-flex items-center gap-2">
            <Search size={16} />
            Search members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form method="GET" className="flex flex-wrap gap-3">
            <Input name="q" defaultValue={query} placeholder="Search by name or email" className="max-w-md" />
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {users.map((user) => {
          const permission = user.callHostPermission;
          const allowedTiers =
            permission?.allowedTierVisibility?.length ? permission.allowedTierVisibility : [user.membershipTier];

          return (
            <Card key={user.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl">{user.name || user.email}</CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{user.role}</Badge>
                    <Badge variant="outline">{user.membershipTier.replaceAll("_", " ")}</Badge>
                    {permission?.canHostGroupCalls && permission.isActive ? (
                      <Badge variant="outline" className="border-gold/35 bg-gold/10 text-gold">
                        {getHostLevelLabel(permission.hostLevel)}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted">
                        No active group hosting
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-border/80 bg-background/25 px-4 py-3 text-sm text-muted">
                  Allowed audience: {formatTierVisibility(allowedTiers)}
                </div>

                <form action={updateCallHostPermissionAction} className="space-y-4">
                  <input type="hidden" name="returnPath" value={returnPath} />
                  <input type="hidden" name="userId" value={user.id} />

                  <label className="inline-flex items-center gap-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      name="canHostGroupCalls"
                      defaultChecked={permission?.canHostGroupCalls ?? false}
                      className="h-4 w-4 rounded border-border bg-background/40"
                    />
                    Allow group hosting
                  </label>

                  <label className="inline-flex items-center gap-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked={permission?.isActive ?? false}
                      className="h-4 w-4 rounded border-border bg-background/40"
                    />
                    Permission active
                  </label>

                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor={`host-level-${user.id}`}>Host level</Label>
                      <Select
                        id={`host-level-${user.id}`}
                        name="hostLevel"
                        defaultValue={String(permission?.hostLevel ?? 1)}
                      >
                        <option value="0">0 - No hosting</option>
                        <option value="1">1 - Small host</option>
                        <option value="2">2 - Approved host</option>
                        <option value="3">3 - Trusted host</option>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`host-cap-${user.id}`}>Max participants</Label>
                      <Input
                        id={`host-cap-${user.id}`}
                        name="maxParticipants"
                        type="number"
                        min={0}
                        max={100}
                        defaultValue={permission?.maxParticipants ?? 6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`host-concurrency-${user.id}`}>Concurrent rooms</Label>
                      <Input
                        id={`host-concurrency-${user.id}`}
                        name="maxConcurrentRooms"
                        type="number"
                        min={0}
                        max={20}
                        defaultValue={permission?.maxConcurrentRooms ?? 1}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`host-expiry-${user.id}`}>Expiry</Label>
                      <Input
                        id={`host-expiry-${user.id}`}
                        name="expiresAt"
                        type="datetime-local"
                        defaultValue={
                          permission?.expiresAt
                            ? new Date(permission.expiresAt.getTime() - permission.expiresAt.getTimezoneOffset() * 60000)
                                .toISOString()
                                .slice(0, 16)
                            : ""
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Allowed audience tiers</Label>
                    <div className="flex flex-wrap gap-4 rounded-2xl border border-border/80 bg-background/25 p-4 text-sm text-muted">
                      {[
                        { label: "Foundation", value: "FOUNDATION" },
                        { label: "Inner Circle", value: "INNER_CIRCLE" },
                        { label: "Core", value: "CORE" }
                      ].map((tier) => (
                        <label key={`${user.id}-${tier.value}`} className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            name="allowedTierVisibility"
                            value={tier.value}
                            defaultChecked={allowedTiers.includes(tier.value as typeof user.membershipTier)}
                            className="h-4 w-4 rounded border-border bg-background/40"
                          />
                          {tier.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button type="submit">Save permission</Button>
                    <Button formAction={revokeCallHostPermissionAction} variant="outline" type="submit">
                      Revoke hosting
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          );
        })}

        {!users.length ? (
          <Card>
            <CardContent className="py-10 text-center text-muted">
              <Users className="mx-auto mb-3" />
              No members matched the current search.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
