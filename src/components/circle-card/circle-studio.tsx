"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  Crown,
  LockKeyhole,
  Monitor,
  Play,
  Smartphone,
  Sparkles,
  Tablet,
  WandSparkles
} from "lucide-react";
import { updateCircleStudioAction } from "@/actions/circle-card.actions";
import { CircleCardLogoMark } from "@/components/circle-card/circle-card-logo-mark";
import { CircleStudioFineTune as CircleStudioFineTuneControls } from "@/components/circle-card/circle-studio-fine-tune";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  CIRCLE_STUDIO_ACCENTS,
  CIRCLE_STUDIO_FIELD_COPY,
  CIRCLE_STUDIO_OPTIONS,
  CIRCLE_STUDIO_PRESETS,
  buildCircleStudioMetadata,
  circleStudioLabel,
  getCircleStudioFineTuneIssues,
  type CircleStudioMetadata,
  type CircleStudioFineTune,
  type CircleStudioTokenKey,
  type CircleStudioTokens
} from "@/lib/circle-card/identity-engine";
import { persistCircleCardCurrentCardPreference } from "@/lib/circle-card/current-card-preference";
import {
  resolveCircleCardLiveTheme
} from "@/lib/circle-card/theme";
import { cn } from "@/lib/utils";

type StudioCard = {
  id: string;
  slug: string;
  fullName: string;
  businessName: string | null;
  role: string | null;
  tagline: string | null;
  profileImageUrl: string | null;
  businessLogoUrl: string | null;
  cardType: string;
  isPublished: boolean;
};

type CircleStudioProps = {
  card: StudioCard;
  initialTokens: CircleStudioTokens;
  initialFineTune: CircleStudioFineTune;
  canActivate: boolean;
  notice?: string | null;
  error?: string | null;
  activatedAt?: string | null;
};

type Device = "desktop" | "tablet" | "mobile";
type Panel = "styles" | "details" | "recommend";

const DEVICE_WIDTH: Record<Device, string> = {
  desktop: "100%",
  tablet: "720px",
  mobile: "390px"
};

const recommendationGroups = [
  { title: "Business personality", icon: BriefcaseBusiness, items: [["Builder", "BOLD"], ["Electrician", "BOLD"], ["Consultant", "EXECUTIVE"], ["Restaurant", "MODERN"], ["Agency", "CORPORATE"]] },
  { title: "Creator personality", icon: Play, items: [["TikTok", "CREATOR"], ["YouTube", "CREATOR"], ["Instagram", "CREATOR"], ["Streamer", "FUTURE"], ["Photographer", "MINIMAL"], ["Artist", "CREATOR"]] }
] as const;

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CC";
}

function ActivateIdentityButton({ applied, disabled }: { applied: boolean; disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={disabled || pending} className="shrink-0 gap-2">
      {pending ? (
        "Applying..."
      ) : applied ? (
        <>
          <Check size={16} /> Applied
        </>
      ) : (
        <>
          <WandSparkles size={16} /> Activate identity
        </>
      )}
    </Button>
  );
}

