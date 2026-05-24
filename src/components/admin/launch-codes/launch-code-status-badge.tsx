import { LaunchCodeStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

const labels: Record<LaunchCodeStatus, string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  FULL: "Full",
  EXPIRED: "Expired",
  ARCHIVED: "Archived"
};

export function LaunchCodeStatusBadge({ status }: { status: LaunchCodeStatus }) {
  const variant = status === LaunchCodeStatus.ACTIVE ? "premium" : "outline";
  return <Badge variant={variant}>{labels[status]}</Badge>;
}
