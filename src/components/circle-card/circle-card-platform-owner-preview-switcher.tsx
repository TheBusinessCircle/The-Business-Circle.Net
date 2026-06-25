"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_LABELS,
  CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_MODES,
  resolveCircleCardPlatformOwnerPreviewMode,
  type CircleCardPlatformOwnerPreviewMode
} from "@/lib/circle-card/platform-owner-control";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "circle-card-platform-owner-preview";
const PARAM_NAME = "ownerPreview";

type CircleCardPlatformOwnerPreviewSwitcherProps = {
  activeMode: CircleCardPlatformOwnerPreviewMode;
};

function previewHref(
  pathname: string,
  searchParams: URLSearchParams,
  mode: CircleCardPlatformOwnerPreviewMode
) {
  const nextParams = new URLSearchParams(searchParams.toString());

  if (mode === "platform-owner") {
    nextParams.delete(PARAM_NAME);
  } else {
    nextParams.set(PARAM_NAME, mode);
  }

  const query = nextParams.toString();
  const hash =
    typeof window === "undefined"
      ? "#platform-owner-control-centre"
      : window.location.hash || "#platform-owner-control-centre";

  return `${pathname}${query ? `?${query}` : ""}${hash}`;
}

export function CircleCardPlatformOwnerPreviewSwitcher({
  activeMode
}: CircleCardPlatformOwnerPreviewSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeLabel = CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_LABELS[activeMode];

  useEffect(() => {
    const urlMode = searchParams.get(PARAM_NAME);
    const storedMode = resolveCircleCardPlatformOwnerPreviewMode(
      window.sessionStorage.getItem(STORAGE_KEY)
    );

    if (urlMode) {
      window.sessionStorage.setItem(STORAGE_KEY, activeMode);
      return;
    }

    if (storedMode !== "platform-owner" && storedMode !== activeMode) {
      router.replace(previewHref(pathname, new URLSearchParams(searchParams.toString()), storedMode), {
        scroll: false
      });
      return;
    }

    window.sessionStorage.setItem(STORAGE_KEY, activeMode);
  }, [activeMode, pathname, router, searchParams]);

  function setPreviewMode(mode: CircleCardPlatformOwnerPreviewMode) {
    window.sessionStorage.setItem(STORAGE_KEY, mode);
    router.replace(previewHref(pathname, new URLSearchParams(searchParams.toString()), mode), {
      scroll: false
    });
  }

  return (
    <div className="rounded-xl border border-gold/24 bg-gold/10 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="premium">Previewing: {activeLabel}</Badge>
          {activeMode !== "platform-owner" ? (
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
              variant={mode === activeMode ? "default" : "outline"}
              size="sm"
              className={cn("min-w-[7.5rem]", mode === activeMode && "pointer-events-none")}
              aria-pressed={mode === activeMode}
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
