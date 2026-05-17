"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  trackPublicCtaAuditClicked,
  trackPublicCtaJoinClicked
} from "@/lib/analytics";
import { cn } from "@/lib/utils";

type PublicCtaSource =
  | "home"
  | "about"
  | "membership"
  | "audit"
  | "insights"
  | "contact"
  | "intent"
  | "navigation"
  | "footer"
  | "unknown";

type TrackedPublicCtaLinkProps = {
  href: string;
  label: string;
  className?: string;
  source?: PublicCtaSource;
  showArrow?: boolean;
};

function resolveCtaKind(href: string) {
  if (href.startsWith("/audit")) {
    return "audit";
  }

  if (
    href.startsWith("/membership") ||
    href.startsWith("/join")
  ) {
    return "join";
  }

  return null;
}

export function TrackedPublicCtaLink({
  href,
  label,
  className,
  source = "unknown",
  showArrow = false
}: TrackedPublicCtaLinkProps) {
  return (
    <Link
      href={href}
      onClick={() => {
        const kind = resolveCtaKind(href);

        if (kind === "audit") {
          trackPublicCtaAuditClicked({ source, href });
        } else if (kind === "join") {
          trackPublicCtaJoinClicked({ source, href });
        }

      }}
      className={className}
    >
      {label}
      {showArrow ? (
        <ArrowRight
          size={16}
          className={cn("ml-2 transition-transform", "group-hover:translate-x-1")}
        />
      ) : null}
    </Link>
  );
}
