"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/branding/brand-mark";

export function NavbarBrand() {
  const pathname = usePathname();
  const shine = pathname === "/";

  return (
    <Link
      href="/"
      className="group flex min-w-0 max-w-[calc(100%-2.5rem)] flex-1 items-center gap-1.5 overflow-hidden pr-2 sm:max-w-none sm:gap-3 lg:max-w-[18rem] lg:flex-none lg:pr-0 xl:max-w-[19rem]"
    >
      <BrandMark
        placement="navbar"
        priority
        shine={shine}
        className="transition-all group-hover:scale-[1.03]"
      />
      <div className="min-w-0 max-w-full">
        <p className="truncate font-display text-[10px] leading-tight text-foreground min-[360px]:text-[11px] sm:text-base">
          <span className="sm:hidden">The Business Circle</span>
          <span className="hidden sm:inline">The Business Circle Network</span>
        </p>
        <p className="hidden text-[9px] tracking-[0.12em] text-muted uppercase sm:block">
          Private Founder-Led Environment
        </p>
      </div>
    </Link>
  );
}
