import Link from "next/link";
import { ArrowUpRight, Palette, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CIRCLE_STUDIO_ACCENTS, circleStudioLabel, readCircleStudioMetadata } from "@/lib/circle-card/identity-engine";
import { cn } from "@/lib/utils";

type CircleCardThemeFieldsProps = {
  cardId?: string | null;
  themeMetadata?: unknown;
  themePrimaryColor?: string | null;
  themeAccentColor?: string | null;
  themeButtonColor?: string | null;
  fullName?: string | null;
  tagline?: string | null;
  profileLayout?: string | null;
  compact?: boolean;
};

export function CircleCardThemeFields({ cardId, themeMetadata }: CircleCardThemeFieldsProps) {
  const studio = readCircleStudioMetadata(themeMetadata);
  const accent = studio ? CIRCLE_STUDIO_ACCENTS[studio.tokens.accentPalette] : CIRCLE_STUDIO_ACCENTS.GOLD;
  const displayAccent = studio?.fineTune.accentColor ?? accent.primary;
  const accentLabel = studio?.fineTune.accentColor ? "Fine-tuned palette" : studio ? accent.label : "Classic gold";
  const href = cardId ? `/dashboard/circle-card/studio?card=${cardId}` : "/dashboard/circle-card/studio";

  return (
    <div className="overflow-hidden rounded-[1.4rem] border border-silver/12 bg-[radial-gradient(circle_at_85%_0%,rgba(212,175,95,.13),transparent_32%),rgba(255,255,255,.025)] p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><Palette size={16} className="text-gold" /> Circle Studio</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">Build a curated identity with styles, layouts, surfaces, type, motion, QR presentation and more. Every combination stays premium.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-silver/12 bg-background/25 px-3 py-1 text-xs text-silver">{studio ? circleStudioLabel(studio.tokens.identityStyle) : "Circle Card original"}</span>
            <span className="flex items-center gap-1.5 rounded-full border border-silver/12 bg-background/25 px-3 py-1 text-xs text-silver"><span className="h-2.5 w-2.5 rounded-full" style={{ background: displayAccent }} /> {accentLabel}</span>
          </div>
        </div>
        <Link href={href} className={cn(buttonVariants(), "shrink-0 gap-2")}><Sparkles size={16} /> Open Circle Studio <ArrowUpRight size={14} /></Link>
      </div>
    </div>
  );
}
