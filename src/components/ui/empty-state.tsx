import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  className
}: EmptyStateProps) {
  return (
    <div className={cn("empty-state-panel", className)}>
      {Icon ? (
        <span className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-xl border border-silver/20 bg-silver/10 text-silver">
          <Icon size={16} />
        </span>
      ) : null}
      <p className={cn("font-medium text-foreground", Icon ? "mt-3" : "")}>{title}</p>
      <p className="mt-1 text-sm text-muted">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
