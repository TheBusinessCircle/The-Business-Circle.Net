"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type CircleCardDashboardSectionProps = {
  id: string;
  title: string;
  summary: string;
  defaultOpen?: boolean;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  appSection?: string;
};

export function CircleCardDashboardSection({
  id,
  title,
  summary,
  defaultOpen = false,
  badge,
  children,
  className,
  appSection
}: CircleCardDashboardSectionProps) {
  const storageKey = `circle-card-dashboard-section:${id}`;
  const sectionRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === "open" || stored === "closed") {
        setOpen(stored === "open");
      }
    } catch {
      // Local UI memory should never block the dashboard.
    }
  }, [storageKey]);

  useEffect(() => {
    function openForTarget(event: Event) {
      const targetId = (event as CustomEvent<{ targetId?: string }>).detail?.targetId;

      if (!targetId) {
        return;
      }

      const target = document.getElementById(targetId);
      if (targetId === id || (target && sectionRef.current?.contains(target))) {
        setOpen(true);
        try {
          window.localStorage.setItem(storageKey, "open");
        } catch {
          // Ignore localStorage failures.
        }
      }
    }

    window.addEventListener("circle-card-open-section", openForTarget);
    return () => window.removeEventListener("circle-card-open-section", openForTarget);
  }, [id, storageKey]);

  function toggleOpen() {
    setOpen((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(storageKey, next ? "open" : "closed");
      } catch {
        // Ignore localStorage failures.
      }
      return next;
    });
  }

  return (
    <section
      ref={sectionRef}
      id={id}
      data-circle-card-section={appSection}
      className={cn(
        "scroll-mt-24 overflow-hidden rounded-2xl border border-silver/16 bg-card/62 shadow-panel-soft",
        className
      )}
    >
      <button
        type="button"
        className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-background/18 sm:px-5"
        aria-expanded={open}
        aria-controls={`${id}-content`}
        onClick={toggleOpen}
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-display text-xl font-semibold text-foreground">{title}</span>
            {badge}
          </span>
          <span className="mt-1 block text-sm leading-relaxed text-muted">{summary}</span>
        </span>
        <span
          className={cn(
            "mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold/18 bg-gold/10 text-gold transition-transform",
            open ? "rotate-180" : ""
          )}
        >
          <ChevronDown size={16} />
        </span>
      </button>
      <div id={`${id}-content`} hidden={!open} className="border-t border-silver/12 px-4 py-5 sm:px-5">
        {children}
      </div>
    </section>
  );
}
