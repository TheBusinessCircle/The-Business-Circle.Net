"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CIRCLE_CARD_PLATFORM_OWNER_CARD_TYPE_PREVIEW_LABELS,
  CIRCLE_CARD_PLATFORM_OWNER_CARD_TYPE_PREVIEW_MODES,
  CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_LABELS,
  CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_MODES,
  resolveCircleCardPlatformOwnerCardTypePreviewMode,
  resolveCircleCardPlatformOwnerFeatureMatrix,
  resolveCircleCardPlatformOwnerPreviewMode,
  type CircleCardPlatformOwnerCardTypePreviewMode,
  type CircleCardPlatformOwnerFeatureMatrixStatus,
  type CircleCardPlatformOwnerPreviewMode
} from "@/lib/circle-card/platform-owner-control";
import { cn } from "@/lib/utils";

export const CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_STORAGE_KEY =
  "circle-card-platform-owner-preview";
export const CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_EVENT =
  "circle-card-platform-owner-preview-change";
export const CIRCLE_CARD_PLATFORM_OWNER_CARD_TYPE_PREVIEW_STORAGE_KEY =
  "circle-card-platform-owner-card-type-preview";
export const CIRCLE_CARD_PLATFORM_OWNER_CARD_TYPE_PREVIEW_EVENT =
  "circle-card-platform-owner-card-type-preview-change";

type CircleCardPlatformOwnerPreviewSwitcherProps = {
  activeMode: CircleCardPlatformOwnerPreviewMode;
};

type CircleCardPlatformOwnerPreviewBadgeProps = {
  activeMode: CircleCardPlatformOwnerPreviewMode;
};

type CircleCardPlatformOwnerCardTypePreviewSwitcherProps = {
  activeMode: CircleCardPlatformOwnerCardTypePreviewMode;
};

type CircleCardPlatformOwnerCardTypePreviewBadgeProps = {
  activeMode: CircleCardPlatformOwnerCardTypePreviewMode;
};

