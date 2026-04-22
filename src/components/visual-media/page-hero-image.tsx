"use client";

import type { ReactNode } from "react";
import type { VisualMediaRenderablePlacement } from "@/lib/visual-media/types";
import { cn } from "@/lib/utils";
import { VisualPlacement } from "@/components/visual-media/visual-placement";

type PageHeroImageProps = {
  placement: VisualMediaRenderablePlacement | null | undefined;
  className?: string;
  contentClassName?: string;
  priority?: boolean;
  children?: ReactNode;
};

export function PageHeroImage({
  placement,
  className,
  contentClassName,
  priority = true,
  children
}: PageHeroImageProps) {
  return (
    <VisualPlacement
      placement={placement}
      priority={priority}
      sizes="(min-width: 1280px) 40vw, (min-width: 1024px) 44vw, 100vw"
      className={cn(
        "min-h-[18rem] rounded-[2.45rem] border border-white/10 bg-background/18 shadow-panel sm:min-h-[22rem] lg:min-h-[26rem]",
        className
      )}
      imageClassName="scale-[1.02]"
      overlayClassName="bg-[linear-gradient(180deg,rgba(4,10,23,0.08),rgba(4,10,23,0.16)_28%,rgba(4,10,23,0.42)_58%,rgba(4,10,23,0.8)_100%)]"
      contentClassName={cn("flex h-full flex-col justify-end", contentClassName)}
    >
      {children}
    </VisualPlacement>
  );
}
