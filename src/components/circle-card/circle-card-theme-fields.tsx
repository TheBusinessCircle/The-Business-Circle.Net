"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { ImageIcon, Palette, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  CIRCLE_CARD_THEME_PRESETS,
  CIRCLE_CARD_THEME_SURFACE_STYLES,
  CIRCLE_CARD_THEME_SURFACE_STYLE_COPY,
  buildCircleCardThemeStyle,
  resolveCircleCardTheme,
  type CircleCardThemeSurfaceStyle
} from "@/lib/circle-card/theme";
import { cn } from "@/lib/utils";

type CircleCardThemeFieldsProps = {
  themePrimaryColor?: string | null;
  themeAccentColor?: string | null;
  themeButtonColor?: string | null;
  themeSurfaceStyle?: string | null;
  themePreset?: string | null;
  fullName?: string | null;
  tagline?: string | null;
  profileLayout?: string | null;
  compact?: boolean;
};

const PRESET_FAMILIES = ["Business", "Creator", "Minimal"] as const;

function normalizeColorInput(value: string | null | undefined, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(value?.trim() ?? "") ? value!.trim().toUpperCase() : fallback;
}

export function CircleCardThemeFields({
  themePrimaryColor,
  themeAccentColor,
  themeButtonColor,
  themeSurfaceStyle,
  themePreset,
  fullName,
  tagline,
  profileLayout,
  compact = false
}: CircleCardThemeFieldsProps) {
  const initialTheme = resolveCircleCardTheme({
    themePrimaryColor,
    themeAccentColor,
    themeButtonColor,
    themeSurfaceStyle,
    themePreset
  });
  const [primaryColor, setPrimaryColor] = useState(initialTheme.primaryColor);
  const [accentColor, setAccentColor] = useState(initialTheme.accentColor);
  const [buttonColor, setButtonColor] = useState(initialTheme.buttonColor);
  const [surfaceStyle, setSurfaceStyle] = useState<CircleCardThemeSurfaceStyle>(
    initialTheme.surfaceStyle
  );
  const [presetKey, setPresetKey] = useState(initialTheme.presetKey ?? "");

  const resolvedTheme = useMemo(
    () =>
      resolveCircleCardTheme({
        themePrimaryColor: primaryColor,
        themeAccentColor: accentColor,
        themeButtonColor: buttonColor,
        themeSurfaceStyle: surfaceStyle,
        themePreset: presetKey
      }),
    [accentColor, buttonColor, presetKey, primaryColor, surfaceStyle]
  );
  const previewStyle = buildCircleCardThemeStyle(resolvedTheme) as CSSProperties;
  const previewName = fullName?.trim() || "Your name";
  const previewTagline = tagline?.trim() || "A Circle Card that feels unmistakably yours.";
  const layoutLabel = profileLayout ? `${profileLayout.toLowerCase()} layout` : "profile layout";

  function applyPreset(key: string) {
    const preset = CIRCLE_CARD_THEME_PRESETS.find((candidate) => candidate.key === key);

    if (!preset) {
      return;
    }

    setPresetKey(preset.key);
    setPrimaryColor(preset.primaryColor);
    setAccentColor(preset.accentColor);
    setButtonColor(preset.buttonColor);
    setSurfaceStyle(preset.surfaceStyle);
  }

  function updatePrimaryColor(value: string) {
    setPresetKey("");
    setPrimaryColor(normalizeColorInput(value, primaryColor));
  }

  function updateAccentColor(value: string) {
    setPresetKey("");
    setAccentColor(normalizeColorInput(value, accentColor));
  }

  function updateButtonColor(value: string) {
    setPresetKey("");
    setButtonColor(normalizeColorInput(value, buttonColor));
  }

  function updateSurfaceStyle(value: string) {
    setPresetKey("");
    setSurfaceStyle(value as CircleCardThemeSurfaceStyle);
  }

  return (
    <div className="space-y-5">
      <input type="hidden" name="themePreset" value={presetKey} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,420px)]">
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette size={16} className="text-gold" />
              <p className="text-sm font-semibold text-foreground">Starter presets</p>
            </div>
            <div className="space-y-4">
              {PRESET_FAMILIES.map((family) => (
                <fieldset key={family} className="space-y-2">
                  <legend className="text-xs font-medium text-muted">{family}</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {CIRCLE_CARD_THEME_PRESETS.filter((preset) => preset.family === family).map(
                      (preset) => (
                        <button
                          key={preset.key}
                          type="button"
                          className={cn(
                            "flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-silver/14 bg-background/22 px-3 py-2 text-left text-sm text-foreground transition hover:border-gold/35 hover:bg-card/60",
                            presetKey === preset.key && "border-gold/45 bg-gold/10"
                          )}
                          onClick={() => applyPreset(preset.key)}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{preset.label}</span>
                            <span className="block text-xs text-muted">
                              {CIRCLE_CARD_THEME_SURFACE_STYLE_COPY[preset.surfaceStyle].label}
                            </span>
                          </span>
                          <span className="flex shrink-0 -space-x-1">
                            {[preset.primaryColor, preset.accentColor, preset.buttonColor].map(
                              (color) => (
                                <span
                                  key={color}
                                  className="h-5 w-5 rounded-full border border-silver/20"
                                  style={{ backgroundColor: color }}
                                />
                              )
                            )}
                          </span>
                        </button>
                      )
                    )}
                  </div>
                </fieldset>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="themePrimaryColor">Primary colour</Label>
              <Input
                id="themePrimaryColor"
                name="themePrimaryColor"
                type="color"
                value={primaryColor}
                className="h-12 p-1"
                onChange={(event) => updatePrimaryColor(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="themeAccentColor">Accent colour</Label>
              <Input
                id="themeAccentColor"
                name="themeAccentColor"
                type="color"
                value={accentColor}
                className="h-12 p-1"
                onChange={(event) => updateAccentColor(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="themeButtonColor">Button colour</Label>
              <Input
                id="themeButtonColor"
                name="themeButtonColor"
                type="color"
                value={buttonColor}
                className="h-12 p-1"
                onChange={(event) => updateButtonColor(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="themeSurfaceStyle">Surface style</Label>
              <Select
                id="themeSurfaceStyle"
                name="themeSurfaceStyle"
                value={surfaceStyle}
                onChange={(event) => updateSurfaceStyle(event.target.value)}
              >
                {CIRCLE_CARD_THEME_SURFACE_STYLES.map((style) => (
                  <option key={style} value={style}>
                    {CIRCLE_CARD_THEME_SURFACE_STYLE_COPY[style].label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-silver/18 bg-background/18 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ImageIcon size={16} className="text-silver" />
                  Generate From Profile Image
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Future hook prepared. Colour extraction and AI generation are not active in this phase.
                </p>
              </div>
              <Button type="button" variant="outline" disabled className="gap-2">
                <Sparkles size={15} />
                Coming later
              </Button>
            </div>
          </div>
        </div>

        <div
          className="circle-card-theme-preview rounded-[1.5rem] border border-silver/14 bg-[image:var(--cc-theme-page-bg)] p-4 shadow-panel-soft"
          style={previewStyle}
          data-circle-card-surface={surfaceStyle.toLowerCase()}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-gold">Theme Preview</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{layoutLabel}</p>
            </div>
            <span className="rounded-full border border-gold/24 bg-gold/10 px-3 py-1 text-xs text-gold">
              {resolvedTheme.source === "preset" ? resolvedTheme.presetLabel : "Custom"}
            </span>
          </div>

          <div className={cn("mt-4 grid gap-3", compact ? "" : "sm:grid-cols-[minmax(0,1fr)_150px]")}>
            <div className="rounded-[1.25rem] border border-gold/20 bg-[image:var(--cc-theme-hero-bg)] p-4 shadow-inner-surface">
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
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{previewTagline}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-gold/24 bg-gold/10 px-3 py-1 text-xs text-gold">
                  Identity
                </span>
                <span className="rounded-full border border-silver/14 bg-white/[0.04] px-3 py-1 text-xs text-silver">
                  Trust
                </span>
              </div>
              <button
                type="button"
                className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl border border-[color:var(--cc-theme-button-border)] bg-[image:var(--cc-theme-button-bg)] px-4 text-sm font-semibold text-[var(--cc-theme-button-text)] shadow-[var(--cc-theme-button-shadow)]"
              >
                Main action
              </button>
            </div>

            <div className="rounded-[1.25rem] border border-silver/14 bg-card/64 p-3 shadow-inner-surface">
              <p className="text-xs font-medium text-silver">Mobile Preview</p>
              <div className="mt-3 rounded-[1rem] border border-gold/18 bg-[image:var(--cc-theme-media-bg)] p-3">
                <div className="mx-auto h-14 w-14 rounded-full border border-gold/35 bg-gold/14" />
                <p className="mt-3 truncate text-center text-sm font-semibold text-foreground">
                  {previewName}
                </p>
                <div className="mt-3 grid gap-2">
                  <span className="h-8 rounded-xl bg-gold/18" />
                  <span className="h-8 rounded-xl bg-white/[0.055]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
