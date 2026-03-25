import type { CommunityUserSummaryModel } from "@/types";
import { CommunityBadge } from "@/components/ui/community-badge";
import { MemberRoleBadge } from "@/components/ui/member-role-badge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type CommunityUserSignalsProps = {
  user: CommunityUserSummaryModel;
  className?: string;
  maxTags?: number;
};

export function CommunityUserSignals({
  user,
  className,
  maxTags = 2
}: CommunityUserSignalsProps) {
  const visibleTags = user.focusTags.slice(0, maxTags);
  const hasSignals =
    Boolean(user.memberRoleTag) ||
    Boolean(user.primaryBadge) ||
    user.reputationScore > 0 ||
    Boolean(user.industry) ||
    visibleTags.length > 0;

  if (!hasSignals) {
    return null;
  }

  return (
    <div className={cn("mt-2 flex flex-wrap gap-2", className)}>
      <MemberRoleBadge roleTag={user.memberRoleTag} />
      {user.primaryBadge ? <CommunityBadge badge={user.primaryBadge} className="w-fit" /> : null}
      {user.reputationScore > 0 ? (
        <Badge variant="outline" className="normal-case tracking-normal text-muted">
          Reputation {user.reputationScore}
        </Badge>
      ) : null}
      {user.industry ? (
        <Badge variant="outline" className="normal-case tracking-normal text-muted">
          {user.industry}
        </Badge>
      ) : null}
      {visibleTags.map((tag) => (
        <Badge
          key={`${user.id}-${tag}`}
          variant="outline"
          className="normal-case tracking-normal text-muted"
        >
          {tag}
        </Badge>
      ))}
    </div>
  );
}
