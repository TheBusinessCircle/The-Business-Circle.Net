"use client";

import { useState } from "react";
import { Palette, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { CircleCardImageUploadField } from "@/components/circle-card/circle-card-image-upload-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  CIRCLE_STUDIO_ACCENTS,
  DEFAULT_CIRCLE_STUDIO_FINE_TUNE,
  circleStudioContrastRatio,
  getCircleStudioFineTuneIssues,
  type CircleStudioFineTune
} from "@/lib/circle-card/identity-engine";

type CircleStudioFineTuneProps = {
  value: CircleStudioFineTune;
  onChange: (value: CircleStudioFineTune) => void;
  presetAccent: string;
  presetSecondary: string;
  profileImageUrl?: string | null;
  businessLogoUrl?: string | null;
  isBusinessCard: boolean;
};

type PaletteSource = "PROFILE_IMAGE" | "BUSINESS_LOGO";

function rgbToHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

function liftToContrast(color: string, minimum: number) {
  const parsed = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!parsed) return color;
  let red = Number.parseInt(parsed[1], 16);
  let green = Number.parseInt(parsed[2], 16);
  let blue = Number.parseInt(parsed[3], 16);
  let candidate = color.toUpperCase();

  for (let index = 0; index < 12 && circleStudioContrastRatio(candidate, "#071126") < minimum; index += 1) {
    red += (255 - red) * 0.14;
    green += (255 - green) * 0.14;
    blue += (255 - blue) * 0.14;
    candidate = rgbToHex(red, green, blue);
  }

  return candidate;
}

function colourDistance(first: string, second: string) {
  const channels = (value: string) => [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16)
  ];
  const a = channels(first);
  const b = channels(second);
  return Math.sqrt(a.reduce((total, channel, index) => total + (channel - b[index]) ** 2, 0));
}

function fallbackPalette(seed: string) {
  const palettes = Object.values(CIRCLE_STUDIO_ACCENTS);
  const hash = [...seed].reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 7);
  const palette = palettes[hash % palettes.length];
  return {
    accent: liftToContrast(palette.accent, 4.5),
    secondary: liftToContrast(palette.primary, 3)
  };
}

async function extractImagePalette(imageUrl: string) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.decoding = "async";
  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("image-unavailable"));
  });
  image.src = imageUrl;
  await loaded;

  const canvas = document.createElement("canvas");
  canvas.width = 40;
  canvas.height = 40;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("canvas-unavailable");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const buckets = new Map<string, number>();

  for (let index = 0; index < pixels.length; index += 16) {
    if (pixels[index + 3] < 180) continue;
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const brightest = Math.max(red, green, blue);
    const darkest = Math.min(red, green, blue);
    if (brightest < 45 || darkest > 225 || brightest - darkest < 22) continue;
    const key = rgbToHex(
      Math.round(red / 32) * 32,
      Math.round(green / 32) * 32,
      Math.round(blue / 32) * 32
    );
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  const candidates = [...buckets.entries()]
    .sort((first, second) => second[1] - first[1])
    .map(([color]) => color);
  if (!candidates.length) throw new Error("palette-unavailable");

  const accent = liftToContrast(candidates[0], 4.5);
  const secondarySource = candidates.find((color) => colourDistance(color, candidates[0]) > 70)
    ?? candidates[1]
    ?? candidates[0];
  return {
    accent,
    secondary: liftToContrast(secondarySource, 3)
  };
}

