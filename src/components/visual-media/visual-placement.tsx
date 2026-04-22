"use client";

import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import type { VisualMediaOverlayStyle } from "@prisma/client";
import type { VisualMediaRenderablePlacement } from "@/lib/visual-media/types";
import { cn } from "@/lib/utils";

const OVERLAY_CLASSNAMES: Record<VisualMediaOverlayStyle, string> = {
  NONE: "",
  SOFT_DARK:
    "bg-[linear-gradient(180deg,rgba(4,10,23,0.06),rgba(4,10,23,0.12)_45%,rgba(4,10,23,0.5)_100%)]",
  DARK:
    "bg-[linear-gradient(180deg,rgba(4,10,23,0.18),rgba(4,10,23,0.3)_44%,rgba(4,10,23,0.72)_100%)]",
  CINEMATIC:
    "bg-[linear-gradient(180deg,rgba(4,10,23,0.08),rgba(4,10,23,0.18)_20%,rgba(4,10,23,0.42)_55%,rgba(4,10,23,0.82)_100%)]"
};

function resolveObjectPosition(placement: VisualMediaRenderablePlacement) {
  if (placement.objectPosition?.trim()) {
    return placement.objectPosition.trim();
  }

  if (
    typeof placement.focalPointX === "number" &&
    typeof placement.focalPointY === "number"
  ) {
    return `${placement.focalPointX}% ${placement.focalPointY}%`;
  }

  return "center center";
}

function resolveAltText(placement: VisualMediaRenderablePlacement, decorative: boolean) {
  if (decorative) {
    return "";
  }

  return placement.altText?.trim() || placement.label;
}

function overlayClassNameForPlacement(placement: VisualMediaRenderablePlacement) {
  const overlayStyle = placement.overlayStyle ?? "SOFT_DARK";
  return OVERLAY_CLASSNAMES[overlayStyle];
}

export function hasRenderableVisualPlacement(
  placement: VisualMediaRenderablePlacement | null | undefined
): placement is VisualMediaRenderablePlacement {
  return Boolean(placement?.isActive && placement.imageUrl);
}

type ResponsivePlacementImageProps = {
  placement: VisualMediaRenderablePlacement;
  alt: string;
  priority?: boolean;
  sizes: string;
  imageClassName?: string;
};

function ResponsivePlacementImage({
  placement,
  alt,
  priority,
  sizes,
  imageClassName
}: ResponsivePlacementImageProps) {
  const objectPosition = resolveObjectPosition(placement);
  const imageStyle: CSSProperties = {
    objectPosition
  };

  if (placement.supportsMobile && placement.mobileImageUrl) {
    return (
      <>
        <Image
          src={placement.mobileImageUrl}
          alt={alt}
          fill
          priority={priority}
          sizes="100vw"
          className={cn("object-cover md:hidden", imageClassName)}
          style={imageStyle}
        />
        <Image
          src={placement.imageUrl!}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className={cn("hidden object-cover md:block", imageClassName)}
          style={imageStyle}
        />
      </>
    );
  }

  return (
    <Image
      src={placement.imageUrl!}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      className={cn("object-cover", imageClassName)}
      style={imageStyle}
    />
  );
}

export type VisualPlacementProps = {
  placement: VisualMediaRenderablePlacement | null | undefined;
  className?: string;
  imageClassName?: string;
  overlayClassName?: string;
  contentClassName?: string;
  sizes: string;
  priority?: boolean;
  decorative?: boolean;
  children?: ReactNode;
};

export function VisualPlacement({
  placement,
  className,
  imageClassName,
  overlayClassName,
  contentClassName,
  sizes,
  priority,
  decorative = false,
  children
}: VisualPlacementProps) {
  if (!hasRenderableVisualPlacement(placement)) {
    return null;
  }

  const overlayClassNameToUse =
    typeof overlayClassName === "string"
      ? overlayClassName
      : overlayClassNameForPlacement(placement);
  const alt = resolveAltText(placement, decorative);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <ResponsivePlacementImage
        placement={placement}
        alt={alt}
        priority={priority}
        sizes={sizes}
        imageClassName={imageClassName}
      />
      {overlayClassNameToUse ? (
        <div className={cn("pointer-events-none absolute inset-0 z-[1]", overlayClassNameToUse)} />
      ) : null}
      {children ? (
        <div className={cn("relative z-[2]", contentClassName)}>{children}</div>
      ) : null}
    </div>
  );
}
