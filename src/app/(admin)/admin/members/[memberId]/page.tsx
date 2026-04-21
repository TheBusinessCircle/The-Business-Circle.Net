import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MembershipTier, Role } from "@prisma/client";
import { ArrowLeft, ExternalLink, Link2, ShieldAlert, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import {
  assignMemberBadgeAction,
  deleteMemberAction,
  grantMemberReputationAction,
  resetMemberReputationAction,
  suspendMemberAction,
  unsuspendMemberAction,
  updateMemberBasicsAction,
  updateMemberTierAction
} from "@/actions/admin/member.actions";
import { CommunityRecognitionPanel } from "@/components/profile";
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
import { getMembershipTierLabel } from "@/config/membership";
import { getAdminMemberDetails } from "@/server/admin";
import { listBadgeCatalog } from "@/server/community-recognition";

type PageProps = {
  params: Promise<{ memberId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ROLE_OPTIONS = [Role.MEMBER, Role.INNER_CIRCLE, Role.ADMIN] as const;

export const metadata: Metadata = createPageMetadata({
  title: "Admin Member Profile",
  description: "Review and manage an individual member account.",
  path: "/admin/members"
});

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function formatEnumLabel(value: string): string {
  return toTitleCase(value.replaceAll("_", " "));
}

function formatBillingInterval(value: "MONTH" | "YEAR" | null) {
  if (!value) {
    return null;
  }

  return value === "YEAR" ? "Annual" : "Monthly";
}

function renderVerificationSummary(member: {
  verificationEmailLastSentAt: Date | null;
  verificationEmailSendCount: number;
  emailVerifiedAt: Date | null;
}) {
  if (member.emailVerifiedAt) {
    return (
      <>
        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200">
          Email Confirmed
        </Badge>
        <p className="mt-2 text-xs text-muted">Accepted: {formatDate(member.emailVerifiedAt)}</p>
        {member.verificationEmailLastSentAt ? (
          <p className="mt-1 text-xs text-muted">
            Last sent: {formatDate(member.verificationEmailLastSentAt)}
          </p>
        ) : null}
        {member.verificationEmailSendCount > 0 ? (
          <p className="mt-1 text-xs text-muted">
            Total sends: {member.verificationEmailSendCount}
          </p>
        ) : null}
      </>
    );
  }

  if (member.verificationEmailLastSentAt) {
    return (
      <>
        <Badge variant="outline" className="border-border text-muted">
          Email Sent
        </Badge>
        <p className="mt-2 text-xs text-muted">
          Last sent: {formatDate(member.verificationEmailLastSentAt)}
        </p>
        <p className="mt-1 text-xs text-muted">
          Total sends: {member.verificationEmailSendCount}
        </p>
        <p className="mt-1 text-xs text-muted">Still waiting for member confirmation.</p>
      </>
    );
  }

  return (
    <>
      <Badge variant="outline" className="border-border text-muted">
        Not Sent
      </Badge>
      <p className="mt-2 text-xs text-muted">No confirmation email has been recorded yet.</p>
    </>
  );
}

function buildFeedbackMessage(input: { error: string; notice: string }) {
  const noticeMap: Record<string, string> = {
    "member-updated": "Member details were updated.",
    "tier-updated": "Membership tier was updated.",
    "member-suspended": "Member account has been suspended.",
    "member-unsuspended": "Member account has been reactivated.",
    "member-deleted": "Member account was permanently deleted.",
    "reputation-granted": "Reputation points were granted.",
    "reputation-reset": "Reputation was reset to zero.",
    "badge-assigned": "Badge was assigned to the member."
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
    "email-exists": "That email address is already used by another account.",
    "badge-not-found": "The selected badge was not found."
  };

  if (input.notice && noticeMap[input.notice]) {
    return { type: "notice" as const, message: noticeMap[input.notice] };
  }

  if (input.error && errorMap[input.error]) {
    return { type: "error" as const, message: errorMap[input.error] };
  }

  return null;
}

export default async function AdminMemberDetailsPage({ params, searchParams }: PageProps) {
  const session = await requireAdmin();
  const { memberId } = await params;
  const parsedSearchParams = await searchParams;

  const [member, badgeCatalog] = await Promise.all([
    getAdminMemberDetails(memberId),
    listBadgeCatalog()
  ]);
  if (!member) {
    notFound();
  }

  const returnPath = `/admin/members/${member.id}`;
  const feedback = buildFeedbackMessage({
    error: firstValue(parsedSearchParams.error),
    notice: firstValue(parsedSearchParams.notice)
  });
  const tierLocked = member.role === Role.ADMIN;
  const deletionLocked = member.id === session.user.id;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/members" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
            <ArrowLeft size={14} />
            Back to Members
          </Link>
          <h1 className="mt-2 font-display text-3xl font-semibold">Member Management</h1>
          <p className="text-sm text-muted">Review account access, role, and subscription controls for this member.</p>
        </div>
        <Link href={buildMemberProfilePath(member.id)} target="_blank" rel="noopener noreferrer">
          <Button variant="outline">
            View Public Profile
            <ExternalLink size={14} className="ml-1" />
          </Button>
        </Link>
      </div>

      {feedback ? (
        <Card className={feedback.type === "error" ? "border-red-500/40 bg-red-500/10" : "border-gold/30 bg-gold/10"}>
          <CardContent className="py-3">
            <p className={feedback.type === "error" ? "text-sm text-red-200" : "text-sm text-gold"}>
              {feedback.message}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/85 to-card/70">
        <CardHeader>
          <CardTitle>{member.name || member.email}</CardTitle>
          <CardDescription>{member.email}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-border text-muted">
            Role: {formatEnumLabel(member.role)}
          </Badge>
          <Badge
            variant="outline"
            className="border-border text-muted"
          >
            Tier: {getMembershipTierLabel(member.membershipTier)}
          </Badge>
          <FoundingBadge tier={member.foundingTier} />
          <Badge variant="outline" className="border-border text-muted">
            Subscription: {formatEnumLabel(member.subscriptionStatus)}
          </Badge>
          {member.subscriptionBillingVariant ? (
            <Badge variant="outline" className="border-border text-muted">
              Pricing: {formatEnumLabel(member.subscriptionBillingVariant)}
              {member.subscriptionBillingInterval
                ? ` · ${formatBillingInterval(member.subscriptionBillingInterval)}`
                : ""}
            </Badge>
          ) : null}
          {member.suspended ? (
            <Badge className="bg-red-600/20 text-red-200 hover:bg-red-600/20">
              <ShieldAlert size={12} className="mr-1" />
              Suspended
            </Badge>
          ) : (
            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200">
              <ShieldCheck size={12} className="mr-1" />
              Active
            </Badge>
          )}
          <Badge variant="outline" className="border-border text-muted">
            Joined: {formatDate(member.createdAt)}
          </Badge>
          {member.emailVerifiedAt ? (
            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200">
              Email confirmed
            </Badge>
          ) : member.verificationEmailLastSentAt ? (
            <Badge variant="outline" className="border-border text-muted">
              Confirmation sent
            </Badge>
          ) : (
            <Badge variant="outline" className="border-border text-muted">
              Confirmation not sent
            </Badge>
          )}
          {member.location ? (
            <Badge variant="outline" className="border-border text-muted">
              Location: {member.location}
            </Badge>
          ) : null}
          {member.companyName ? (
            <Badge variant="outline" className="border-border text-muted">
              Company: {member.companyName}
            </Badge>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card id="member-basics">
          <CardHeader>
            <CardTitle>Edit Member Basics</CardTitle>
            <CardDescription>Update core account identity and role access.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateMemberBasicsAction} className="space-y-3">
              <input type="hidden" name="memberId" value={member.id} />
              <input type="hidden" name="returnPath" value={returnPath} />

              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input id="name" name="name" defaultValue={member.name || ""} maxLength={100} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" defaultValue={member.email} type="email" required maxLength={254} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select id="role" name="role" defaultValue={member.role}>
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {formatEnumLabel(role)}
                    </option>
                  ))}
                </Select>
              </div>

              <Button type="submit" variant="outline">
                Save Basics
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Membership & Access</CardTitle>
            <CardDescription>Adjust tier entitlements and account suspension.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={updateMemberTierAction} className="space-y-3">
              <input type="hidden" name="memberId" value={member.id} />
              <input type="hidden" name="returnPath" value={returnPath} />

              <div className="space-y-2">
                <Label htmlFor="membershipTier">Membership Tier</Label>
                <Select
                  id="membershipTier"
                  name="membershipTier"
                  defaultValue={member.membershipTier}
                  disabled={tierLocked}
                >
                  <option value={MembershipTier.FOUNDATION}>Foundation</option>
                  <option value={MembershipTier.INNER_CIRCLE}>Inner Circle</option>
                  <option value={MembershipTier.CORE}>Core</option>
                </Select>
                {tierLocked ? (
                  <p className="text-xs text-muted">
                    Tier is automatically locked to Core for admin accounts.
                  </p>
                ) : null}
              </div>

              <Button type="submit" variant="outline" disabled={tierLocked}>
                Update Tier
              </Button>
            </form>

            <div className="rounded-xl border border-border p-3">
              <p className="text-sm font-medium text-foreground">Email Confirmation</p>
              <p className="mt-1 text-xs text-muted">
                Track whether the verification email has gone out and when the member accepted it.
              </p>
              <div className="mt-3 rounded-2xl border border-border/80 bg-background/25 px-4 py-3">
                {renderVerificationSummary(member)}
              </div>
            </div>

            <div className="rounded-xl border border-border p-3">
              <p className="text-sm font-medium text-foreground">Current subscription state</p>
              <p className="mt-1 text-xs text-muted">
                Stripe remains the source of truth for status, billing cadence, and cancellation timing.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/80 bg-background/25 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Status</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {formatEnumLabel(member.subscriptionStatus)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-background/25 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Cadence</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {member.subscriptionBillingInterval
                      ? formatBillingInterval(member.subscriptionBillingInterval)
                      : "Not yet synced"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-background/25 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Variant</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {member.subscriptionBillingVariant
                      ? formatEnumLabel(member.subscriptionBillingVariant)
                      : "Standard"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-background/25 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Period end</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {member.subscriptionCurrentPeriodEnd
                      ? formatDate(member.subscriptionCurrentPeriodEnd)
                      : "No active billing period"}
                  </p>
                </div>
              </div>
              {member.subscriptionCancelAtPeriodEnd ? (
                <p className="mt-3 text-xs text-gold">
                  This subscription is set to cancel at the end of the current billing period.
                </p>
              ) : null}
            </div>

            <div className="rounded-xl border border-border p-3">
              <p className="text-sm font-medium text-foreground">Account Suspension</p>
              <p className="mt-1 text-xs text-muted">
                Suspended members lose protected area access until manually unsuspended.
              </p>
              <form action={member.suspended ? unsuspendMemberAction : suspendMemberAction} className="mt-3">
                <input type="hidden" name="memberId" value={member.id} />
                <input type="hidden" name="returnPath" value={returnPath} />
                <Button
                  type="submit"
                  variant={member.suspended ? "outline" : "ghost"}
                  className={member.suspended ? "" : "text-red-300 hover:bg-red-500/10 hover:text-red-200"}
                >
                  {member.suspended ? "Unsuspend Account" : "Suspend Account"}
                </Button>
              </form>
              {member.suspendedAt ? (
                <p className="mt-2 text-xs text-muted">Suspended at: {formatDate(member.suspendedAt)}</p>
              ) : null}
            </div>

            <div className="rounded-xl border border-red-500/35 bg-red-500/10 p-3">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-red-100">
                <Trash2 size={14} />
                Permanent Account Deletion
              </p>
              <p className="mt-1 text-xs text-red-100/80">
                This permanently removes the member account, sign-in access, profile, and related
                member-owned data so the same email can register again. Cancel live membership
                billing before deleting the account.
              </p>
              <form action={deleteMemberAction} className="mt-3 space-y-3">
                <input type="hidden" name="memberId" value={member.id} />
                <input type="hidden" name="returnPath" value={returnPath} />
                <div className="space-y-2">
                  <Label htmlFor="confirmationEmail">Type the member email to confirm</Label>
                  <Input
                    id="confirmationEmail"
                    name="confirmationEmail"
                    type="email"
                    placeholder={member.email}
                    autoComplete="off"
                    disabled={deletionLocked}
                  />
                </div>
                <Button type="submit" variant="danger" disabled={deletionLocked}>
                  Delete Account Permanently
                </Button>
              </form>
              {deletionLocked ? (
                <p className="mt-2 text-xs text-red-100/80">
                  Use a different admin account if you ever need to remove this one.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <CommunityRecognitionPanel
          recognition={member.recognition}
          description="This is the member's visible standing across chat, profiles, and the directory."
        />

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <Link2 size={16} className="text-gold" />
              Invite Relationships
            </CardTitle>
            <CardDescription>
              Track who invited this member and who they have brought into the network.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/80 bg-background/30 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Invite Code</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {member.inviteDashboard?.inviteCode ?? "Not generated yet"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-background/30 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Total Referrals</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {member.inviteDashboard?.totalReferrals ?? 0}
                </p>
              </div>
            </div>

            {member.inviteDashboard ? (
              <div className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Invite Link</p>
                <p className="mt-2 break-all text-sm text-foreground">{member.inviteDashboard.inviteLink}</p>
              </div>
            ) : null}

            <div className="rounded-2xl border border-border/80 bg-background/25 px-4 py-4">
              <p className="text-sm font-medium text-foreground">Invited By</p>
              {member.invitedBy ? (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-foreground">
                    {member.invitedBy.name || member.invitedBy.email}
                  </p>
                  <p className="text-xs text-muted">{member.invitedBy.email}</p>
                  <div className="flex flex-wrap gap-2">
                    <MembershipTierBadge tier={member.invitedBy.subscriptionTier} />
                    {member.invitedBy.inviteCode ? (
                      <Badge variant="outline" className="normal-case tracking-normal">
                        Code {member.invitedBy.inviteCode}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted">Joined via invite on {formatDate(member.invitedBy.joinedAt)}</p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted">This member was not created through a tracked invite link.</p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Recent Referrals</p>
              {member.inviteDashboard?.referrals.length ? (
                member.inviteDashboard.referrals.slice(0, 5).map((referral) => (
                  <div
                    key={referral.id}
                    className="rounded-2xl border border-border/80 bg-background/25 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {referral.name || referral.email}
                        </p>
                        <p className="text-xs text-muted">{referral.email}</p>
                      </div>
                      <MembershipTierBadge tier={referral.subscriptionTier} />
                    </div>
                    <p className="mt-2 text-xs text-muted">Joined {formatDate(referral.joinedAt)}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 bg-background/20 px-4 py-4 text-sm text-muted">
                  No referrals recorded for this member yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <Sparkles size={16} className="text-gold" />
              Reputation Controls
            </CardTitle>
            <CardDescription>
              Grant additional reputation points for contributions or reset the score when needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/80 bg-background/25 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Current Reputation</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{member.recognition.score}</p>
            </div>

            <form action={grantMemberReputationAction} className="space-y-3">
              <input type="hidden" name="memberId" value={member.id} />
              <input type="hidden" name="returnPath" value={returnPath} />

              <div className="space-y-2">
                <Label htmlFor="points">Grant Points</Label>
                <Input id="points" name="points" type="number" min={1} max={1000} defaultValue={20} />
                <p className="text-xs text-muted">Use positive whole numbers between 1 and 1000.</p>
              </div>

              <Button type="submit" variant="outline">
                Grant Reputation
              </Button>
            </form>

            <form action={resetMemberReputationAction}>
              <input type="hidden" name="memberId" value={member.id} />
              <input type="hidden" name="returnPath" value={returnPath} />
              <Button type="submit" variant="ghost" className="text-red-300 hover:bg-red-500/10 hover:text-red-200">
                Reset Reputation
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manual Badge Assignment</CardTitle>
            <CardDescription>
              Assign premium recognition badges in addition to the system-generated community status badges.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={assignMemberBadgeAction} className="space-y-3">
              <input type="hidden" name="memberId" value={member.id} />
              <input type="hidden" name="returnPath" value={returnPath} />

              <div className="space-y-2">
                <Label htmlFor="badgeSlug">Badge</Label>
                <Select id="badgeSlug" name="badgeSlug" defaultValue={badgeCatalog[0]?.slug}>
                  {badgeCatalog.map((badge) => (
                    <option key={badge.id} value={badge.slug}>
                      {badge.name}
                    </option>
                  ))}
                </Select>
              </div>

              <Button type="submit" variant="outline">
                Assign Badge
              </Button>
            </form>

            <div className="rounded-2xl border border-border/80 bg-background/25 px-4 py-4">
              <p className="text-sm font-medium text-foreground">Current Badges</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {member.recognition.badges.length ? (
                  member.recognition.badges.map((badge) => (
                    <Badge
                      key={badge.slug}
                      variant="outline"
                      title={badge.description}
                      className="normal-case tracking-normal"
                    >
                      {badge.name}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted">No badges assigned or earned yet.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
