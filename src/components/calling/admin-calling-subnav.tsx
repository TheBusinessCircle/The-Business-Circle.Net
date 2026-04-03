"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const CALLING_ADMIN_NAV = [
  { label: "Overview", href: "/admin/calling" },
  { label: "Permissions", href: "/admin/calling/permissions" },
  { label: "Requests", href: "/admin/calling/requests" },
  { label: "Schedules", href: "/admin/calling/schedules" },
  { label: "Audit", href: "/admin/calling/audit" },
  { label: "Config", href: "/admin/calling/config" }
] as const;

export function AdminCallingSubnav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {CALLING_ADMIN_NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-xl border px-3 py-2 text-sm transition-colors",
              active
                ? "border-gold/40 bg-gold/12 text-gold"
                : "border-border/80 bg-background/20 text-muted hover:border-border hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
