"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const SIZE_BY_PLACEMENT = {
  navbar: 80,
  footer: 68,
  workspace: 40,
  admin: 36,
  hero: 176
} as const;

type BrandMarkPlacement = keyof typeof SIZE_BY_PLACEMENT;

type BrandMarkProps = {
  placement?: BrandMarkPlacement;
  className?: string;
  priority?: boolean;
  shine?: boolean;
};

export function BrandMark({
  placement = "navbar",
  className,
  priority = false,
  shine = false
}: BrandMarkProps) {
  const [imageMissing, setImageMissing] = useState(false);
  const [src, setSrc] = useState("/branding/the-business-circle-logo.webp");
  const size = SIZE_BY_PLACEMENT[placement];

  const shellClassName = cn(
    "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold/45 bg-slate-950 shadow-inner-surface",
    className
  );

  if (imageMissing) {
    return (
      <span className={shellClassName} style={{ width: size, height: size }}>
        <Sparkles size={Math.round(size * 0.4)} className="text-gold" />
      </span>
    );
  }

  return (
    <span className={shellClassName} style={{ width: size, height: size }}>
      {shine ? <span aria-hidden="true" className="brand-mark-shine" /> : null}
      <Image
        src={src}
        alt="The Business Circle logo"
        fill
        sizes={`${size}px`}
        className="object-contain"
        priority={priority}
        onError={() => {
          if (src.endsWith(".webp")) {
            setSrc("/branding/the-business-circle-logo.png");
            return;
          }

          setImageMissing(true);
        }}
      />
    </span>
  );
}