type CircleCardPlatformOwnerPreviewSurfaceProps = {
  membershipMode: CircleCardPlatformOwnerPreviewMode;
  cardTypeMode: CircleCardPlatformOwnerCardTypePreviewMode;
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

export function readCircleCardPlatformOwnerCardTypePreviewMode(
  fallback: CircleCardPlatformOwnerCardTypePreviewMode
) {
  if (typeof window === "undefined") {
    return fallback;
  }

  return resolveCircleCardPlatformOwnerCardTypePreviewMode(
    window.sessionStorage.getItem(CIRCLE_CARD_PLATFORM_OWNER_CARD_TYPE_PREVIEW_STORAGE_KEY) ??
      fallback
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

export function writeCircleCardPlatformOwnerCardTypePreviewMode(
  mode: CircleCardPlatformOwnerCardTypePreviewMode
) {
  window.sessionStorage.setItem(CIRCLE_CARD_PLATFORM_OWNER_CARD_TYPE_PREVIEW_STORAGE_KEY, mode);
  window.dispatchEvent(
    new CustomEvent(CIRCLE_CARD_PLATFORM_OWNER_CARD_TYPE_PREVIEW_EVENT, {
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

function usePlatformOwnerPreviewModes(
  membershipMode: CircleCardPlatformOwnerPreviewMode,
  cardTypeMode: CircleCardPlatformOwnerCardTypePreviewMode
) {
  const [selectedMembershipMode, setSelectedMembershipMode] = useState(membershipMode);
  const [selectedCardTypeMode, setSelectedCardTypeMode] = useState(cardTypeMode);

  useEffect(() => {
    setSelectedMembershipMode(readCircleCardPlatformOwnerPreviewMode(membershipMode));
    setSelectedCardTypeMode(readCircleCardPlatformOwnerCardTypePreviewMode(cardTypeMode));

    function handleMembershipPreviewChange(event: Event) {
      const mode = (event as CustomEvent<{ mode?: CircleCardPlatformOwnerPreviewMode }>).detail
        ?.mode;

      if (mode) {
        setSelectedMembershipMode(mode);
      }
    }

    function handleCardTypePreviewChange(event: Event) {
      const mode = (event as CustomEvent<{ mode?: CircleCardPlatformOwnerCardTypePreviewMode }>).detail
        ?.mode;

      if (mode) {
        setSelectedCardTypeMode(mode);
      }
    }

    window.addEventListener(CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_EVENT, handleMembershipPreviewChange);
    window.addEventListener(
      CIRCLE_CARD_PLATFORM_OWNER_CARD_TYPE_PREVIEW_EVENT,
      handleCardTypePreviewChange
    );

    return () => {
      window.removeEventListener(
        CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_EVENT,
        handleMembershipPreviewChange
      );
      window.removeEventListener(
        CIRCLE_CARD_PLATFORM_OWNER_CARD_TYPE_PREVIEW_EVENT,
        handleCardTypePreviewChange
      );
    };
  }, [cardTypeMode, membershipMode]);

  return { selectedMembershipMode, selectedCardTypeMode };
}

function featureMatrixStatusClassName(status: CircleCardPlatformOwnerFeatureMatrixStatus) {
  switch (status) {
    case "Available":
      return "border-emerald-500/28 bg-emerald-500/10 text-emerald-200";
    case "Requires Pro":
      return "border-gold/28 bg-gold/10 text-gold";
    case "Requires Teams":
      return "border-silver/22 bg-silver/10 text-silver";
    case "Platform Preview":
      return "border-cyan-400/28 bg-cyan-400/10 text-cyan-100";
    case "Coming Soon":
    default:
      return "border-border/80 bg-background/32 text-muted";
  }
}

const CARD_TYPE_PREVIEW_MODULES: Record<
  CircleCardPlatformOwnerCardTypePreviewMode,
  {
    title: string;
    summary: string;
    modules: Array<{ label: string; detail: string }>;
  }
> = {
  personal: {
    title: "Personal identity preview",
    summary: "Individual profile focus with contact, relationship memory and simple sharing.",
    modules: [
      { label: "Identity", detail: "Name, role, location and personal profile story." },
      { label: "Relationship focus", detail: "QR, wallet saves and follow-up context remain primary." },
      { label: "Featured links", detail: "A lean link set for booking, proof and key contact actions." }
    ]
  },
  business: {
    title: "Business identity preview",
    summary: "Company-led card surface for services, products, proof and lead capture placeholders.",
    modules: [
      { label: "Company profile", detail: "Business name, logo, services and credibility cues." },
      { label: "Products and services", detail: "Preview slots for offers, services and commercial links." },
      { label: "Lead capture", detail: "Prepared placeholder for enquiry and lead routing surfaces." }
    ]
  },
  creator: {
    title: "Creator identity preview",
    summary: "Creator-led card surface for content, social growth, video and featured media placeholders.",
    modules: [
      { label: "Featured content", detail: "Preview slots for posts, media, downloads and community proof." },
      { label: "Video intro", detail: "Prepared placeholder for a short creator introduction." },
      { label: "Social growth", detail: "Channel-first layout cues for creator audiences and updates." }
    ]
  },
  team: {
    title: "Team identity preview",
    summary: "Team-led card surface for staff cards, shared branding and team analytics placeholders.",
    modules: [
      { label: "Staff cards", detail: "Preview slots for team members and company card rollout." },
      { label: "Shared branding", detail: "Company identity, departments and brand consistency cues." },
      { label: "Team analytics", detail: "Prepared placeholder for company-level reporting." }
    ]
  }
};

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

export function CircleCardPlatformOwnerCardTypePreviewSwitcher({
  activeMode
}: CircleCardPlatformOwnerCardTypePreviewSwitcherProps) {
  const [selectedMode, setSelectedMode] = useState(activeMode);
  const activeLabel = CIRCLE_CARD_PLATFORM_OWNER_CARD_TYPE_PREVIEW_LABELS[selectedMode];

  useEffect(() => {
    const initialMode = readCircleCardPlatformOwnerCardTypePreviewMode(activeMode);

    setSelectedMode(initialMode);
    writeCircleCardPlatformOwnerCardTypePreviewMode(initialMode);
  }, [activeMode]);

  function setPreviewMode(mode: CircleCardPlatformOwnerCardTypePreviewMode) {
    setSelectedMode(mode);
    writeCircleCardPlatformOwnerCardTypePreviewMode(mode);
  }

  return (
    <div className="rounded-xl border border-cyan-400/24 bg-cyan-400/10 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Badge variant="outline" className="w-fit border-cyan-400/30 bg-cyan-400/10 text-cyan-100">
          Previewing Card Type: {activeLabel}
        </Badge>
        <div className="flex flex-wrap gap-2">
          {CIRCLE_CARD_PLATFORM_OWNER_CARD_TYPE_PREVIEW_MODES.map((mode) => (
            <Button
              key={mode}
              type="button"
              variant={mode === selectedMode ? "default" : "outline"}
              size="sm"
              className={cn("min-w-[6.75rem]", mode === selectedMode && "pointer-events-none")}
              aria-pressed={mode === selectedMode}
              onClick={() => setPreviewMode(mode)}
            >
              {CIRCLE_CARD_PLATFORM_OWNER_CARD_TYPE_PREVIEW_LABELS[mode]}
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

export function CircleCardPlatformOwnerCardTypePreviewBadge({
  activeMode
}: CircleCardPlatformOwnerCardTypePreviewBadgeProps) {
  const [selectedMode, setSelectedMode] = useState(activeMode);

  useEffect(() => {
    setSelectedMode(readCircleCardPlatformOwnerCardTypePreviewMode(activeMode));

    function handlePreviewChange(event: Event) {
      const mode = (event as CustomEvent<{ mode?: CircleCardPlatformOwnerCardTypePreviewMode }>)
        .detail?.mode;

      if (mode) {
        setSelectedMode(mode);
      }
    }

    window.addEventListener(CIRCLE_CARD_PLATFORM_OWNER_CARD_TYPE_PREVIEW_EVENT, handlePreviewChange);

    return () => {
      window.removeEventListener(
        CIRCLE_CARD_PLATFORM_OWNER_CARD_TYPE_PREVIEW_EVENT,
        handlePreviewChange
      );
    };
  }, [activeMode]);

  return (
    <Badge variant="outline" className="border-cyan-400/30 bg-cyan-400/10 text-cyan-100">
      Previewing Card Type: {CIRCLE_CARD_PLATFORM_OWNER_CARD_TYPE_PREVIEW_LABELS[selectedMode]}
    </Badge>
  );
}

export function CircleCardPlatformOwnerCardTypePreviewModules({
  membershipMode,
  cardTypeMode
}: CircleCardPlatformOwnerPreviewSurfaceProps) {
  const { selectedMembershipMode, selectedCardTypeMode } = usePlatformOwnerPreviewModes(
    membershipMode,
    cardTypeMode
  );
  const preview = CARD_TYPE_PREVIEW_MODULES[selectedCardTypeMode];
  const matrix = resolveCircleCardPlatformOwnerFeatureMatrix({
    membershipMode: selectedMembershipMode,
    cardTypeMode: selectedCardTypeMode
  });
  const activeCardStatus =
    matrix.find((row) => row.id === `${selectedCardTypeMode}-card`)?.status ?? "Available";

  return (
    <div className="rounded-xl border border-cyan-400/18 bg-background/18 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-cyan-100">
            Card Type Preview
          </p>
          <h3 className="mt-1 text-sm font-semibold text-foreground">{preview.title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">{preview.summary}</p>
        </div>
        <Badge
          variant="outline"
          className={cn("w-fit normal-case tracking-normal", featureMatrixStatusClassName(activeCardStatus))}
        >
          {activeCardStatus}
        </Badge>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {preview.modules.map((module) => (
          <div key={module.label} className="rounded-xl border border-silver/12 bg-card/42 p-3">
            <p className="text-sm font-medium text-foreground">{module.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{module.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CircleCardPlatformOwnerFeatureMatrixLite({
  membershipMode,
  cardTypeMode
}: CircleCardPlatformOwnerPreviewSurfaceProps) {
  const { selectedMembershipMode, selectedCardTypeMode } = usePlatformOwnerPreviewModes(
    membershipMode,
    cardTypeMode
  );
  const rows = resolveCircleCardPlatformOwnerFeatureMatrix({
    membershipMode: selectedMembershipMode,
    cardTypeMode: selectedCardTypeMode
  });

  return (
    <div className="rounded-xl border border-silver/14 bg-background/18 p-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Feature Matrix Lite</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_LABELS[selectedMembershipMode]} +{" "}
            {CIRCLE_CARD_PLATFORM_OWNER_CARD_TYPE_PREVIEW_LABELS[selectedCardTypeMode]}
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/42 px-3 py-2"
          >
            <span className="min-w-0 text-sm text-foreground">{row.label}</span>
            <Badge
              variant="outline"
              className={cn("shrink-0 normal-case tracking-normal", featureMatrixStatusClassName(row.status))}
            >
              {row.status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
