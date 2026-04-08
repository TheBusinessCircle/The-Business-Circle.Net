"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/branding/brand-mark";

export function NavbarBrand() {
  const pathname = usePathname();
  const shine = pathname === "/";

  return (
    <Link href="/" className="group flex min-w-0 flex-1 items-center gap-2 sm:gap-3 lg:flex-none">
      <BrandMark
        placement="navbar"
        priority
        shine={shine}
        className="transition-all group-hover:scale-[1.03]"
      />
      <div className="min-w-0">
        <p className="truncate font-display text-xs leading-tight text-foreground min-[420px]:text-sm sm:text-base">
          The Business Circle Network
        </p>
        <p className="hidden text-[10px] tracking-[0.12em] text-muted uppercase min-[420px]:block">
          Founder-Led Growth Ecosystem
        </p>
      </div>
    </Link>
  );
}
