"use client";

import { useEffect, useRef, useState, type ReactNode, type SyntheticEvent } from "react";
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

function srcMatchesDisplaySrc(candidate: string, displaySrc: string) {
  if (candidate === displaySrc) {
    return true;
  }

  if (displaySrc.startsWith("/") && !displaySrc.startsWith("//")) {
    try {
      const url = new URL(candidate);
      return `${url.pathname}${url.search}${url.hash}` === displaySrc;
    } catch {
      return false;
    }
  }

  return false;
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
  const imageRef = useRef<HTMLImageElement>(null);
  const preferredSrc = resolveSrc(src, fallbackSrc);
  const [failedPreferredSrc, setFailedPreferredSrc] = useState<string | null>(null);
  const [failedFallbackSrc, setFailedFallbackSrc] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const preferredFailed = Boolean(preferredSrc && failedPreferredSrc === preferredSrc);
  const fallbackAvailable = Boolean(
    fallbackSrc && fallbackSrc !== preferredSrc && failedFallbackSrc !== fallbackSrc
  );
  const displaySrc = preferredFailed ? (fallbackAvailable ? fallbackSrc ?? "" : "") : preferredSrc;
  const imageLoaded = Boolean(displaySrc && loadedSrc === displaySrc);
  const usingFallback = Boolean(fallbackSrc && displaySrc === fallbackSrc && preferredFailed);
  const x = normalizePosition(usingFallback ? fallbackPositionX : positionX);
  const y = normalizePosition(usingFallback ? fallbackPositionY : positionY);
  const zoom = normalizeScale(usingFallback ? fallbackScale : scale);

  useEffect(() => {
    if (failedPreferredSrc && failedPreferredSrc !== preferredSrc) {
      setFailedPreferredSrc(null);
    }

    if (failedFallbackSrc && failedFallbackSrc !== fallbackSrc) {
      setFailedFallbackSrc(null);
    }

    if (loadedSrc && loadedSrc !== displaySrc) {
      setLoadedSrc(null);
    }

    const image = imageRef.current;

    if (displaySrc && image?.complete && image.naturalWidth > 0) {
      setLoadedSrc(displaySrc);
    }
  }, [displaySrc, failedFallbackSrc, failedPreferredSrc, fallbackSrc, loadedSrc, preferredSrc]);

  function handleImageLoad(event: SyntheticEvent<HTMLImageElement>) {
    const loaded =
      event.currentTarget.currentSrc ||
      event.currentTarget.getAttribute("src") ||
      event.currentTarget.src ||
      displaySrc;

    if (displaySrc && srcMatchesDisplaySrc(loaded, displaySrc)) {
      setLoadedSrc(displaySrc);
    }
  }

  function handleImageError(event: SyntheticEvent<HTMLImageElement>) {
    const failedSrc =
      event.currentTarget.currentSrc ||
      event.currentTarget.getAttribute("src") ||
      event.currentTarget.src ||
      displaySrc;

    if (!displaySrc || !srcMatchesDisplaySrc(failedSrc, displaySrc)) {
      return;
    }

    if (usingFallback) {
      setFailedFallbackSrc(displaySrc);
      return;
    }

    setFailedPreferredSrc(displaySrc);
  }

  if (!displaySrc) {
    return <>{children}</>;
  }

  return (
    <img
      ref={imageRef}
      src={displaySrc}
      alt={alt}
      className={cn(
        "h-full w-full object-cover transition-opacity duration-200",
        imageLoaded ? "opacity-100" : "opacity-0",
        className,
        imageClassName
      )}
      style={{
        objectPosition: `${x}% ${y}%`,
        transform: `scale(${zoom})`,
        transformOrigin: `${x}% ${y}%`
      }}
      onLoad={handleImageLoad}
      onError={handleImageError}
    />
  );
}
