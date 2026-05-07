import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AppShellProps = {
  header?: ReactNode;
  footer?: ReactNode;
  sidebar?: ReactNode;
  rightRail?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function AppShell({
  header,
  footer,
  sidebar,
  rightRail,
  children,
  className,
  contentClassName
}: AppShellProps) {
  const hasWorkspaceColumns = Boolean(sidebar || rightRail);

  return (
    <div className={cn("flex min-h-screen flex-col overflow-x-clip", className)}>
      {header}
      <div className="page-surface page-surface-workspace flex-1 overflow-x-clip transition-colors duration-200">
        <main
          className={cn(
            "bcn-page-shell bcn-container-wide py-7 sm:py-8 lg:py-10",
            contentClassName
          )}
        >
          {hasWorkspaceColumns ? (
            <div
              className={cn(
                "grid min-w-0 items-start gap-6 xl:gap-7",
                sidebar && rightRail
                  ? "xl:grid-cols-[280px_minmax(0,1fr)_320px]"
                  : sidebar
                    ? "lg:grid-cols-[280px_minmax(0,1fr)]"
                    : "lg:grid-cols-[minmax(0,1fr)_320px]"
              )}
            >
              {sidebar}
              <section className="min-w-0">{children}</section>
              {rightRail}
            </div>
          ) : (
            <section className="min-w-0">{children}</section>
          )}
        </main>
        {footer}
      </div>
    </div>
  );
}
