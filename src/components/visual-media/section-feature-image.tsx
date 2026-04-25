"use client";

import type { ReactNode } from "react";
import type { VisualMediaRenderablePlacement } from "@/lib/visual-media/types";
import { cn } from "@/lib/utils";
import { VisualPlacement } from "@/components/visual-media/visual-placement";

type SectionFeatureImageTone = "human" | "story" | "platform" | "founders" | "editorial";

const SECTION_FEATURE_TREATMENTS: Record<
  SectionFeatureImageTone,
  {
    aspectClassName: string;
    containerClassName: string;
    imageClassName: string;
    overlayClassName: string;
  }
> = {
  human: {
    aspectClassName: "aspect-[16/11] sm:aspect-[16/10] lg:aspect-[4/5]",
    containerClassName:
      "border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] shadow-[0_24px_60px_rgba(2,6,23,0.18)]",
    imageClassName: "scale-[1.03] saturate-[0.94] contrast-[1.03]",
    overlayClassName:
      "bg-[linear-gradient(180deg,rgba(3,8,20,0.02),rgba(3,8,20,0.08)_32%,rgba(3,8,20,0.26)_68%,rgba(3,8,20,0.42)_100%)]"
  },
  story: {
    aspectClassName: "aspect-[16/11] sm:aspect-[16/10] lg:aspect-[4/5]",
    containerClassName:
      "border-gold/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] shadow-[0_22px_56px_rgba(2,6,23,0.16)]",
    imageClassName: "scale-[1.02] saturate-[0.92] contrast-[1.01]",
    overlayClassName:
      "bg-[linear-gradient(180deg,rgba(14,10,6,0.03),rgba(14,10,6,0.08)_34%,rgba(3,8,20,0.22)_66%,rgba(3,8,20,0.38)_100%)]"
  },
  platform: {
    aspectClassName: "aspect-[16/10] sm:aspect-[16/10] lg:aspect-[16/11]",
    containerClassName:
      "border-silver/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] shadow-[0_18px_44px_rgba(2,6,23,0.14)]",
    imageClassName: "scale-[1.0] saturate-[0.98] contrast-[1.05]",
    overlayClassName:
      "bg-[linear-gradient(180deg,rgba(3,8,20,0.01),rgba(3,8,20,0.05)_38%,rgba(3,8,20,0.16)_78%,rgba(3,8,20,0.24)_100%)]"
  },
  founders: {
    aspectClassName: "aspect-[16/11] sm:aspect-[16/10] lg:aspect-[4/5]",
    containerClassName:
      "border-gold/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] shadow-[0_22px_60px_rgba(2,6,23,0.18)]",
    imageClassName: "scale-[1.02] saturate-[0.93] contrast-[1.04]",
    overlayClassName:
      "bg-[linear-gradient(180deg,rgba(14,10,6,0.02),rgba(14,10,6,0.08)_28%,rgba(3,8,20,0.24)_62%,rgba(3,8,20,0.42)_100%)]"
  },
  editorial: {
    aspectClassName: "aspect-[16/10] sm:aspect-[16/10] lg:aspect-[16/11]",
    containerClassName:
      "border-silver/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] shadow-[0_18px_44px_rgba(2,6,23,0.14)]",
    imageClassName: "scale-[1.0] saturate-[0.96] contrast-[1.05]",
    overlayClassName:
      "bg-[linear-gradient(180deg,rgba(3,8,20,0.02),rgba(3,8,20,0.06)_44%,rgba(3,8,20,0.18)_82%,rgba(3,8,20,0.28)_100%)]"
  }
};

type SectionFeatureImageProps = {
  placement: VisualMediaRenderablePlacement | null | undefined;
  className?: string;
  imageClassName?: string;
  aspectClassName?: string;
  sizes?: string;
  tone?: SectionFeatureImageTone;
  children?: ReactNode;
};

export function SectionFeatureImage({
  placement,
  className,
  imageClassName,
  aspectClassName,
  sizes = "(min-width: 1280px) 28vw, (min-width: 1024px) 34vw, 100vw",
  tone = "human",
  children
}: SectionFeatureImageProps) {
  const treatment = SECTION_FEATURE_TREATMENTS[tone];

  return (
    <VisualPlacement
      placement={placement}
      sizes={sizes}
      className={cn(
        "feature-visual-shell overflow-hidden rounded-[2rem] border bg-card/48 shadow-panel-soft",
        "before:pointer-events-none before:absolute before:inset-[1px] before:z-[1] before:rounded-[1.9rem] before:border before:border-border/60 before:content-['']",
        treatment.containerClassName,
        aspectClassName ?? treatment.aspectClassName,
        className
      )}
      imageClassName={cn(treatment.imageClassName, imageClassName)}
      overlayClassName={treatment.overlayClassName}
      contentClassName="flex h-full items-end"
    >
      {children}
    </VisualPlacement>
  );
}
