"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_LABELS,
  CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_MODES,
  resolveCircleCardPlatformOwnerPreviewMode,
  type CircleCardPlatformOwnerPreviewMode
} from "@/lib/circle-card/platform-owner-control";
import { cn } from "@/lib/utils";

export const CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_STORAGE_KEY =
  "circle-card-platform-owner-preview";
export const CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_EVENT =
  "circle-card-platform-owner-preview-change";

type CircleCardPlatformOwnerPreviewSwitcherProps = {
  activeMode: CircleCardPlatformOwnerPreviewMode;
};

type CircleCardPlatformOwnerPreviewBadgeProps = {
  activeMode: CircleCardPlatformOwnerPreviewMode;
};

export function readCircleCardPlatformOwnerPreviewMode(
  fallback: CircleCardPlatformOwnerPreviewMode
) {
  if (typeof window === "undefined") {
    return fallback;
  }

  return resolveCircleCardPlatformOwnerPreviewMode(
    window.sessionStorage.getItem(CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_STORAGE_KEY) ?? fallback
  );
}

export function writeCircleCardPlatformOwnerPreviewMode(
  mode: CircleCardPlatformOwnerPreviewMode
) {
  window.sessionStorage.setItem(CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_STORAGE_KEY, mode);
  window.dispatchEvent(
    new CustomEvent(CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_EVENT, {
      detail: { mode }
    })
  );
}

function removeOwnerPreviewUrlParam() {
  const url = new URL(window.location.href);

  if (!url.searchParams.has("ownerPreview")) {
    return;
  }

  url.searchParams.delete("ownerPreview");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export function CircleCardPlatformOwnerPreviewSwitcher({
  activeMode
}: CircleCardPlatformOwnerPreviewSwitcherProps) {
  const [selectedMode, setSelectedMode] = useState(activeMode);
  const activeLabel = CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_LABELS[selectedMode];

  useEffect(() => {
    const urlHasPreviewMode = new URLSearchParams(window.location.search).has("ownerPreview");
    const initialMode = urlHasPreviewMode
      ? activeMode
      : readCircleCardPlatformOwnerPreviewMode(activeMode);

    setSelectedMode(initialMode);
    writeCircleCardPlatformOwnerPreviewMode(initialMode);
    removeOwnerPreviewUrlParam();
  }, [activeMode]);

  function setPreviewMode(mode: CircleCardPlatformOwnerPreviewMode) {
    setSelectedMode(mode);
    writeCircleCardPlatformOwnerPreviewMode(mode);
  }

  return (
    <div className="rounded-xl border border-gold/24 bg-gold/10 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="premium">Previewing: {activeLabel}</Badge>
          {selectedMode !== "platform-owner" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setPreviewMode("platform-owner")}
            >
              <RotateCcw size={14} />
              Return to Platform Owner
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_MODES.map((mode) => (
            <Button
              key={mode}
              type="button"
              variant={mode === selectedMode ? "default" : "outline"}
              size="sm"
              className={cn("min-w-[7.5rem]", mode === selectedMode && "pointer-events-none")}
              aria-pressed={mode === selectedMode}
              onClick={() => setPreviewMode(mode)}
            >
              {CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_LABELS[mode]}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CircleCardPlatformOwnerPreviewBadge({
  activeMode
}: CircleCardPlatformOwnerPreviewBadgeProps) {
  const [selectedMode, setSelectedMode] = useState(activeMode);

  useEffect(() => {
    setSelectedMode(readCircleCardPlatformOwnerPreviewMode(activeMode));

    function handlePreviewChange(event: Event) {
      const mode = (event as CustomEvent<{ mode?: CircleCardPlatformOwnerPreviewMode }>).detail
        ?.mode;

      if (mode) {
        setSelectedMode(mode);
      }
    }

    window.addEventListener(CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_EVENT, handlePreviewChange);

    return () => {
      window.removeEventListener(CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_EVENT, handlePreviewChange);
    };
  }, [activeMode]);

  return (
    <Badge variant="premium">
      Previewing: {CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_LABELS[selectedMode]}
    </Badge>
  );
}
