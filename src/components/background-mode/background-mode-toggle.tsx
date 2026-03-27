"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBackgroundMode } from "@/components/background-mode/background-mode-provider";

type BackgroundModeToggleProps = {
  className?: string;
  fullWidth?: boolean;
  labelClassName?: string;
  showLabel?: boolean;
};

export function BackgroundModeToggle({
  className,
  fullWidth = false,
  labelClassName,
  showLabel = true
}: BackgroundModeToggleProps) {
  const { mode, toggleMode } = useBackgroundMode();
  const isLightMode = mode === "light";
  const Icon = isLightMode ? SunMedium : MoonStar;
  const currentLabel = isLightMode ? "Light" : "Dark";
  const actionLabel = isLightMode ? "Switch to dark background" : "Switch to light background";

  return (
    <Button
      type="button"
      variant="outline"
      size={showLabel || fullWidth ? "sm" : "icon"}
      aria-label={actionLabel}
      aria-pressed={isLightMode}
      className={cn(
        "shrink-0 border-border/80 bg-background/32 text-foreground hover:border-gold/35 hover:bg-background/50",
        fullWidth ? "w-full justify-center" : undefined,
        showLabel || fullWidth ? "gap-2" : undefined,
        className
      )}
      onClick={toggleMode}
      title={actionLabel}
    >
      <Icon size={showLabel || fullWidth ? 14 : 16} />
      {showLabel ? <span className={labelClassName}>{currentLabel}</span> : null}
    </Button>
  );
}
