import type { Metadata } from "next";
import Link from "next/link";
import { MembershipTier, Role, SubscriptionStatus } from "@prisma/client";
import { ExternalLink, Filter, Search, ShieldAlert, ShieldCheck, UserCog } from "lucide-react";
import {
  deleteMemberAction,
  suspendMemberAction,
  unsuspendMemberAction,
  updateMemberTierAction
} from "@/actions/admin/member.actions";
import { AdminMemberDeleteForm } from "@/components/admin/admin-member-delete-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FoundingBadge } from "@/components/ui/founding-badge";
import { MembershipTierBadge } from "@/components/ui/membership-tier-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { buildMemberProfilePath } from "@/lib/member-paths";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import { formatDate, toTitleCase } from "@/lib/utils";
import type {
  AdminMemberSubscriptionFilter,
  AdminMemberSuspensionFilter,
  AdminMembersQueryInput
} from "@/types";
import { listAdminMembers } from "@/server/admin";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const PAGE_SIZE = 20;
const ROLE_OPTIONS = [Role.MEMBER, Role.INNER_CIRCLE, Role.ADMIN] as const;
const TIER_OPTIONS = [MembershipTier.FOUNDATION, MembershipTier.INNER_CIRCLE, MembershipTier.CORE] as const;
const SUBSCRIPTION_OPTIONS = ["ANY", "NONE", ...Object.values(SubscriptionStatus)] as const;
const SUSPENSION_OPTIONS = ["ANY", "ACTIVE", "SUSPENDED"] as const;

