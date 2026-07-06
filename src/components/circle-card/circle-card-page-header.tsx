import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CircleCardPageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function CircleCardPageHeader({
  title,
  description,
  eyebrow,
  icon,
  badge,
  actions,
  footer,
  children,
  className
}: CircleCardPageHeaderProps) {
  return (
    <header className={cn("circle-card-page-header", className)}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          {eyebrow ? <div className="circle-card-page-eyebrow">{eyebrow}</div> : null}
          <div className="flex min-w-0 items-center gap-3">
            {icon ? <span className="circle-card-page-icon">{icon}</span> : null}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="circle-card-page-title">{title}</h1>
                {badge}
              </div>
              {description ? <p className="circle-card-page-description">{description}</p> : null}
            </div>
          </div>
          {children ? <div className="circle-card-page-supporting">{children}</div> : null}
        </div>
        {actions ? <div className="circle-card-page-actions">{actions}</div> : null}
      </div>
      {footer ? <div className="circle-card-page-footer">{footer}</div> : null}
    </header>
  );
}
