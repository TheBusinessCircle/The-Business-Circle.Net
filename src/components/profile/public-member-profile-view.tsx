import type { BusinessStage, MemberRoleTag, MembershipTier } from "@prisma/client";
import {
  BriefcaseBusiness,
  Clock3,
  Globe,
  Instagram,
  Linkedin,
  MapPin,
  ShieldCheck,
  Target,
  UserRound,
  Video
} from "lucide-react";
import type { ReactNode } from "react";
import type { CommunityRecognitionSummary } from "@/types";
import { StartDirectCallButton } from "@/components/calling";
import { CommunityRecognitionPanel } from "@/components/profile/community-recognition-panel";
import { TierBadge } from "@/components/public/tier-badge";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FoundingBadge } from "@/components/ui/founding-badge";
import { MemberRoleBadge } from "@/components/ui/member-role-badge";
import { getPresenceSignal } from "@/lib/community-rhythm";
import { getMemberRoleLabel } from "@/lib/member-role";
import { getExternalLinkProps } from "@/lib/links";
import { getTierCardClassName } from "@/lib/tier-styles";
import type { ProfileCompletionResult } from "@/lib/profile";
import { toTitleCase } from "@/lib/utils";

type PublicMemberProfileViewProps = {
  member: {
    id: string;
    name: string;
    image?: string | null;
    membershipTier: MembershipTier;
    memberRoleTag: MemberRoleTag;
    foundingTier?: MembershipTier | null;
    headline?: string | null;
    bio?: string | null;
    location?: string | null;
    experience?: string | null;
    website?: string | null;
    instagram?: string | null;
    linkedin?: string | null;
    tiktok?: string | null;
    collaborationNeeds?: string | null;
    collaborationOffers?: string | null;
    partnershipInterests?: string | null;
    collaborationTags: string[];
    lastActiveAt?: Date | null;
    business?: {
      companyName?: string | null;
      description?: string | null;
      industry?: string | null;
      services?: string | null;
      stage?: BusinessStage | null;
      website?: string | null;
    } | null;
  };
  recognition: CommunityRecognitionSummary;
  completion: ProfileCompletionResult;
  viewerCanStartCall?: boolean;
  isSelfView?: boolean;
};

function LinkItem({
  href,
  label,
  icon
}: {
  href: string;
  label: string;
  icon: ReactNode;
}) {
  return (
    <a
      {...getExternalLinkProps(href)}
      className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted hover:border-gold/35 hover:text-foreground"
    >
      {icon}
      {label}
    </a>
  );
}