function LiveCardPreview({ card, metadata, device }: { card: StudioCard; metadata: CircleStudioMetadata; device: Device }) {
  const themeInput = { themeMetadata: metadata };
  const liveTheme = resolveCircleCardLiveTheme(themeInput);
  const style = liveTheme.style as CSSProperties;
  const attributes = liveTheme.attributes;
  const isCompact = device === "mobile";
  const tokens = metadata.tokens;

  return (
    <div
      className="circle-card-public-theme circle-studio-preview mx-auto min-h-[570px] overflow-hidden rounded-[1.65rem] border border-white/10 bg-[image:var(--cc-theme-page-bg)] shadow-[0_32px_100px_rgba(0,0,0,.45)] transition-[width] duration-300"
      style={{ ...style, width: DEVICE_WIDTH[device], maxWidth: "100%" }}
      {...attributes}
    >
      <div className={cn("flex items-center justify-between border-b border-white/8", isCompact ? "px-4 py-3" : "px-6 py-4")}>
        <span className="flex items-center gap-2 text-xs font-semibold text-foreground"><CircleCardLogoMark className="h-7 w-7" alt="" /> Circle Card</span>
        <span className="rounded-full border border-[color:var(--cc-theme-accent-badge-border)] bg-[var(--cc-theme-accent-badge-bg)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.15em] text-gold">Pro identity</span>
      </div>

      <div className={cn("studio-preview-content", isCompact ? "p-4" : "p-6")}>
        <section className={cn("studio-preview-hero relative overflow-hidden border border-[color:var(--cc-theme-secondary-border)] bg-[image:var(--cc-theme-hero-bg)] shadow-[var(--cc-theme-hero-shadow)]", isCompact ? "p-5" : "p-7")}>
          <div className="studio-preview-hero-inner flex items-center gap-5">
            <div className="studio-preview-avatar relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden border border-[color:var(--cc-theme-button-border)] bg-[image:var(--cc-theme-media-bg)] text-2xl font-bold text-foreground">
              {card.profileImageUrl ? <img src={card.profileImageUrl} alt="" className="h-full w-full object-cover" /> : initials(card.fullName)}
            </div>
            <div className="studio-preview-copy min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-gold">{circleStudioLabel(tokens.identityStyle)} identity</p>
              <h2 className="mt-2 font-display text-3xl font-semibold leading-none text-foreground">{card.fullName}</h2>
              <p className="mt-2 text-sm font-medium text-silver">{card.role || card.businessName || "Circle Card member"}</p>
              <p className="mt-3 max-w-md text-xs leading-relaxed text-muted">{card.tagline || "A memorable introduction, all in one place."}</p>
            </div>
          </div>
          <div className="studio-preview-actions mt-5 grid grid-cols-2 gap-2.5">
            <button type="button" className="studio-preview-primary h-11 border border-[color:var(--cc-theme-button-border)] bg-[image:var(--cc-theme-button-bg)] px-4 text-xs font-semibold text-[var(--cc-theme-button-text)] shadow-[var(--cc-theme-button-shadow)]">Connect</button>
            <button type="button" className="studio-preview-secondary h-11 border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-secondary-bg)] px-4 text-xs font-semibold text-foreground">Save card</button>
          </div>
        </section>

        <div className={cn("studio-preview-grid mt-4 grid gap-3", isCompact ? "grid-cols-1" : "grid-cols-2")}>
          {["My work", "Book a conversation", "Circle Trust", "Latest update"].map((label, index) => (
            <div key={label} className="studio-preview-link flex min-h-16 items-center gap-3 border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-secondary-bg)] p-3 shadow-[var(--cc-theme-secondary-shadow)]">
              <span className="studio-preview-icon grid h-9 w-9 shrink-0 place-items-center bg-[var(--cc-theme-accent-badge-bg)] text-gold">{index === 2 ? <BadgeCheck size={17} /> : <ChevronRight size={17} />}</span>
              <span className="min-w-0 text-xs font-semibold text-foreground">{label}</span>
            </div>
          ))}
        </div>

        <div className="studio-preview-trust mt-4 flex items-center justify-between border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-secondary-bg)] p-4">
          <span className="flex items-center gap-2 text-xs font-semibold text-foreground"><BadgeCheck size={17} className="text-gold" /> Circle Trust</span>
          <span className="text-xs font-semibold text-gold">Verified identity</span>
        </div>
      </div>
    </div>
  );
}

