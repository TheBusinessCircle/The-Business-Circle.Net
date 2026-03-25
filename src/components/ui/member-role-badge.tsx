import type { MemberRoleTag } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { getMemberRoleLabel } from "@/lib/member-role";
import { cn } from "@/lib/utils";

type MemberRoleBadgeProps = {
  roleTag: MemberRoleTag | null | undefined;
  className?: string;
};

function roleTone(roleTag: MemberRoleTag) {
  if (roleTag === "ADVISOR") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
  }

  if (roleTag === "OPERATOR") {
    return "border-sky-500/25 bg-sky-500/10 text-sky-200";
  }

  return "border-amber-500/25 bg-amber-500/10 text-amber-100";
}

export function MemberRoleBadge({ roleTag, className }: MemberRoleBadgeProps) {
  if (!roleTag) {
    return null;
  }

  return (
    <Badge
      variant="outline"
      className={cn("normal-case tracking-normal", roleTone(roleTag), className)}
    >
      {getMemberRoleLabel(roleTag)}
    </Badge>
  );
}
