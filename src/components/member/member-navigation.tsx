"use client";

import Link from "next/link";
import {
  CalendarDays,
  Compass,
  Crown,
  GitBranch,
  LayoutGrid,
  MessageSquare,
  Sparkles,
  Trophy,
  Search,
  UserCircle2,
  Video
} from "lucide-react";
import { usePathname } from "next/navigation";
import type { NavigationItem } from "@/types";
import { cn } from "@/lib/utils";

type MemberNavigationProps = {
  items: NavigationItem[];
  orientation?: "vertical" | "horizontal";
};

function iconForHref(href: string) {
  if (href.startsWith("/dashboard/resources")) {
    return Search;
  }
  if (href.startsWith("/dashboard")) {
    return LayoutGrid;
  }
  if (href.startsWith("/blueprint")) {
    return GitBranch;
  }
  if (href.startsWith("/resources")) {
    return Search;
  }
  if (href.startsWith("/directory")) {
    return UserCircle2;
  }
  if (href.startsWith("/messages")) {
    return MessageSquare;
  }
  if (href.startsWith("/wins")) {
    return Trophy;
  }
  if (href.startsWith("/calls")) {
    return Video;
  }
  if (href.startsWith("/member/bcn-updates")) {
    return Sparkles;
  }
  if (href.startsWith("/member/growth-architect")) {
    return Compass;
  }
  if (href.startsWith("/community")) {
    return MessageSquare;
  }
  if (href.startsWith("/events")) {
    return CalendarDays;
  }
  if (href.startsWith("/inner-circle")) {
    return Crown;
  }
  if (href.startsWith("/founder")) {
    return Compass;
  }
  return LayoutGrid;
}

function isItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MemberNavigation({ items, orientation = "vertical" }: MemberNavigationProps) {
  const pathname = usePathname();
  const horizontal = orientation === "horizontal";

  return (
    <nav className={cn(horizontal ? "flex gap-2 overflow-x-auto pb-1" : "space-y-1.5")}>
      {items.map((item) => {
        const Icon = iconForHref(item.href);
        const active = isItemActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            data-active={active ? "true" : "false"}
            className={cn(
              "member-nav-item inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all duration-200",
              horizontal ? "shrink-0" : "w-full",
              active
                ? "border-primary/45 bg-primary/14 text-primary shadow-inner-surface"
                : "border-border/70 bg-background/20 text-muted hover:border-border hover:bg-background/40 hover:text-foreground"
            )}
          >
            <Icon size={16} />
            <span>{item.label}</span>
            {item.badgeCount ? (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] text-primary">
                {item.badgeCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