export function CircleStudioFineTune({
  value,
  onChange,
  presetAccent,
  presetSecondary,
  profileImageUrl,
  businessLogoUrl,
  isBusinessCard
}: CircleStudioFineTuneProps) {
  const [paletteBusy, setPaletteBusy] = useState<PaletteSource | null>(null);
  const [paletteNotice, setPaletteNotice] = useState<string | null>(null);
  const issues = getCircleStudioFineTuneIssues(value);
  const shownAccent = value.accentColor ?? presetAccent;
  const shownSecondary = value.secondaryColor ?? presetSecondary;

  function patch(next: Partial<CircleStudioFineTune>) {
    onChange({ ...value, ...next, version: 1 });
  }

  async function suggestImageColours(imageUrl: string | null | undefined, source: PaletteSource) {
    if (!imageUrl || paletteBusy) return;
    setPaletteBusy(source);
    setPaletteNotice(null);

    try {
      const palette = await extractImagePalette(imageUrl);
      patch({
        accentColor: palette.accent,
        secondaryColor: palette.secondary,
        paletteSource: source
      });
      setPaletteNotice("A readable palette was suggested from your image.");
    } catch {
      const palette = fallbackPalette(imageUrl);
      patch({
        accentColor: palette.accent,
        secondaryColor: palette.secondary,
        paletteSource: source
      });
      setPaletteNotice("We used a balanced fallback palette because this image could not be read directly.");
    } finally {
      setPaletteBusy(null);
    }
  }

  return (
    <section className="rounded-[1.4rem] border border-gold/18 bg-gold/[.035] p-4 sm:p-5" aria-labelledby="studio-fine-tune-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-gold">Optional Pro controls</p>
          <h2 id="studio-fine-tune-title" className="mt-2 font-display text-xl text-foreground">Fine-tune your style</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">Start with a preset, then make small, protected adjustments.</p>
        </div>
        <Badge variant="premium" className="gap-1.5"><ShieldCheck size={13} /> Readability protected</Badge>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 rounded-2xl border border-silver/12 bg-background/24 p-3">
          <Label htmlFor="studio-accent-color">Pick accent colour</Label>
          <div className="flex items-center gap-3">
            <input
              id="studio-accent-color"
              type="color"
              value={shownAccent}
              onChange={(event) => patch({ accentColor: event.target.value.toUpperCase(), paletteSource: "CUSTOM" })}
              className="h-11 w-14 cursor-pointer rounded-xl border border-silver/18 bg-background p-1"
            />
            <span className="text-xs text-muted">Used for actions and key highlights.</span>
          </div>
        </div>
        <div className="space-y-2 rounded-2xl border border-silver/12 bg-background/24 p-3">
          <Label htmlFor="studio-secondary-color">Pick secondary colour</Label>
          <div className="flex items-center gap-3">
            <input
              id="studio-secondary-color"
              type="color"
              value={shownSecondary}
              onChange={(event) => patch({ secondaryColor: event.target.value.toUpperCase(), paletteSource: "CUSTOM" })}
              className="h-11 w-14 cursor-pointer rounded-xl border border-silver/18 bg-background p-1"
            />
            <span className="text-xs text-muted">Used for borders, depth and supporting colour.</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" className="gap-2" onClick={() => patch({ accentColor: null, secondaryColor: null, paletteSource: "PRESET" })}>
          <Palette size={14} /> Use preset colours
        </Button>
        <Button type="button" size="sm" variant="outline" className="gap-2" disabled={!profileImageUrl || Boolean(paletteBusy)} onClick={() => suggestImageColours(profileImageUrl, "PROFILE_IMAGE")}>
          <Sparkles size={14} /> {paletteBusy === "PROFILE_IMAGE" ? "Reading image…" : "Use colours from my profile image"}
        </Button>
        {isBusinessCard ? (
          <Button type="button" size="sm" variant="outline" className="gap-2" disabled={!businessLogoUrl || Boolean(paletteBusy)} onClick={() => suggestImageColours(businessLogoUrl, "BUSINESS_LOGO")}>
            <Sparkles size={14} /> {paletteBusy === "BUSINESS_LOGO" ? "Reading logo…" : "Use colours from my business logo"}
          </Button>
        ) : null}
      </div>

      {paletteNotice ? <p className="mt-3 text-xs text-silver" role="status">{paletteNotice}</p> : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
        <div className="space-y-2 rounded-2xl border border-silver/12 bg-background/24 p-3">
          <Label htmlFor="studio-background-style">Pick background style</Label>
          <Select
            id="studio-background-style"
            value={value.backgroundStyle === "IMAGE" ? "IMAGE" : value.backgroundStyle}
            onChange={(event) => patch({ backgroundStyle: event.target.value as CircleStudioFineTune["backgroundStyle"] })}
          >
            <option value="PRESET">Preset background</option>
            <option value="DEEP_GRADIENT">Deep gradient</option>
            <option value="SOFT_GLOW">Soft glow</option>
            {value.backgroundImageUrl ? <option value="IMAGE">Uploaded image</option> : null}
          </Select>
          <p className="text-xs text-muted">Only approved treatments are available.</p>
          {value.backgroundStyle === "IMAGE" ? (
            <div className="pt-2">
              <Label htmlFor="studio-background-overlay">Automatic readability overlay</Label>
              <input
                id="studio-background-overlay"
                type="range"
                min="62"
                max="86"
                step="2"
                value={Math.round(value.backgroundOverlay * 100)}
                onChange={(event) => patch({ backgroundOverlay: Number(event.target.value) / 100 })}
                className="mt-2 w-full accent-[hsl(var(--gold))]"
              />
              <p className="mt-1 text-xs text-muted">The image always stays dim enough for readable content.</p>
            </div>
          ) : null}
        </div>

        <CircleCardImageUploadField
          id="studio-background-image"
          label="Upload background"
          uploadKind="background-image"
          value={value.backgroundImageUrl ?? ""}
          onValueChange={(backgroundImageUrl) => patch({ backgroundImageUrl: backgroundImageUrl || null, backgroundStyle: backgroundImageUrl ? "IMAGE" : "PRESET" })}
          previewAlt="Circle Card background preview"
          helperText="JPG, PNG or WebP. A protective overlay is added automatically."
          uploadSuccessMessage="Background uploaded. Preview it here, then activate your identity when ready."
          showAdjustments={false}
          allowUrlInput={false}
          className="rounded-2xl border border-silver/12 bg-background/24 p-3"
          previewClassName="aspect-[16/9] max-h-44"
        />
      </div>

      {issues.length ? (
        <div className="mt-4 rounded-xl border border-amber-300/28 bg-amber-300/10 px-3 py-2.5 text-xs text-amber-100" role="alert">
          {issues.map((issue) => <p key={issue}>{issue}</p>)}
        </div>
      ) : (
        <p className="mt-4 flex items-center gap-2 text-xs text-emerald-200"><ShieldCheck size={14} /> Colour contrast is safe for Circle Card and Circle Trust.</p>
      )}

      <Button type="button" size="sm" variant="ghost" className="mt-3 gap-2" onClick={() => onChange({ ...DEFAULT_CIRCLE_STUDIO_FINE_TUNE })}>
        <RotateCcw size={14} /> Reset to recommended palette
      </Button>
    </section>
  );
}