export function CircleStudio({ card, initialTokens, initialFineTune, canActivate, notice, error, activatedAt }: CircleStudioProps) {
  const [tokens, setTokens] = useState(initialTokens);
  const [fineTune, setFineTune] = useState(initialFineTune);
  const [device, setDevice] = useState<Device>("desktop");
  const [panel, setPanel] = useState<Panel>("styles");
  const activePreset = CIRCLE_STUDIO_PRESETS.find((preset) => preset.key === tokens.identityStyle);
  const activeAccent = CIRCLE_STUDIO_ACCENTS[tokens.accentPalette];
  const fineTuneIssues = getCircleStudioFineTuneIssues(fineTune);
  const applied = notice === "studio-activated";
  const previewMetadata = useMemo(() => buildCircleStudioMetadata(tokens, "CORE", fineTune), [tokens, fineTune]);
  const activationQuery = applied && activatedAt ? `?studio=${encodeURIComponent(activatedAt)}` : "";
  const tokenEntries = useMemo(() => Object.entries(CIRCLE_STUDIO_FIELD_COPY) as [Exclude<CircleStudioTokenKey, "identityStyle">, { label: string; description: string }][], []);

  function selectPreset(key: CircleStudioTokens["identityStyle"]) {
    const selected = CIRCLE_STUDIO_PRESETS.find((item) => item.key === key);
    if (selected) setTokens(selected.tokens);
  }

  function updateToken<K extends CircleStudioTokenKey>(key: K, value: CircleStudioTokens[K]) {
    setTokens((current) => ({ ...current, [key]: value }));
  }

  useEffect(() => {
    if (card.isPublished) persistCircleCardCurrentCardPreference(card.id);
  }, [card.id, card.isPublished]);

  return (
    <form action={updateCircleStudioAction} className="space-y-6">
      <input type="hidden" name="cardId" value={card.id} />
      <input type="hidden" name="returnPath" value={`/dashboard/circle-card/studio?card=${card.id}`} />
      <input type="hidden" name="studioMetadataJson" value={JSON.stringify(previewMetadata)} />
      {(Object.keys(tokens) as CircleStudioTokenKey[]).map((key) => <input key={key} type="hidden" name={key} value={tokens[key]} />)}
      <input type="hidden" name="fineTuneAccentColor" value={fineTune.accentColor ?? ""} />
      <input type="hidden" name="fineTuneSecondaryColor" value={fineTune.secondaryColor ?? ""} />
      <input type="hidden" name="fineTuneBackgroundStyle" value={fineTune.backgroundStyle} />
      <input type="hidden" name="fineTuneBackgroundImageUrl" value={fineTune.backgroundImageUrl ?? ""} />
      <input type="hidden" name="fineTuneBackgroundOverlay" value={fineTune.backgroundOverlay} />
      <input type="hidden" name="fineTunePaletteSource" value={fineTune.paletteSource} />

      {applied ? (
        <div role="status" className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          <p className="font-semibold">Your Circle Card style is live.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/card/${card.slug}${activationQuery}`} className={cn(buttonVariants({ size: "sm" }), "gap-2")}>View Public Card <ArrowUpRight size={13} /></Link>
            <Link href={`/card/${card.slug}/trust${activationQuery}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2 border-emerald-300/30 text-emerald-100 hover:bg-emerald-300/10")}>Open Circle Trust <ArrowUpRight size={13} /></Link>
            <a href="#circle-styles-heading" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-emerald-300/30 text-emerald-100 hover:bg-emerald-300/10")}>Continue Editing</a>
          </div>
        </div>
      ) : null}
      {error ? <div role="alert" className="rounded-2xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error === "studio-pro-required" ? "Circle Studio activation is available with Circle Card Pro. Your preview is still yours to explore." : error === "studio-contrast" ? "That colour or background combination did not pass Circle Card readability checks. Adjust it and try again." : "That identity could not be activated. Please try again."}</div> : null}

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(520px,.9fr)]">
        <div className="min-w-0 space-y-5">
          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Circle Studio controls">
            {([ ["styles", "Circle Styles"], ["details", "Fine tune"], ["recommend", "For you"] ] as const).map(([value, label]) => (
              <button key={value} type="button" role="tab" aria-selected={panel === value} onClick={() => setPanel(value)} className={cn("whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition", panel === value ? "border-gold/40 bg-gold/12 text-gold" : "border-silver/14 bg-white/[.025] text-silver hover:text-foreground")}>{label}</button>
            ))}
          </div>

          {panel === "styles" ? (
            <section aria-labelledby="circle-styles-heading">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[.18em] text-gold">Personality presets</p>
                <h2 id="circle-styles-heading" className="mt-2 font-display text-2xl text-foreground">Choose the feeling first.</h2>
                <p className="mt-2 text-sm text-muted">Each style is a professionally composed token system. Fine-tune it afterwards without leaving the guardrails.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {CIRCLE_STUDIO_PRESETS.map((preset) => {
                  const selected = tokens.identityStyle === preset.key;
                  const accent = CIRCLE_STUDIO_ACCENTS[preset.tokens.accentPalette];
                  return <button key={preset.key} type="button" aria-pressed={selected} onClick={() => selectPreset(preset.key)} className={cn("group relative overflow-hidden rounded-[1.35rem] border p-4 text-left transition duration-200", selected ? "border-gold/50 bg-gold/[.09] shadow-[0_18px_50px_rgba(0,0,0,.24)]" : "border-silver/12 bg-white/[.025] hover:-translate-y-0.5 hover:border-silver/24")}>
                    <span className="mb-4 block h-16 overflow-hidden rounded-xl border border-white/10" style={{ background: `radial-gradient(circle at 18% 20%, ${accent.accent}66, transparent 30%), linear-gradient(135deg, ${accent.primary}55, #071126 70%)` }}><span className="mx-3 mt-7 block h-7 rounded-t-lg border border-white/10 bg-black/25" /></span>
                    <span className="flex items-start justify-between gap-3"><span><span className="block font-display text-lg font-semibold text-foreground">{preset.label}</span><span className="mt-1 block text-xs leading-relaxed text-muted">{preset.description}</span></span>{selected ? <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold text-background"><Check size={14} /></span> : null}</span>
                    <span className="mt-3 block text-[11px] font-medium text-silver">Best for {preset.bestFor.toLowerCase()}</span>
                    <span className="mt-3 flex flex-wrap gap-1.5">{preset.characteristics.map((item) => <span key={item} className="rounded-full border border-silver/12 bg-white/[.03] px-2 py-1 text-[10px] text-silver">{item}</span>)}</span>
                  </button>;
                })}
              </div>
            </section>
          ) : null}

          {panel === "details" ? (
            <div className="space-y-4">
              <CircleStudioFineTuneControls
                value={fineTune}
                onChange={setFineTune}
                presetAccent={activeAccent.accent}
                presetSecondary={activeAccent.primary}
                profileImageUrl={card.profileImageUrl}
                businessLogoUrl={card.businessLogoUrl}
                isBusinessCard={card.cardType === "BUSINESS"}
              />
              {tokenEntries.map(([key, copy]) => (
                <fieldset key={key} className="rounded-[1.25rem] border border-silver/12 bg-white/[.025] p-4">
                  <legend className="sr-only">{copy.label}</legend>
                  <div className="mb-3"><p className="text-sm font-semibold text-foreground">{copy.label}</p><p className="mt-1 text-xs text-muted">{copy.description}</p></div>
                  <div className="flex flex-wrap gap-2">
                    {CIRCLE_STUDIO_OPTIONS[key].map((value) => <button key={value} type="button" aria-pressed={tokens[key] === value} onClick={() => updateToken(key, value)} className={cn("rounded-xl border px-3 py-2 text-xs font-semibold transition", tokens[key] === value ? "border-gold/45 bg-gold/12 text-gold" : "border-silver/12 bg-background/25 text-silver hover:border-silver/25 hover:text-foreground")}><span className="flex items-center gap-2">{key === "accentPalette" ? <span className="h-3 w-3 rounded-full" style={{ background: CIRCLE_STUDIO_ACCENTS[value as keyof typeof CIRCLE_STUDIO_ACCENTS]?.primary }} /> : null}{circleStudioLabel(value)}</span></button>)}
                  </div>
                </fieldset>
              ))}
            </div>
          ) : null}

          {panel === "recommend" ? <div className="grid gap-4 md:grid-cols-2">{recommendationGroups.map((group) => <section key={group.title} className="rounded-[1.4rem] border border-silver/12 bg-white/[.025] p-5"><group.icon size={20} className="text-gold" /><h2 className="mt-3 font-display text-xl text-foreground">{group.title}</h2><p className="mt-1 text-xs text-muted">Start with a recommendation, then make it yours.</p><div className="mt-4 grid gap-2">{group.items.map(([label, style]) => <button key={label} type="button" onClick={() => selectPreset(style)} className="flex items-center justify-between rounded-xl border border-silver/12 bg-background/25 px-3 py-2.5 text-left text-sm text-silver hover:border-gold/30 hover:text-foreground"><span>{label}</span><span className="flex items-center gap-1 text-xs text-gold">{circleStudioLabel(style)} <ChevronRight size={13} /></span></button>)}</div></section>)}</div> : null}
        </div>

        <aside className="min-w-0 2xl:sticky 2xl:top-4 2xl:self-start">
          <div className="rounded-[1.65rem] border border-silver/12 bg-[#050a14]/80 p-3 shadow-panel-soft backdrop-blur-xl sm:p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="flex items-center gap-2 text-sm font-semibold text-foreground"><Sparkles size={15} className="text-gold" /> Live public preview</p><p className="mt-1 text-xs text-muted">Exactly what visitors will see.</p></div>
              <div className="flex w-fit rounded-xl border border-silver/12 bg-background/30 p-1" aria-label="Preview device">
                {([ ["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone] ] as const).map(([value, Icon]) => <button key={value} type="button" aria-label={`${value} preview`} aria-pressed={device === value} onClick={() => setDevice(value)} className={cn("grid h-8 w-9 place-items-center rounded-lg transition", device === value ? "bg-gold/15 text-gold" : "text-muted hover:text-foreground")}><Icon size={15} /></button>)}
              </div>
            </div>
            <div className="max-h-[680px] overflow-auto rounded-[1.65rem] bg-black/20 p-1 sm:p-2"><LiveCardPreview card={card} metadata={previewMetadata} device={device} /></div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{activePreset?.label} · {circleStudioLabel(tokens.accentPalette)}</p><p className="mt-1 text-xs text-muted">Preview updates instantly. Activate when it feels like you.</p></div>
              {canActivate ? <ActivateIdentityButton applied={applied} disabled={fineTuneIssues.length > 0} /> : <Link href="/circle-card/pro" className={cn(buttonVariants(), "shrink-0 gap-2")}><Crown size={16} /> Unlock with Pro <ArrowUpRight size={14} /></Link>}
            </div>
            {!canActivate ? <p className="mt-3 flex items-center gap-2 rounded-xl border border-gold/18 bg-gold/[.06] px-3 py-2 text-xs text-gold"><LockKeyhole size={14} /> Upgrade to Pro to make this style live.</p> : null}
          </div>
        </aside>
      </div>
    </form>
  );
}
