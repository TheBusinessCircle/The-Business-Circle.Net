import Link from "next/link";
import { BusinessStage, MembershipTier } from "@prisma/client";
import { ArrowUpRight, BriefcaseBusiness, Building2, Clock3, MapPin } from "lucide-react";
import type { CommunityRecognitionSummary } from "@/types";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CommunityBadge } from "@/components/ui/community-badge";
import { FoundingBadge } from "@/components/ui/founding-badge";
import { MembershipTierBadge } from "@/components/ui/membership-tier-badge";
import { getPresenceSignal } from "@/lib/community-rhythm";
import { buildMemberProfilePath } from "@/lib/member-paths";
import { getTierAccentTextClassName, getTierCardClassName } from "@/lib/tier-styles";
import { toTitleCase } from "@/lib/utils";

type MemberProfileCardProps = {
  userId: string;
  name: string;
  image?: string | null;
  membershipTier: MembershipTier;
  foundingTier?: MembershipTier | null;
  companyName?: string | null;
  bio?: string | null;
  location?: string | null;
  industry?: string | null;
  stage?: BusinessStage | null;
  experience?: string | null;
  tags?: string[];
  recognition?: CommunityRecognitionSummary;
  lastActiveAt?: Date | null;
};

export function MemberProfileCard({
  userId,
  name,
  image,
  membershipTier,
  foundingTier,
  companyName,
  bio,
  location,
  industry,
  stage,
  experience,
  tags = [],
  recognition,
  lastActiveAt
}: MemberProfileCardProps) {
  const tierCardClassName = getTierCardClassName(membershipTier);
  const tierAccentTextClassName = getTierAccentTextClassName(membershipTier);
  const presence = getPresenceSignal(lastActiveAt);
  const stageLabel = stage ? toTitleCase(stage.replaceAll("_", " ")) : null;

  return (
    <Card className={`interactive-card h-full ${tierCardClassName}`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar name={name} image={image} />
          <div className="min-w-0">
            <CardTitle className="truncate text-lg">{name}</CardTitle>
            <p className={`truncate text-xs ${tierAccentTextClassName}`}>
              {companyName || "Independent Operator"}
            </p>
            {recognition?.primaryBadge ? (
              <div className="mt-2">
                <CommunityBadge badge={recognition.primaryBadge} className="w-fit" />
              </div>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="line-clamp-3 text-muted">
          {bio || "No bio yet. View profile for collaboration details."}
        </p>

        <div className="flex flex-wrap gap-2">
          <MembershipTierBadge tier={membershipTier} />
          <FoundingBadge tier={foundingTier} />
          {presence ? (
            <Badge variant="outline" className="inline-flex items-center gap-1 normal-case tracking-normal">
              <Clock3 size={11} />
              {presence.label}
            </Badge>
          ) : null}
          {industry ? (
            <Badge variant="outline" className="normal-case tracking-normal">
              {industry}
            </Badge>
          ) : null}
          {stageLabel ? (
            <Badge variant="outline" className="normal-case tracking-normal">
              {stageLabel}
            </Badge>
          ) : null}
          {experience ? (
            <Badge variant="outline" className="inline-flex items-center gap-1 normal-case tracking-normal">
              <BriefcaseBusiness size={11} />
              {experience}
            </Badge>
          ) : null}
          {location ? (
            <Badge variant="outline" className="inline-flex items-center gap-1 normal-case tracking-normal">
              <MapPin size={11} />
              {location}
            </Badge>
          ) : null}
          {companyName ? (
            <Badge variant="outline" className="inline-flex items-center gap-1 normal-case tracking-normal">
              <Building2 size={11} />
              Company
            </Badge>
          ) : null}
          {recognition ? (
            <Badge variant="outline" className="normal-case tracking-normal">
              {recognition.statusLevel}
            </Badge>
          ) : null}
          {recognition && recognition.score > 0 ? (
            <Badge variant="outline" className="normal-case tracking-normal">
              Reputation {recognition.score}
            </Badge>
          ) : null}
          {recognition && recognition.referralCount > 0 ? (
            <Badge variant="outline" className="normal-case tracking-normal">
              Invites {recognition.referralCount}
            </Badge>
          ) : null}
        </div>

        {tags.length ? (
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 6).map((tag) => (
              <span
                key={`${userId}-${tag}`}
                className="rounded-md border border-silver/10 bg-background/30 px-2 py-0.5 text-xs text-silver/85"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <Link href={buildMemberProfilePath(userId)}>
          <Button variant="outline" className="w-full justify-center">
            View Business Profile <ArrowUpRight size={14} className="ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
