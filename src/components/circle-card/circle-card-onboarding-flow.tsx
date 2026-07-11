"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { CircleCardType } from "@prisma/client";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Camera,
  Check,
  Eye,
  Link2,
  QrCode,
  Rocket,
  Share2,
  Sparkles,
  UserRound
} from "lucide-react";
import {
  publishFirstCircleCardAction,
  saveFirstCircleCardStepAction
} from "@/actions/circle-card-onboarding.actions";
import { CircleCardFramedImage } from "@/components/circle-card/circle-card-framed-image";
import { CircleCardImageUploadField } from "@/components/circle-card/circle-card-image-upload-field";
import { CircleCardLogoMark } from "@/components/circle-card/circle-card-logo-mark";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ANALYTICS_EVENTS, trackAnalyticsEvent } from "@/lib/analytics";
import { CIRCLE_CARD_TYPE_COPY, CIRCLE_CARD_TYPES } from "@/lib/circle-card/card-types";
import {
  calculateFirstCircleCardReadiness,
  FIRST_CIRCLE_CARD_MISSING_COPY,
  type FirstCircleCardReadiness
} from "@/lib/circle-card/first-card-readiness";
import { cn } from "@/lib/utils";

type Values = {
  cardId: string;
  slug: string;
  cardType: CircleCardType;
  fullName: string;
  businessName: string;
  role: string;
  tagline: string;
  email: string;
  phone: string;
  websiteUrl: string;
  profileImageUrl: string;
  businessLogoUrl: string;
  profileImagePositionX: number;
  profileImagePositionY: number;
  profileImageScale: number;
  businessLogoPositionX: number;
  businessLogoPositionY: number;
  businessLogoScale: number;
};

type Props = {
  defaults: Values;
  initialStep: number;
  initialReadiness: FirstCircleCardReadiness;
  entitlement: "free" | "pro";
  source: {
    source: "spin" | "circle-card";
    sourceCardSlug: string | null;
    returnTo: string | null;
    ownerName: string | null;
  };
};

const STEPS = [
  { title: "Who are you?", short: "Who you are", icon: UserRound },
  { title: "What do you do?", short: "What you do", icon: Sparkles },
  { title: "How should people connect?", short: "How to connect", icon: Link2 }
] as const;

function purposePrompt(cardType: CircleCardType) {
  if (cardType === "CREATOR") return "What do you create?";
  if (cardType === "BUSINESS") return "What does your business help people with?";
  return "What do you want people to know you for?";
}

