"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type CircleCardFramedImageProps = {
  src?: string | null;
  fallbackSrc?: string;
  alt?: string;
  positionX?: number | null;
  positionY?: number | null;
  scale?: number | null;
  fallbackPositionX?: number | null;
  fallbackPositionY?: number | null;
  fallbackScale?: number | null;
  className?: string;
  imageClassName?: string;
  children?: ReactNode;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizePosition(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? clamp(value, 0, 100) : 50;
}

function normalizeScale(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? clamp(value, 1, 3) : 1;
}

function resolveSrc(src?: string | null, fallbackSrc?: string) {
  const trimmed = src?.trim();
  return trimmed || fallbackSrc || "";
}

export function CircleCardFramedImage({
  src,
  fallbackSrc,
  alt = "",
  positionX,
  positionY,
  scale,
  fallbackPositionX,
  fallbackPositionY,
  fallbackScale,
  className,
  imageClassName,
  children
}: CircleCardFramedImageProps) {
  const [displaySrc, setDisplaySrc] = useState(() => resolveSrc(src, fallbackSrc));
  const usingFallback = Boolean(fallbackSrc && displaySrc === fallbackSrc);
  const x = normalizePosition(usingFallback ? fallbackPositionX : positionX);
  const y = normalizePosition(usingFallback ? fallbackPositionY : positionY);
  const zoom = normalizeScale(usingFallback ? fallbackScale : scale);

  useEffect(() => {
    setDisplaySrc(resolveSrc(src, fallbackSrc));
  }, [fallbackSrc, src]);

  function handleImageError() {
    if (fallbackSrc && displaySrc !== fallbackSrc) {
      setDisplaySrc(fallbackSrc);
      return;
    }

    setDisplaySrc("");
  }

  if (!displaySrc) {
    return <>{children}</>;
  }

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={cn("h-full w-full object-cover", className, imageClassName)}
      style={{
        objectPosition: `${x}% ${y}%`,
        transform: `scale(${zoom})`,
        transformOrigin: `${x}% ${y}%`
      }}
      onError={handleImageError}
    />
  );
}
