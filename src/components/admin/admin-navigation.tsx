"use client";

import Link from "next/link";
import {
  Activity,
  Briefcase,
  CalendarDays,
  FileText,
  LayoutGrid,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Settings,
  UsersRound,
  Video
} from "lucide-react";
import { usePathname } from "next/navigation";
import type { NavigationItem } from "@/types";
import { cn } from "@/lib/utils";

type AdminNavigationProps = {
  items: NavigationItem[];
  orientation?: "vertical" | "horizontal";
};

function iconForHref(href: string) {
  if (href === "/admin") {
    return LayoutGrid;
  }
  if (href.startsWith("/admin/founding")) {
    return Sparkles;
  }
  if (href.startsWith("/admin/content") || href.startsWith("/admin/site-content")) {
    return FileText;
  }
  if (href.startsWith("/admin/resources")) {
    return Settings;
  }
  if (href.startsWith("/admin/channels")) {
    return MessageSquare;
  }
  if (href.startsWith("/admin/community")) {
    return MessageSquare;
  }
  if (href.startsWith("/admin/events")) {
    return CalendarDays;
  }
  if (href.startsWith("/admin/calling")) {
    return Video;
  }
  if (href.startsWith("/admin/revenue")) {
    return Briefcase;
  }
  if (href.startsWith("/admin/security")) {
    return ShieldCheck;
  }
  if (href.startsWith("/admin/system-health")) {
    return Activity;
  }
  if (href.startsWith("/admin/members")) {
    return UsersRound;
  }
  if (href.startsWith("/admin/founder-services")) {
    return Briefcase;
  }

  return LayoutGrid;
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNavigation({ items, orientation = "vertical" }: AdminNavigationProps) {
  const pathname = usePathname();
  const isHorizontal = orientation === "horizontal";

  return (
    <nav className={cn(isHorizontal ? "flex gap-2 overflow-x-auto pb-1" : "space-y-1.5")}>
      {items.map((item) => {
        const Icon = iconForHref(item.href);
        const active = isActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all duration-200",
              isHorizontal ? "shrink-0" : "w-full",
              active
                ? "border-gold/45 bg-gold/14 text-gold shadow-inner-surface"
                : "border-border/70 bg-background/20 text-muted hover:border-border hover:bg-background/40 hover:text-foreground"
            )}
          >
            <Icon size={16} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