export function PublicMemberProfileView({
  member,
  recognition,
  completion,
  viewerCanStartCall = false,
  isSelfView = false
}: PublicMemberProfileViewProps) {
  const website = member.website || member.business?.website || null;
  const tierCardClassName = getTierCardClassName(member.membershipTier);
  const presence = getPresenceSignal(member.lastActiveAt);
  const businessIdentity = member.business?.companyName || member.headline || "Member of The Business Circle Network";
  const stageLabel = member.business?.stage
    ? toTitleCase(member.business.stage.replaceAll("_", " "))
    : null;
  const focusTags = member.collaborationTags.slice(0, 8);

  return (
    <div className="space-y-6">
      <Card className={`overflow-hidden ${tierCardClassName}`}>
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:p-8">
          <div className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <Avatar className="h-32 w-32 shrink-0 ring-2 ring-gold/20" name={member.name} image={member.image} />
              <div className="min-w-0 space-y-2">
                <CardTitle className="font-display text-3xl sm:text-4xl">{member.name}</CardTitle>
                <CardDescription className="text-base text-foreground/80">
                  {businessIdentity}
                </CardDescription>
                <p className="max-w-3xl text-sm leading-relaxed text-muted">
                  {member.bio || member.business?.description || "Business identity and collaboration details are still being completed."}
                </p>
                <div className="flex flex-wrap gap-2">
                  <TierBadge tier={member.membershipTier} />
                  <MemberRoleBadge roleTag={member.memberRoleTag} />
                  <FoundingBadge tier={member.foundingTier} />
                  {presence ? (
                    <Badge variant="outline" className="inline-flex items-center gap-1 border-silver/18 bg-silver/10 text-silver">
                      <Clock3 size={12} />
                      {presence.label}
                    </Badge>
                  ) : null}
                  {member.location ? (
                    <Badge variant="outline" className="inline-flex items-center gap-1">
                      <MapPin size={12} />
                      {member.location}
                    </Badge>
                  ) : null}
                  {member.experience ? (
                    <Badge variant="outline" className="inline-flex items-center gap-1">
                      <BriefcaseBusiness size={12} />
                      {member.experience}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-border/80 bg-background/28 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Business identity</p>
                <p className="mt-2 text-base font-semibold text-foreground">
                  {member.business?.companyName || "Independent operator"}
                </p>
                <p className="mt-2 text-sm text-muted">
                  {getMemberRoleLabel(member.memberRoleTag)}
                  {" | "}
                  {member.business?.industry || "Industry not shared yet"}
                  {stageLabel ? ` | ${stageLabel}` : ""}
                </p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-background/28 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Focus areas</p>
                <p className="mt-2 text-base font-semibold text-foreground">
                  {focusTags.length ? `${focusTags.length} listed` : "Not listed yet"}
                </p>
                <p className="mt-2 text-sm text-muted">
                  {focusTags.length
                    ? focusTags.slice(0, 3).join(", ")
                    : "Collaboration tags have not been added yet."}
                </p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-background/28 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Contribution signals</p>
                <p className="mt-2 text-base font-semibold text-foreground">{recognition.statusLevel}</p>
                <p className="mt-2 text-sm text-muted">
                  Reputation {recognition.score} | {recognition.referralCount} invite{recognition.referralCount === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-3xl border border-border/80 bg-background/24 p-5">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Trust signals</p>
            <div className="rounded-2xl border border-border/80 bg-background/28 px-4 py-4">
              <p className="text-xs text-muted">Profile strength</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{completion.percentage}%</p>
              <p className="mt-2 text-sm text-muted">
                A fuller profile creates better introductions and clearer context.
              </p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-background/28 px-4 py-4">
              <p className="text-xs text-muted">Community standing</p>
              <p className="mt-2 inline-flex items-center gap-2 text-base font-semibold text-foreground">
                <ShieldCheck size={16} className="text-silver" />
                {recognition.statusLevel}
              </p>
              <p className="mt-2 text-sm text-muted">
                Visible through badges, contribution history, and member referrals.
              </p>
            </div>
            {viewerCanStartCall && !isSelfView ? (
              <div className="rounded-2xl border border-gold/25 bg-gold/10 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.08em] text-gold">Private member call</p>
                <p className="mt-2 text-sm text-muted">
                  Start a direct 1 to 1 room directly from this profile.
                </p>
                <div className="mt-4">
                  <StartDirectCallButton
                    targetUserId={member.id}
                    label="Start 1 to 1 Call"
                    className="w-full justify-center"
                  />
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-silver/14 bg-card/62">
          <CardHeader>
            <CardTitle>About the Member</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted">{member.bio || "No bio shared yet."}</p>
            {member.experience ? (
              <div className="rounded-xl border border-border bg-background/40 px-3 py-2">
                <p className="text-xs text-muted">Experience</p>
                <p className="text-sm text-foreground">{member.experience}</p>
              </div>
            ) : null}
            {website ? (
              <LinkItem href={website} label="Website" icon={<Globe size={12} />} />
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-silver/14 bg-card/62">
          <CardHeader>
            <CardTitle>Business Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-foreground">{member.business?.companyName || "Independent Operator"}</p>
            <p className="text-sm text-muted">{member.business?.description || "No business description shared yet."}</p>
            <div className="flex flex-wrap gap-2">
              {member.business?.industry ? <Badge variant="outline">{member.business.industry}</Badge> : null}
              {stageLabel ? <Badge variant="outline">{stageLabel}</Badge> : null}
            </div>
            {member.business?.services ? (
              <div className="rounded-xl border border-border bg-background/40 px-3 py-2">
                <p className="text-xs text-muted">Services</p>
                <p className="text-sm text-foreground">{member.business.services}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <CommunityRecognitionPanel
        recognition={recognition}
        description="Professional standing, contribution history, and the signals that make this profile more trusted."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-silver/14 bg-card/62">
          <CardHeader>
            <CardTitle>Collaboration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-border bg-background/40 px-3 py-3">
              <p className="text-xs text-muted">Needs Help With</p>
              <p className="text-sm text-foreground">{member.collaborationNeeds || "Not specified yet."}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 px-3 py-3">
              <p className="text-xs text-muted">Can Help With</p>
              <p className="text-sm text-foreground">{member.collaborationOffers || "Not specified yet."}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 px-3 py-3">
              <p className="text-xs text-muted">Partnership Interests</p>
              <p className="text-sm text-foreground">{member.partnershipInterests || "Not specified yet."}</p>
            </div>
            {member.collaborationTags.length ? (
              <div className="flex flex-wrap gap-1">
                {member.collaborationTags.map((tag) => (
                  <Badge key={`${member.id}-${tag}`} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-silver/14 bg-card/62">
          <CardHeader>
            <CardTitle>Social & Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {member.linkedin ? <LinkItem href={member.linkedin} label="LinkedIn" icon={<Linkedin size={12} />} /> : null}
            {member.instagram ? <LinkItem href={member.instagram} label="Instagram" icon={<Instagram size={12} />} /> : null}
            {member.tiktok ? <LinkItem href={member.tiktok} label="TikTok" icon={<Video size={12} />} /> : null}
            {website ? <LinkItem href={website} label="Website" icon={<Globe size={12} />} /> : null}

            {!member.linkedin && !member.instagram && !member.tiktok && !website ? (
              <p className="text-sm text-muted">No public links shared yet.</p>
            ) : null}

            <div className="mt-2 rounded-xl border border-border/80 bg-background/40 p-3 text-xs text-muted">
              <p className="inline-flex items-center gap-1">
                <UserRound size={12} />
                This profile is part of The Business Circle Network.
              </p>
              <p className="mt-1 inline-flex items-center gap-1">
                <Target size={12} />
                Members connect through resources, accountability, and strategic collaboration.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
