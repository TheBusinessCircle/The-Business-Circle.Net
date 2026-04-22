"use client";

import type { ReactNode } from "react";
import type { VisualMediaRenderablePlacement } from "@/lib/visual-media/types";
import { cn } from "@/lib/utils";
import { VisualPlacement } from "@/components/visual-media/visual-placement";

type PageHeroImageTone = "cinematic" | "immersive" | "anchored";

const PAGE_HERO_TREATMENTS: Record<
  PageHeroImageTone,
  {
    containerClassName: string;
    imageClassName: string;
    overlayClassName: string;
  }
> = {
  cinematic: {
    containerClassName:
      "border-white/10 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.1),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] shadow-[0_28px_80px_rgba(2,6,23,0.24)]",
    imageClassName: "scale-[1.03] saturate-[0.94] contrast-[1.04]",
    overlayClassName:
      "bg-[linear-gradient(180deg,rgba(3,8,20,0.06),rgba(3,8,20,0.16)_18%,rgba(3,8,20,0.38)_52%,rgba(3,8,20,0.78)_100%)]"
  },
  immersive: {
    containerClassName:
      "border-gold/16 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.12),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] shadow-[0_30px_84px_rgba(2,6,23,0.28)]",
    imageClassName: "scale-[1.05] saturate-[0.95] contrast-[1.05]",
    overlayClassName:
      "bg-[linear-gradient(180deg,rgba(3,8,20,0.08),rgba(3,8,20,0.2)_16%,rgba(3,8,20,0.44)_48%,rgba(3,8,20,0.82)_100%)]"
  },
  anchored: {
    containerClassName:
      "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] shadow-[0_24px_72px_rgba(2,6,23,0.22)]",
    imageClassName: "scale-[1.02] saturate-[0.92] contrast-[1.02]",
    overlayClassName:
      "bg-[linear-gradient(180deg,rgba(3,8,20,0.08),rgba(3,8,20,0.14)_24%,rgba(3,8,20,0.34)_58%,rgba(3,8,20,0.72)_100%)]"
  }
};

type PageHeroImageProps = {
  placement: VisualMediaRenderablePlacement | null | undefined;
  className?: string;
  contentClassName?: string;
  priority?: boolean;
  tone?: PageHeroImageTone;
  children?: ReactNode;
};

export function PageHeroImage({
  placement,
  className,
  contentClassName,
  priority = true,
  tone = "cinematic",
  children
}: PageHeroImageProps) {
  const treatment = PAGE_HERO_TREATMENTS[tone];

  return (
    <VisualPlacement
      placement={placement}
      priority={priority}
      sizes="(min-width: 1280px) 40vw, (min-width: 1024px) 44vw, 100vw"
      className={cn(
        "min-h-[16rem] rounded-[2.45rem] border bg-background/18 shadow-panel sm:min-h-[21rem] lg:min-h-[26rem]",
        "before:pointer-events-none before:absolute before:inset-[1px] before:z-[1] before:rounded-[2.35rem] before:border before:border-white/8 before:content-['']",
        "after:pointer-events-none after:absolute after:inset-x-[12%] after:bottom-[-12%] after:z-[1] after:h-24 after:rounded-full after:bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.16),transparent_68%)] after:blur-3xl after:content-['']",
        treatment.containerClassName,
        className
      )}
      imageClassName={treatment.imageClassName}
      overlayClassName={treatment.overlayClassName}
      contentClassName={cn("flex h-full flex-col justify-end", contentClassName)}
    >
      {children}
    </VisualPlacement>
  );
}
