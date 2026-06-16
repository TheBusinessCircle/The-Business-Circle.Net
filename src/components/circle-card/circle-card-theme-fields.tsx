"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { Palette, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CIRCLE_CARD_DEFAULT_THEME_COLORS,
  buildCircleCardThemeStyle,
  resolveCircleCardTheme
} from "@/lib/circle-card/theme";
import { cn } from "@/lib/utils";

type CircleCardThemeFieldsProps = {
  themePrimaryColor?: string | null;
  themeAccentColor?: string | null;
  themeButtonColor?: string | null;
  fullName?: string | null;
  tagline?: string | null;
  profileLayout?: string | null;
  compact?: boolean;
};

function normalizeColorInput(value: string | null | undefined, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(value?.trim() ?? "") ? value!.trim().toUpperCase() : fallback;
}

export function CircleCardThemeFields({
  themePrimaryColor,
  themeAccentColor,
  themeButtonColor,
  fullName,
  tagline,
  profileLayout,
  compact = false
}: CircleCardThemeFieldsProps) {
  const initialTheme = resolveCircleCardTheme({
    themePrimaryColor,
    themeAccentColor,
    themeButtonColor
  });
  const [primaryColor, setPrimaryColor] = useState(initialTheme.primaryColor);
  const [accentColor, setAccentColor] = useState(initialTheme.accentColor);
  const [buttonColor, setButtonColor] = useState(initialTheme.buttonColor);

  const resolvedTheme = useMemo(
    () =>
      resolveCircleCardTheme({
        themePrimaryColor: primaryColor,
        themeAccentColor: accentColor,
        themeButtonColor: buttonColor
      }),
    [accentColor, buttonColor, primaryColor]
  );
  const previewStyle = buildCircleCardThemeStyle(resolvedTheme) as CSSProperties;
  const previewName = fullName?.trim() || "Your name";
  const previewTagline = tagline?.trim() || "A Circle Card that feels unmistakably yours.";
  const layoutLabel = profileLayout ? `${profileLayout.toLowerCase()} layout` : "profile layout";

  function resetPreviewToDefault() {
    setPrimaryColor(CIRCLE_CARD_DEFAULT_THEME_COLORS.primaryColor);
    setAccentColor(CIRCLE_CARD_DEFAULT_THEME_COLORS.accentColor);
    setButtonColor(CIRCLE_CARD_DEFAULT_THEME_COLORS.buttonColor);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Palette size={16} className="text-gold" />
        <p className="text-sm font-semibold text-foreground">Profile Colours</p>
      </div>

      <div className={cn("grid gap-4", compact ? "" : "lg:grid-cols-[minmax(0,1fr)_360px]")}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="themePrimaryColor">Primary colour</Label>
              <Input
                id="themePrimaryColor"
                name="themePrimaryColor"
                type="color"
                value={primaryColor}
                className="h-12 p-1"
                onChange={(event) =>
                  setPrimaryColor(normalizeColorInput(event.target.value, primaryColor))
                }
              />
              <p className="text-xs font-medium text-silver">{primaryColor}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="themeAccentColor">Accent colour</Label>
              <Input
                id="themeAccentColor"
                name="themeAccentColor"
                type="color"
                value={accentColor}
                className="h-12 p-1"
                onChange={(event) =>
                  setAccentColor(normalizeColorInput(event.target.value, accentColor))
                }
              />
              <p className="text-xs font-medium text-silver">{accentColor}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="themeButtonColor">Button colour</Label>
              <Input
                id="themeButtonColor"
                name="themeButtonColor"
                type="color"
                value={buttonColor}
                className="h-12 p-1"
                onChange={(event) =>
                  setButtonColor(normalizeColorInput(event.target.value, buttonColor))
                }
              />
              <p className="text-xs font-medium text-silver">{buttonColor}</p>
            </div>
          </div>

          <Button
            type="submit"
            name="resetThemeColours"
            value="true"
            variant="outline"
            className="gap-2"
            onClick={resetPreviewToDefault}
          >
            <RotateCcw size={15} />
            Reset to default
          </Button>
        </div>

        <div
          className="circle-card-theme-preview rounded-[1.5rem] border border-[color:var(--cc-theme-secondary-border)] bg-[image:var(--cc-theme-page-bg)] p-4 shadow-panel-soft"
          style={previewStyle}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-gold">Live Preview</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{layoutLabel}</p>
            </div>
            <span className="rounded-full border border-[color:var(--cc-theme-accent-badge-border)] bg-[var(--cc-theme-accent-badge-bg)] px-3 py-1 text-xs text-gold">
              {resolvedTheme.hasCustomColors ? "Custom" : "Default"}
            </span>
          </div>

          <div className="mt-4 rounded-[1.25rem] border border-[color:var(--cc-theme-secondary-border)] bg-[image:var(--cc-theme-hero-bg)] p-4 shadow-inner-surface">
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-full border border-gold/40 bg-gold/12 text-lg font-semibold text-foreground">
                {previewName
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase())
                  .join("") || "CC"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-foreground">{previewName}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
                  {previewTagline}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-[color:var(--cc-theme-accent-badge-border)] bg-[var(--cc-theme-accent-badge-bg)] px-3 py-1 text-xs text-gold">
                Accent badge
              </span>
              <span className="rounded-full border border-silver/14 bg-white/[0.04] px-3 py-1 text-xs text-silver">
                Section tint
              </span>
            </div>

            <button
              type="button"
              className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl border border-[color:var(--cc-theme-button-border)] bg-[image:var(--cc-theme-button-bg)] px-4 text-sm font-semibold text-[var(--cc-theme-button-text)] shadow-[var(--cc-theme-button-shadow)]"
            >
              Button preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
