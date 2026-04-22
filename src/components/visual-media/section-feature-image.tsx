"use client";

import type { ReactNode } from "react";
import type { VisualMediaRenderablePlacement } from "@/lib/visual-media/types";
import { cn } from "@/lib/utils";
import { VisualPlacement } from "@/components/visual-media/visual-placement";

type SectionFeatureImageProps = {
  placement: VisualMediaRenderablePlacement | null | undefined;
  className?: string;
  imageClassName?: string;
  aspectClassName?: string;
  sizes?: string;
  children?: ReactNode;
};

export function SectionFeatureImage({
  placement,
  className,
  imageClassName,
  aspectClassName = "aspect-[4/5] sm:aspect-[16/11] lg:aspect-[4/5]",
  sizes = "(min-width: 1280px) 28vw, (min-width: 1024px) 34vw, 100vw",
  children
}: SectionFeatureImageProps) {
  return (
    <VisualPlacement
      placement={placement}
      sizes={sizes}
      className={cn(
        "overflow-hidden rounded-[2rem] border border-white/10 bg-card/48 shadow-panel-soft",
        aspectClassName,
        className
      )}
      imageClassName={cn("scale-[1.01]", imageClassName)}
      overlayClassName="bg-[linear-gradient(180deg,rgba(4,10,23,0.02),rgba(4,10,23,0.14)_48%,rgba(4,10,23,0.42)_100%)]"
      contentClassName="flex h-full items-end"
    >
      {children}
    </VisualPlacement>
  );
}
