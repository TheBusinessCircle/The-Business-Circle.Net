"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const SIZE_BY_PLACEMENT = {
  navbar: 80,
  footer: 68,
  workspace: 40,
  admin: 36,
  hero: 176
} as const;

type BrandMarkPlacement = keyof typeof SIZE_BY_PLACEMENT;
type BrandMarkBrand = "bcn" | "circle-card";

type BrandMarkProps = {
  placement?: BrandMarkPlacement;
  brand?: BrandMarkBrand;
  className?: string;
  priority?: boolean;
  shine?: boolean;
};

const BRAND_ASSETS: Record<BrandMarkBrand, { src: string; fallbackSrc?: string; alt: string }> = {
  bcn: {
    src: "/branding/the-business-circle-logo.webp",
    fallbackSrc: "/branding/the-business-circle-logo.png",
    alt: "The Business Circle logo"
  },
  "circle-card": {
    src: "/branding/circle-card-logo.png",
    alt: "Circle Card logo"
  }
};

export function BrandMark({
  placement = "navbar",
  brand = "bcn",
  className,
  priority = false,
  shine = false
}: BrandMarkProps) {
  const [imageMissing, setImageMissing] = useState(false);
  const asset = BRAND_ASSETS[brand];
  const [src, setSrc] = useState(asset.src);
  const size = SIZE_BY_PLACEMENT[placement];

  useEffect(() => {
    setImageMissing(false);
    setSrc(asset.src);
  }, [asset.src]);

  const shellClassName = cn(
    "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold/45 bg-slate-950 shadow-inner-surface",
    className
  );
  const dimensionStyle =
    placement === "navbar"
      ? {
          width: "clamp(3rem, 11vw, 5rem)",
          height: "clamp(3rem, 11vw, 5rem)"
        }
      : {
          width: size,
          height: size
        };
  const imageSizes = placement === "navbar" ? "(max-width: 640px) 48px, 80px" : `${size}px`;

  if (imageMissing) {
    return (
      <span className={shellClassName} style={dimensionStyle}>
        <Sparkles size={Math.round(size * 0.4)} className="text-gold" />
      </span>
    );
  }

  return (
    <span className={shellClassName} style={dimensionStyle}>
      {shine ? <span aria-hidden="true" className="brand-mark-shine" /> : null}
      <Image
        src={src}
        alt={asset.alt}
        fill
        sizes={imageSizes}
        className="object-contain"
        priority={priority}
        onError={() => {
          if (asset.fallbackSrc && src !== asset.fallbackSrc) {
            setSrc(asset.fallbackSrc);
            return;
          }

          setImageMissing(true);
        }}
      />
    </span>
  );
}
