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

const UNSAFE_PUBLIC_ALT_TEXT_PATTERN =
  /^(?:test|image:\s*test|image|photo|hero image|banner|graphic|placeholder|business image|business network)$/i;

function fallbackAltTextForPlacement(placement: VisualMediaRenderablePlacement) {
  if (placement.key === "founder.hero" || placement.key === "founder.heroMobile") {
    return "Founder-led Growth Architect workspace for business clarity and strategic review";
  }

  if (placement.key === "founder.working") {
    return "Practical business experience informing founder-led growth strategy";
  }

  if (placement.key === "founder.journey") {
    return "Founder journey and lived business experience behind Growth Architect work";
  }

  if (placement.key === "founder.reviewing") {
    return "Business clarity review identifying direction and growth opportunities";
  }

  if (placement.key === "founder.conversations") {
    return "Business owners in a trusted Growth Architect review conversation";
  }

  if (placement.key === "founder.buildingBcn") {
    return "Private founder-led business circle being shaped through strategy materials";
  }

  if (
    placement.key === "founder.growthArchitecture" ||
    placement.key === "founder.growthArchitectureMobile"
  ) {
    return "Growth Architecture strategy for business owners";
  }

  if (placement.key === "founder.audit" || placement.key === "founder.auditMobile") {
    return "Business clarity audit and website trust review";
  }

  if (placement.key === "founder.proof" || placement.key === "founder.proofMobile") {
    return "Growth Architect testimonials and business owner feedback in a review setting";
  }

  if (
    placement.key === "founder.story" ||
    placement.key === "founder.storyMobile" ||
    placement.key === "founder.finalCta" ||
    placement.key === "founder.finalCtaMobile"
  ) {
    return "Private founder-led growth environment supporting business clarity";
  }

  if (placement.key.startsWith("membership.")) {
    return "The Business Circle Network membership room preview";
  }

  if (placement.key.startsWith("join.")) {
    return "The Business Circle Network membership access preview";
  }

  if (placement.key.startsWith("about.") || placement.key.startsWith("services.")) {
    return "Founder-led business environment inside The Business Circle Network";
  }

  if (
    placement.key.includes("platform") ||
    placement.key.includes("resources") ||
    placement.key.includes("community") ||
    placement.key.includes("intelligence")
  ) {
    return "Premium founder workspace inside The Business Circle Network";
  }

  return "Business owners collaborating inside a private digital environment";
}

export function resolveVisualPlacementAltText(
  placement: VisualMediaRenderablePlacement,
  decorative: boolean
) {
  if (decorative) {
    return "";
  }

  const suppliedAltText = placement.altText?.trim();
  if (suppliedAltText && !UNSAFE_PUBLIC_ALT_TEXT_PATTERN.test(suppliedAltText)) {
    return suppliedAltText;
  }

  return fallbackAltTextForPlacement(placement);
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
  const alt = resolveVisualPlacementAltText(placement, decorative);

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
