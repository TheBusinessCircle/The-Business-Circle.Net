"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/branding/brand-mark";

export function NavbarBrand() {
  const pathname = usePathname();
  const shine = pathname === "/";

  return (
    <Link href="/" className="group flex items-center gap-3">
      <BrandMark
        placement="navbar"
        priority
        shine={shine}
        className="transition-all group-hover:scale-[1.03]"
      />
      <div>
        <p className="font-display text-sm text-foreground sm:text-base">
          The Business Circle Network
        </p>
        <p className="text-[10px] tracking-[0.12em] text-muted uppercase">
          Founder-Led Growth Ecosystem
        </p>
      </div>
    </Link>
  );
}
