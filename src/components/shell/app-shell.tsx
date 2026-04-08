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
            "mx-auto w-full max-w-7xl overflow-x-clip px-4 py-8 sm:px-6 lg:px-8 lg:py-10",
            contentClassName
          )}
        >
          {hasWorkspaceColumns ? (
            <div
              className={cn(
                "grid gap-6 xl:gap-7",
                sidebar && rightRail
                  ? "xl:grid-cols-[260px_minmax(0,1fr)_300px]"
                  : sidebar
                    ? "lg:grid-cols-[252px_minmax(0,1fr)]"
                    : "lg:grid-cols-[minmax(0,1fr)_300px]"
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