export const metadata: Metadata = createPageMetadata({
  title: "Admin Members",
  description: "Search, filter, and manage member accounts, roles, tiers, and account suspension.",
  path: "/admin/members"
});

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function parsePage(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function formatEnumLabel(value: string): string {
  return toTitleCase(value.replaceAll("_", " "));
}

function parseRole(value: string): Role | "" {
  if (ROLE_OPTIONS.includes(value as Role)) {
    return value as Role;
  }

  return "";
}

function parseTier(value: string): MembershipTier | "" {
  if (TIER_OPTIONS.includes(value as MembershipTier)) {
    return value as MembershipTier;
  }

  return "";
}

function parseSubscriptionFilter(value: string): AdminMemberSubscriptionFilter {
  if (SUBSCRIPTION_OPTIONS.includes(value as (typeof SUBSCRIPTION_OPTIONS)[number])) {
    return value as AdminMemberSubscriptionFilter;
  }

  return "ANY";
}

function parseSuspensionFilter(value: string): AdminMemberSuspensionFilter {
  if (SUSPENSION_OPTIONS.includes(value as (typeof SUSPENSION_OPTIONS)[number])) {
    return value as AdminMemberSuspensionFilter;
  }

  return "ANY";
}

function buildMembersHref(input: {
  query: string;
  role: Role | "";
  membershipTier: MembershipTier | "";
  subscriptionStatus: AdminMemberSubscriptionFilter;
  suspension: AdminMemberSuspensionFilter;
  page: number;
}): string {
  const params = new URLSearchParams();

  if (input.query) {
    params.set("q", input.query);
  }

  if (input.role) {
    params.set("role", input.role);
  }

  if (input.membershipTier) {
    params.set("tier", input.membershipTier);
  }

  if (input.subscriptionStatus !== "ANY") {
    params.set("subscription", input.subscriptionStatus);
  }

  if (input.suspension !== "ANY") {
    params.set("suspended", input.suspension);
  }

  if (input.page > 1) {
    params.set("page", String(input.page));
  }

  const query = params.toString();
  return query.length ? `/admin/members?${query}` : "/admin/members";
}

function buildFeedbackMessage(input: { error: string; notice: string }) {
  const noticeMap: Record<string, string> = {
    "member-updated": "Member details were updated.",
    "tier-updated": "Membership tier was updated.",
    "member-suspended": "Member account has been suspended.",
    "member-unsuspended": "Member account has been reactivated.",
    "member-deleted": "Member account was permanently deleted."
  };

  const errorMap: Record<string, string> = {
    invalid: "The request payload was invalid.",
    "not-found": "That member account no longer exists.",
    "self-role": "You cannot remove your own admin privileges.",
    "self-delete": "You cannot delete your own admin account.",
    "self-suspend": "You cannot suspend your own account.",
    "last-admin": "At least one active admin must remain on the platform.",
    "delete-confirmation-mismatch": "Type the exact member email address to confirm deletion.",
    "delete-active-subscription": "Cancel live membership billing before deleting this account.",
    "member-delete-failed": "Unable to permanently delete that account right now.",
    "email-exists": "That email address is already used by another account."
  };

  if (input.notice && noticeMap[input.notice]) {
    return { type: "notice" as const, message: noticeMap[input.notice] };
  }

  if (input.error && errorMap[input.error]) {
    return { type: "error" as const, message: errorMap[input.error] };
  }

  return null;
}

export default async function AdminMembersPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;

  const query = firstValue(params.q).trim().slice(0, 120);
  const role = parseRole(firstValue(params.role).toUpperCase());
  const membershipTier = parseTier(firstValue(params.tier).toUpperCase());
  const subscriptionStatus = parseSubscriptionFilter(firstValue(params.subscription).toUpperCase());
  const suspension = parseSuspensionFilter(firstValue(params.suspended).toUpperCase());
  const page = parsePage(firstValue(params.page));

  const filters: AdminMembersQueryInput = {
    query,
    role,
    membershipTier,
    subscriptionStatus,
    suspension,
    page,
    pageSize: PAGE_SIZE
  };

  const result = await listAdminMembers(filters);
  const hasFilters = Boolean(
    query || role || membershipTier || subscriptionStatus !== "ANY" || suspension !== "ANY"
  );
  const rangeStart = result.total ? (result.page - 1) * result.pageSize + 1 : 0;
  const rangeEnd = result.total ? Math.min(result.total, result.page * result.pageSize) : 0;
  const currentPath = buildMembersHref({
    query,
    role,
    membershipTier,
    subscriptionStatus,
    suspension,
    page: result.page
  });
  const feedback = buildFeedbackMessage({
    error: firstValue(params.error),
    notice: firstValue(params.notice)
  });

  return (
    <div className="space-y-6">
      <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/80 to-card/70">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="outline" className="border-gold/35 bg-gold/15 text-gold">
                <UserCog size={12} className="mr-1" />
                Member Administration
              </Badge>
              <CardTitle className="mt-3 font-display text-3xl">Member Manager</CardTitle>
              <CardDescription className="mt-2 text-base">
                Search, filter, and manage account access, membership tiers, and suspension state.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="muted" className="normal-case tracking-normal">
                {result.total} total members
              </Badge>
              <Badge variant="outline" className="text-muted normal-case tracking-normal">
                Showing {rangeStart}-{rangeEnd}
              </Badge>
            </div>
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

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <Filter size={16} />
            Search & Filters
          </CardTitle>
          <CardDescription>Filter members by role, tier, subscription state, and suspension status.</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="GET" className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-6">
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="q">Search</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
                  <Input
                    id="q"
                    name="q"
                    defaultValue={query}
                    className="pl-8"
                    placeholder="Name, email, company..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select id="role" name="role" defaultValue={role}>
                  <option value="">Any role</option>
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {formatEnumLabel(option)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tier">Membership Tier</Label>
                <Select id="tier" name="tier" defaultValue={membershipTier}>
                  <option value="">Any tier</option>
                  {TIER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {formatEnumLabel(option)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subscription">Subscription</Label>
                <Select id="subscription" name="subscription" defaultValue={subscriptionStatus}>
                  <option value="ANY">Any status</option>
                  <option value="NONE">No subscription</option>
                  {Object.values(SubscriptionStatus).map((status) => (
                    <option key={status} value={status}>
                      {formatEnumLabel(status)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="suspended">Account State</Label>
                <Select id="suspended" name="suspended" defaultValue={suspension}>
                  <option value="ANY">Any state</option>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit">Apply Filters</Button>
              {hasFilters ? (
                <Link href="/admin/members">
                  <Button type="button" variant="outline">
                    Clear Filters
                  </Button>
                </Link>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Use row actions to open profile context, edit basics, update tier access, and control suspension.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-background/25 text-xs uppercase tracking-[0.06em] text-muted">
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium">Membership</th>
                  <th className="px-3 py-2 font-medium">Subscription</th>
                  <th className="px-3 py-2 font-medium">Created</th>
                  <th className="px-3 py-2 font-medium">Suspended</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.items.length ? (
                  result.items.map((member) => {
                    const tierLocked = member.role === Role.ADMIN;

                    return (
                      <tr key={member.id} className="border-b border-border/70 align-top transition-colors hover:bg-background/20">
                        <td className="px-3 py-3">
                          <p className="font-medium text-foreground">{member.name || "Unnamed member"}</p>
                          <p className="mt-1 text-xs text-muted">{member.companyName || "No business profile yet"}</p>
                        </td>
                        <td className="px-3 py-3 text-muted">{member.email}</td>
                        <td className="px-3 py-3">
                          <Badge variant="outline" className="text-muted normal-case tracking-normal">
                            {formatEnumLabel(member.role)}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            <MembershipTierBadge tier={member.membershipTier} />
                            <FoundingBadge tier={member.foundingTier} />
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant="outline" className="text-muted normal-case tracking-normal">
                            {formatEnumLabel(member.subscriptionStatus)}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-muted">{formatDate(member.createdAt)}</td>
                        <td className="px-3 py-3">
                          {member.suspended ? (
                            <Badge variant="danger" className="normal-case tracking-normal">
                              <ShieldAlert size={12} className="mr-1" />
                              Suspended
                            </Badge>
                          ) : (
                            <Badge variant="success" className="normal-case tracking-normal">
                              <ShieldCheck size={12} className="mr-1" />
                              Active
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-2">
                              <Link href={`/admin/members/${member.id}`}>
                                <Button variant="outline" size="sm">
                                  View Member
                                </Button>
                              </Link>
                              <Link href={`/admin/members/${member.id}#member-basics`}>
                                <Button variant="outline" size="sm">
                                  Edit Basics
                                </Button>
                              </Link>
                              <Link href={buildMemberProfilePath(member.id)} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm">
                                  Public Profile
                                  <ExternalLink size={12} className="ml-1" />
                                </Button>
                              </Link>
                            </div>

                            <form action={updateMemberTierAction} className="flex flex-wrap items-center gap-2">
                              <input type="hidden" name="memberId" value={member.id} />
                              <input type="hidden" name="returnPath" value={currentPath} />
                              <Select
                                name="membershipTier"
                                defaultValue={member.membershipTier}
                                className="h-8 min-w-[120px] text-xs"
                                disabled={tierLocked}
                              >
                                <option value={MembershipTier.FOUNDATION}>Foundation</option>
                                <option value={MembershipTier.INNER_CIRCLE}>Inner Circle</option>
                                <option value={MembershipTier.CORE}>Core</option>
                              </Select>
                              <Button type="submit" variant="outline" size="sm" disabled={tierLocked}>
                                Update Tier
                              </Button>
                            </form>

                            <form action={member.suspended ? unsuspendMemberAction : suspendMemberAction} className="w-full">
                              <input type="hidden" name="memberId" value={member.id} />
                              <input type="hidden" name="returnPath" value={currentPath} />
                              <Button
                                type="submit"
                                size="sm"
                                variant={member.suspended ? "outline" : "ghost"}
                                className={
                                  member.suspended
                                    ? "w-full justify-start"
                                    : "w-full justify-start text-red-300 hover:bg-red-500/10 hover:text-red-200"
                                }
                              >
                                {member.suspended ? "Unsuspend Account" : "Suspend Account"}
                              </Button>
                            </form>

                            <AdminMemberDeleteForm
                              action={deleteMemberAction}
                              memberId={member.id}
                              email={member.email}
                              returnPath={currentPath}
                                className={
                                  "w-full"
                                }
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-muted">
                      No members match your current search and filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {result.totalPages > 1 ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            {result.hasPreviousPage ? (
              <Link
                href={buildMembersHref({
                  query,
                  role,
                  membershipTier,
                  subscriptionStatus,
                  suspension,
                  page: result.page - 1
                })}
              >
                <Button variant="outline">Previous Page</Button>
              </Link>
            ) : (
              <Button variant="outline" disabled>
                Previous Page
              </Button>
            )}

            <p className="text-sm text-muted">
              Page {result.page} of {result.totalPages}
            </p>

            {result.hasNextPage ? (
              <Link
                href={buildMembersHref({
                  query,
                  role,
                  membershipTier,
                  subscriptionStatus,
                  suspension,
                  page: result.page + 1
                })}
              >
                <Button variant="outline">Next Page</Button>
              </Link>
            ) : (
              <Button variant="outline" disabled>
                Next Page
              </Button>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