export function CircleCardOnboardingFlow({
  defaults,
  initialStep,
  initialReadiness,
  entitlement,
  source
}: Props) {
  const [values, setValues] = useState(defaults);
  const [step, setStep] = useState(Math.max(0, Math.min(2, initialStep)));
  const [welcome, setWelcome] = useState(initialReadiness.completedEssentials === 0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const completedRef = useRef(false);
  const readiness = useMemo(
    () =>
      calculateFirstCircleCardReadiness({
        ...values,
        socialLinks: {},
        activeCustomLinkCount: 0,
        isPublished: published
      }),
    [published, values]
  );
  const analyticsProperties = useMemo(
    () => ({
      card_type: values.cardType,
      source: source.source,
      source_card_slug: source.sourceCardSlug,
      completion_percentage: readiness.completionPercentage,
      current_onboarding_step: step + 1,
      entitlement
    }),
    [entitlement, readiness.completionPercentage, source.source, source.sourceCardSlug, step, values.cardType]
  );

  useEffect(() => {
    trackAnalyticsEvent(ANALYTICS_EVENTS.circleCardOnboardingViewed, analyticsProperties);
    return () => {
      if (!completedRef.current) {
        trackAnalyticsEvent(ANALYTICS_EVENTS.circleCardOnboardingAbandoned, analyticsProperties);
      }
    };
    // This event intentionally represents the initial server-backed state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!welcome) headingRef.current?.focus();
  }, [step, welcome]);

  function update<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    if (saveStatus !== "idle") setSaveStatus("idle");
    setMessage(null);
  }

  function validateStep() {
    if (step === 0) {
      if (values.fullName.trim().length < 2) return "Add the name people should see on your card.";
      if (!values.profileImageUrl && !values.businessLogoUrl) return "Add a profile photo or business logo.";
    }
    if (step === 1) {
      if (!values.role.trim() && !values.businessName.trim()) return "Add your role, title or business name.";
      if (!values.tagline.trim()) return "Add a short description of what you do.";
    }
    if (step === 2 && !values.email.trim() && !values.phone.trim() && !values.websiteUrl.trim()) {
      return "Add at least one way for people to connect.";
    }
    return null;
  }

  function draftInput() {
    const { slug: _slug, ...input } = values;
    void _slug;
    return input;
  }

  function saveAndContinue() {
    const validation = validateStep();
    if (validation) {
      setMessage(validation);
      setSaveStatus("error");
      return;
    }

    setSaveStatus("saving");
    setMessage(null);
    startTransition(async () => {
      const result = await saveFirstCircleCardStepAction(draftInput());
      if (!result.ok) {
        setSaveStatus("error");
        setMessage(result.message);
        return;
      }

      setValues((current) => ({ ...current, cardId: result.cardId, slug: result.slug }));
      setSaveStatus("saved");
      const event =
        step === 0
          ? ANALYTICS_EVENTS.circleCardIdentityCompleted
          : step === 1
            ? ANALYTICS_EVENTS.circleCardPurposeCompleted
            : ANALYTICS_EVENTS.circleCardConnectionMethodCompleted;
      trackAnalyticsEvent(event, {
        ...analyticsProperties,
        completion_percentage: result.completionPercentage
      });
      if (result.publishReady) {
        trackAnalyticsEvent(ANALYTICS_EVENTS.circleCardPublishReady, {
          ...analyticsProperties,
          completion_percentage: 100
        });
      }
      if (step < 2) setStep((current) => current + 1);
    });
  }

  function publishCard() {
    const validation = validateStep();
    if (validation || !readiness.publishReady) {
      setMessage(validation ?? "Complete the three essentials before publishing.");
      setSaveStatus("error");
      return;
    }

    setSaveStatus("saving");
    startTransition(async () => {
      const result = await publishFirstCircleCardAction(draftInput());
      if (!result.ok) {
        setSaveStatus("error");
        setMessage(result.message);
        return;
      }
      setValues((current) => ({ ...current, cardId: result.cardId, slug: result.slug }));
      setPublished(true);
      setSaveStatus("saved");
      completedRef.current = true;
      trackAnalyticsEvent(ANALYTICS_EVENTS.circleCardFirstPublished, {
        ...analyticsProperties,
        completion_percentage: 100
      });
    });
  }

  function openPreview() {
    setPreviewOpen(true);
    trackAnalyticsEvent(ANALYTICS_EVENTS.circleCardPreviewOpened, analyticsProperties);
    requestAnimationFrame(() => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  if (welcome) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-3xl items-center overflow-x-hidden px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6">
        <Card className="w-full overflow-hidden border-gold/25 bg-card/90 shadow-panel-soft">
          <CardContent className="p-5 sm:p-9">
            <div className="flex items-center gap-3">
              <CircleCardLogoMark className="h-11 w-11" alt="Circle Card" />
              <Badge variant="outline" className="border-gold/30 text-gold">Circle Card {entitlement === "pro" ? "Pro" : "Free"}</Badge>
            </div>
            <h1 className="mt-7 font-display text-4xl leading-tight text-foreground sm:text-5xl">Let’s build your Circle Card</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
              Your account is ready. Add a few details so people know who you are, what you do and how to connect with you. You’ll see your Circle Card come to life as you build it.
            </p>
            {source.ownerName ? (
              <p className="mt-4 rounded-2xl border border-gold/20 bg-gold/10 p-4 text-sm text-foreground">
                You joined through {source.ownerName}. Build your card now so you can start connecting too.
              </p>
            ) : null}
            <ol className="mt-7 grid gap-3 sm:grid-cols-3">
              {STEPS.map((item, index) => (
                <li key={item.short} className="flex min-h-20 items-center gap-3 rounded-2xl border border-silver/14 bg-background/25 p-4 text-sm text-foreground">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold/12 font-semibold text-gold">{index + 1}</span>
                  {index === 0 ? "Add who you are" : index === 1 ? "Add what you do" : "Add how people can connect"}
                </li>
              ))}
            </ol>
            <div className="mt-7 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Button
                size="lg"
                className="min-h-12 gap-2"
                onClick={() => {
                  setWelcome(false);
                  trackAnalyticsEvent(ANALYTICS_EVENTS.circleCardFirstBuildStarted, analyticsProperties);
                }}
              >
                Build My Circle Card <ArrowRight size={17} />
              </Button>
              <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "min-h-12")}>Continue Later</Link>
            </div>
            <p className="mt-4 text-center text-xs text-muted">It only takes a couple of minutes, and you can edit everything later.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (published) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-3xl items-center px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <Card className="w-full border-gold/30 bg-card/90">
          <CardContent className="p-6 text-center sm:p-10">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-300"><Check size={30} /></span>
            <h1 className="mt-6 font-display text-4xl text-foreground">Your Circle Card is live</h1>
            <p className="mx-auto mt-3 max-w-xl text-muted">Your public link and QR code are ready. Share your card and start making useful connections.</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <Link href={`/card/${values.slug}`} className={cn(buttonVariants({ size: "lg" }), "min-h-12 gap-2")}><Eye size={17} /> View My Circle Card</Link>
              <Link href={`/dashboard/circle-card?section=share&cardId=${values.cardId}#share-assets`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "min-h-12 gap-2")}><Share2 size={17} /> Share My Circle Card</Link>
              <Link href={`/dashboard/circle-card?section=share&cardId=${values.cardId}#qr-code`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "min-h-12 gap-2")}><QrCode size={17} /> Show My QR Code</Link>
              <Link href={`/dashboard/circle-card?section=links&cardId=${values.cardId}`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "min-h-12 gap-2")}><Link2 size={17} /> Add Another Link</Link>
            </div>
            {source.returnTo && source.ownerName ? (
              <Link
                href={source.returnTo}
                onClick={() => trackAnalyticsEvent(ANALYTICS_EVENTS.circleCardSourceCardReturned, analyticsProperties)}
                className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "mt-5 min-h-12")}
              >
                Return to {source.ownerName}’s Circle Card
              </Link>
            ) : null}
          </CardContent>
        </Card>
      </main>
    );
  }

  const StepIcon = STEPS[step].icon;
  const previewName = values.fullName.trim() || "Your name";
  const previewPurpose = values.tagline.trim() || "Your short description will appear here.";

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-6xl overflow-x-hidden px-3 py-4 pb-[max(6rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-7 lg:pb-8">
      <header className="sticky top-0 z-20 -mx-3 border-b border-silver/12 bg-background/90 px-3 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <CircleCardLogoMark className="h-9 w-9 shrink-0" alt="Circle Card" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-medium text-foreground">Build My Circle Card</span>
              <span className="shrink-0 text-muted">{readiness.completedEssentials} of 3 essentials added</span>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-silver/12"
              role="progressbar"
              aria-label="First Circle Card readiness"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={readiness.completionPercentage}
              aria-valuetext={`${readiness.completedEssentials} of 3 essentials added`}
            >
              <div className="h-full rounded-full bg-gold motion-safe:transition-[width]" style={{ width: `${readiness.completionPercentage}%` }} />
            </div>
          </div>
        </div>
      </header>

      <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-w-0 border-silver/16 bg-card/82">
          <CardContent className="p-4 sm:p-7">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold/10 text-gold"><StepIcon size={20} /></span>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.08em] text-silver">Step {step + 1} of 3</p>
                <h1 ref={headingRef} tabIndex={-1} className="mt-1 font-display text-3xl text-foreground outline-none">{STEPS[step].title}</h1>
              </div>
            </div>

            <div className="mt-7 space-y-5">
              {step === 0 ? (
                <>
                  <fieldset>
                    <legend className="text-sm font-medium text-foreground">Choose your card type</legend>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      {CIRCLE_CARD_TYPES.map((type) => {
                        const selected = values.cardType === type;
                        const Icon = type === "BUSINESS" ? Building2 : type === "CREATOR" ? Rocket : UserRound;
                        return (
                          <button key={type} type="button" aria-pressed={selected} onClick={() => update("cardType", type)} className={cn("min-h-24 rounded-2xl border p-4 text-left", selected ? "border-gold/45 bg-gold/10" : "border-silver/14 bg-background/25")}>
                            <Icon size={18} className="text-gold" />
                            <span className="mt-2 block text-sm font-medium text-foreground">{CIRCLE_CARD_TYPE_COPY[type].label}</span>
                            <span className="mt-1 block text-xs text-muted">{CIRCLE_CARD_TYPE_COPY[type].description}</span>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                  <div className="space-y-2">
                    <Label htmlFor="first-card-name">Display name</Label>
                    <Input id="first-card-name" value={values.fullName} onChange={(event) => update("fullName", event.target.value)} autoComplete="name" />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <CircleCardImageUploadField id="first-card-photo" label="Profile photo" uploadKind="profile-photo" value={values.profileImageUrl} onValueChange={(value) => update("profileImageUrl", value)} positionX={values.profileImagePositionX} positionY={values.profileImagePositionY} scale={values.profileImageScale} onAdjustmentChange={(next) => setValues((current) => ({ ...current, profileImagePositionX: next.positionX, profileImagePositionY: next.positionY, profileImageScale: next.scale }))} previewAlt="Profile photo preview" helperText="Use a clear photo of you." previewClassName="rounded-full" />
                    <CircleCardImageUploadField id="first-card-logo" label="Business logo" uploadKind="business-logo" value={values.businessLogoUrl} onValueChange={(value) => update("businessLogoUrl", value)} positionX={values.businessLogoPositionX} positionY={values.businessLogoPositionY} scale={values.businessLogoScale} onAdjustmentChange={(next) => setValues((current) => ({ ...current, businessLogoPositionX: next.positionX, businessLogoPositionY: next.positionY, businessLogoScale: next.scale }))} previewAlt="Business logo preview" helperText="A logo can be used instead of a profile photo." previewClassName="rounded-full" />
                  </div>
                </>
              ) : step === 1 ? (
                <>
                  <p className="rounded-2xl border border-gold/18 bg-gold/8 p-4 text-sm text-muted">{purposePrompt(values.cardType)}</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2"><Label htmlFor="first-card-role">Role or headline</Label><Input id="first-card-role" value={values.role} onChange={(event) => update("role", event.target.value)} placeholder="Founder, designer, creator" autoComplete="organization-title" /></div>
                    <div className="space-y-2"><Label htmlFor="first-card-business">{values.cardType === "CREATOR" ? "Creator or brand name" : "Business or organisation"}</Label><Input id="first-card-business" value={values.businessName} onChange={(event) => update("businessName", event.target.value)} autoComplete="organization" /></div>
                  </div>
                  <div className="space-y-2"><Label htmlFor="first-card-tagline">Short description</Label><Input id="first-card-tagline" value={values.tagline} onChange={(event) => update("tagline", event.target.value)} maxLength={180} placeholder="A short line about what you do and who you help" /><p className="text-xs text-muted">Keep it useful and brief. You can add a full biography later.</p></div>
                </>
              ) : (
                <>
                  <p className="text-sm leading-relaxed text-muted">Add one connection method now. You can add social profiles, messaging routes and Quick Connect options in the full editor later.</p>
                  <div className="space-y-2"><Label htmlFor="first-card-email">Email</Label><Input id="first-card-email" type="email" value={values.email} onChange={(event) => update("email", event.target.value)} autoComplete="email" inputMode="email" /></div>
                  <div className="space-y-2"><Label htmlFor="first-card-phone">Phone</Label><Input id="first-card-phone" type="tel" value={values.phone} onChange={(event) => update("phone", event.target.value)} autoComplete="tel" inputMode="tel" /></div>
                  <div className="space-y-2"><Label htmlFor="first-card-website">Website</Label><Input id="first-card-website" type="url" value={values.websiteUrl} onChange={(event) => update("websiteUrl", event.target.value)} placeholder="https://example.com" autoComplete="url" inputMode="url" /></div>
                  {readiness.publishReady ? (
                    <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-5"><p className="font-medium text-foreground">Your Circle Card is ready</p><p className="mt-1 text-sm text-muted">Preview keeps it private. Publish makes it available through its public link and QR code.</p></div>
                  ) : (
                    <div className="rounded-2xl border border-silver/14 bg-background/25 p-4 text-sm text-muted">{readiness.missing.map((item) => <p key={item}>{FIRST_CIRCLE_CARD_MISSING_COPY[item]}</p>)}</div>
                  )}
                </>
              )}
            </div>

            <div aria-live="polite" className="mt-5 min-h-6 text-sm">
              {saveStatus === "saving" || isPending ? <span className="text-muted">Saving…</span> : null}
              {saveStatus === "saved" ? <span className="text-emerald-300">Saved</span> : null}
              {saveStatus === "error" && message ? <span role="alert" className="text-destructive">{message}</span> : null}
            </div>

            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-silver/14 bg-card/95 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:static lg:mt-5 lg:border-0 lg:bg-transparent lg:p-0">
              <div className="mx-auto grid max-w-6xl grid-cols-[auto_minmax(0,1fr)] gap-3 sm:grid-cols-[auto_auto_minmax(0,1fr)]">
                <Button type="button" variant="outline" className="min-h-11" disabled={step === 0 || isPending} onClick={() => setStep((current) => Math.max(0, current - 1))}><ArrowLeft size={16} /><span className="sr-only sm:not-sr-only sm:ml-2">Back</span></Button>
                <Button type="button" variant="outline" className="hidden min-h-11 sm:inline-flex" onClick={openPreview}><Eye size={16} />{readiness.publishReady ? "Preview My Circle Card" : "Preview My Progress"}</Button>
                {step < 2 ? (
                  <Button type="button" className="min-h-11 gap-2" disabled={isPending} onClick={saveAndContinue}>Save &amp; Continue <ArrowRight size={16} /></Button>
                ) : readiness.publishReady ? (
                  <Button type="button" className="min-h-11 gap-2" disabled={isPending} onClick={publishCard}>Publish My Circle Card <BadgeCheck size={16} /></Button>
                ) : (
                  <Button type="button" className="min-h-11 gap-2" disabled={isPending} onClick={saveAndContinue}>Save Connection Method <Check size={16} /></Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <aside ref={previewRef} className={cn("min-w-0 scroll-mt-24 rounded-[2rem] border border-silver/16 bg-card/72 p-4 lg:sticky lg:top-24 lg:block lg:self-start", previewOpen ? "block" : "hidden")} aria-label="Private Circle Card preview">
          <div className="flex items-center justify-between gap-3"><p className="text-xs uppercase tracking-[0.08em] text-silver">Private preview</p><Badge variant="outline" className="border-silver/18 text-silver">Not public</Badge></div>
          <div className="mt-4 overflow-hidden rounded-[1.6rem] border border-gold/22 bg-background/40 p-5 shadow-panel-soft">
            <div className="flex items-start gap-4">
              <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-gold/30 bg-card text-lg font-semibold text-foreground">
                {values.profileImageUrl || values.businessLogoUrl ? <CircleCardFramedImage src={values.profileImageUrl || values.businessLogoUrl} alt="" positionX={values.profileImageUrl ? values.profileImagePositionX : values.businessLogoPositionX} positionY={values.profileImageUrl ? values.profileImagePositionY : values.businessLogoPositionY} scale={values.profileImageUrl ? values.profileImageScale : values.businessLogoScale}>{previewName.slice(0, 2).toUpperCase()}</CircleCardFramedImage> : <Camera size={22} className="text-muted" />}
              </div>
              <div className="min-w-0"><h2 className="break-words font-display text-2xl text-foreground">{previewName}</h2><p className="mt-1 break-words text-sm text-silver">{[values.role, values.businessName].filter(Boolean).join(" · ") || "Your role or business"}</p></div>
            </div>
            <p className="mt-5 break-words text-sm leading-relaxed text-muted">{previewPurpose}</p>
            <div className="mt-5 grid gap-2">
              {[values.email && "Email", values.phone && "Call", values.websiteUrl && "Website"].filter(Boolean).map((label) => <div key={label} className="flex min-h-11 items-center rounded-xl border border-silver/14 bg-card/65 px-4 text-sm text-foreground"><Link2 size={15} className="mr-2 text-gold" />{label}</div>)}
              {!values.email && !values.phone && !values.websiteUrl ? <div className="min-h-11 rounded-xl border border-dashed border-silver/18 p-3 text-sm text-muted">Your connection button will appear here.</div> : null}
            </div>
          </div>
          <Button type="button" variant="ghost" className="mt-3 min-h-11 w-full lg:hidden" onClick={() => setPreviewOpen(false)}>Close Preview</Button>
        </aside>
      </div>

      <Button type="button" variant="outline" className="mt-4 min-h-11 w-full sm:hidden" onClick={openPreview}><Eye size={16} />{readiness.publishReady ? "Preview My Circle Card" : "Preview My Progress"}</Button>
      <div className="mt-4 text-center"><Link href="/dashboard" className="text-sm text-muted hover:text-foreground">Continue Later</Link></div>
    </main>
  );
}
