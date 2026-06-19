"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Compass,
  CreditCard,
  FileDown,
  LifeBuoy,
  RotateCcw
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ANALYTICS_EVENTS,
  trackAnalyticsEvent,
  trackFounderAuditCompleted,
  trackFounderAuditMembershipClicked,
  trackMembershipSelectedFromAudit,
  trackFounderAuditStarted
} from "@/lib/analytics";
import { cn } from "@/lib/utils";
import {
  FOUNDER_AUDIT_QUESTIONS,
  FOUNDER_AUDIT_CATEGORY_MAP,
  calculateFounderAuditScore,
  getFounderAuditBottleneck,
  getFounderAuditConversionRecommendation,
  getFounderAuditRecommendation
} from "./audit-data";

type AuditStage = "intro" | "questions" | "lead-capture" | "result";

type AuditLeadFormState = {
  name: string;
  email: string;
  businessName: string;
  website: string;
  essentialConsent: boolean;
  marketingEmailOptIn: boolean;
};

const totalQuestions = FOUNDER_AUDIT_QUESTIONS.length;
type AuditEntrySource =
  | "home"
  | "about"
  | "membership"
  | "join"
  | "audit"
  | "insights"
  | "contact"
  | "intent"
  | "navigation"
  | "footer"
  | "unknown";

const allowedAuditSources = new Set<AuditEntrySource>([
  "home",
  "about",
  "membership",
  "join",
  "audit",
  "insights",
  "contact",
  "intent",
  "navigation",
  "footer",
  "unknown"
]);

function formatQuestionPosition(index: number) {
  return `Question ${index + 1} of ${totalQuestions}`;
}

function readAuditEntryContext() {
  if (typeof window === "undefined") {
    return {
      source: "audit" as const,
      topic: undefined as string | undefined
    };
  }

  const params = new URLSearchParams(window.location.search);
  const source = params.get("source") ?? "audit";

  return {
    source: allowedAuditSources.has(source as AuditEntrySource)
      ? (source as AuditEntrySource)
      : "audit",
    topic: params.get("topic") ?? undefined
  };
}

function auditAreaSummary(answers: readonly (number | undefined)[]) {
  const answered = FOUNDER_AUDIT_QUESTIONS.map((question, index) => ({
    questionId: question.id,
    category: FOUNDER_AUDIT_CATEGORY_MAP[question.id].category,
    score: answers[index]
  })).filter((entry) => typeof entry.score === "number");

  return {
    strengths: answered.filter((entry) => Number(entry.score) >= 3).map((entry) => entry.category),
    weaknesses: answered.filter((entry) => Number(entry.score) <= 1).map((entry) => entry.category)
  };
}

function firstUniqueValue(values: readonly string[]) {
  return Array.from(new Set(values))[0] ?? null;
}

export function FounderAuditClient() {
  const [stage, setStage] = useState<AuditStage>("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<number | undefined>>(
    () => Array.from({ length: totalQuestions }) as Array<number | undefined>
  );
  const [leadForm, setLeadForm] = useState<AuditLeadFormState>({
    name: "",
    email: "",
    businessName: "",
    website: "",
    essentialConsent: false,
    marketingEmailOptIn: false
  });
  const [leadSubmitError, setLeadSubmitError] = useState<string | null>(null);
  const [resultWarning, setResultWarning] = useState<string | null>(null);
  const [leadSubmitting, setLeadSubmitting] = useState(false);

  const currentQuestion = FOUNDER_AUDIT_QUESTIONS[currentIndex];
  const selectedScore = answers[currentIndex];
  const completedCount = answers.filter((score) => typeof score === "number").length;
  const progressPercent =
    stage === "result" || stage === "lead-capture"
      ? 100
      : Math.round(((currentIndex + 1) / totalQuestions) * 100);

  const totalScore = useMemo(
    () => calculateFounderAuditScore(answers.filter((score): score is number => typeof score === "number")),
    [answers]
  );
  const recommendation = getFounderAuditRecommendation(totalScore || totalQuestions);
  const conversionRecommendation = getFounderAuditConversionRecommendation(totalScore || totalQuestions);
  const bottleneck = useMemo(() => getFounderAuditBottleneck(answers), [answers]);
  const areaSummary = useMemo(() => auditAreaSummary(answers), [answers]);
  const mainStrength = firstUniqueValue(areaSummary.strengths);
  const resultHighlights = [
    {
      label: "Main strength",
      title: mainStrength ?? "Clarity can become the first win",
      copy: mainStrength
        ? "This is the strongest place to build from now."
        : "No single area stood out strongly yet, so start by making the next move clearer.",
      icon: CheckCircle2
    },
    {
      label: "Main risk",
      title: bottleneck.category,
      copy: bottleneck.signal,
      icon: AlertTriangle
    },
    {
      label: "Biggest opportunity",
      title: conversionRecommendation.biggestOpportunity,
      copy: "Use the next step below to turn the audit into a practical move.",
      icon: Compass
    },
    {
      label: "Recommended next step",
      title: conversionRecommendation.recommendedPath,
      copy: conversionRecommendation.recommendedNextStep,
      icon: ArrowRight
    }
  ];
  const auditEntryContext = useMemo(() => readAuditEntryContext(), []);

  const selectAnswer = (score: number) => {
    setAnswers((current) => {
      const next = [...current];
      next[currentIndex] = score;
      return next;
    });
  };

  const goNext = () => {
    if (typeof selectedScore !== "number") {
      return;
    }

    if (currentIndex === totalQuestions - 1) {
      trackAnalyticsEvent(ANALYTICS_EVENTS.auditComplete, {
        score: totalScore,
        scorePercent: conversionRecommendation.scorePercent,
        tier: recommendation.tierName
      });
      trackFounderAuditCompleted({
        score: totalScore,
        tier: recommendation.tierName,
        source: auditEntryContext.source,
        topic: auditEntryContext.topic
      });
      window.bcnAnalytics?.collect?.({
        eventName: "audit_completed",
        path: window.location.pathname + window.location.search,
        metadata: {
          score: totalScore,
          scorePercent: conversionRecommendation.scorePercent,
          resultType: recommendation.phase,
          recommendedTier: recommendation.tierName,
          recommendedPath: conversionRecommendation.recommendedPath,
          answers: FOUNDER_AUDIT_QUESTIONS.map((question, index) => ({
            questionId: question.id,
            score: answers[index] ?? null
          })),
          strengths: areaSummary.strengths,
          weaknesses: areaSummary.weaknesses,
          source: auditEntryContext.source,
          topic: auditEntryContext.topic ?? null
        }
      });
      setLeadSubmitError(null);
      setResultWarning(null);
      setStage("lead-capture");
      return;
    }

    setCurrentIndex((index) => index + 1);
  };

  const goBack = () => {
    if (stage === "result" || stage === "lead-capture") {
      setStage("questions");
      setCurrentIndex(totalQuestions - 1);
      return;
    }

    if (currentIndex === 0) {
      setStage("intro");
      return;
    }

    setCurrentIndex((index) => index - 1);
  };

  const restartAudit = () => {
    setAnswers(Array.from({ length: totalQuestions }) as Array<number | undefined>);
    setCurrentIndex(0);
    setLeadForm({
      name: "",
      email: "",
      businessName: "",
      website: "",
      essentialConsent: false,
      marketingEmailOptIn: false
    });
    setLeadSubmitError(null);
    setResultWarning(null);
    setStage("intro");
  };

  const updateLeadField = <Key extends keyof AuditLeadFormState>(
    key: Key,
    value: AuditLeadFormState[Key]
  ) => {
    setLeadForm((current) => ({
      ...current,
      [key]: value
    }));
  };

  const submitAuditLead = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLeadSubmitError(null);
    setResultWarning(null);

    if (!leadForm.essentialConsent) {
      setLeadSubmitError(
        "Please agree to receive your audit result on this website and essential follow-up about this submission."
      );
      return;
    }

    setLeadSubmitting(true);

    try {
      const response = await fetch("/api/audit/lead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: leadForm.name,
          email: leadForm.email,
          businessName: leadForm.businessName,
          website: leadForm.website,
          essentialConsent: leadForm.essentialConsent,
          marketingEmailOptIn: leadForm.marketingEmailOptIn,
          score: totalScore,
          scorePercent: conversionRecommendation.scorePercent,
          resultType: recommendation.phase,
          recommendedTier: recommendation.tierName,
          recommendedPath: conversionRecommendation.recommendedPath,
          recommendedNextStep: conversionRecommendation.recommendedNextStep,
          answers: FOUNDER_AUDIT_QUESTIONS.map((question, index) => ({
            questionId: question.id,
            score: answers[index] ?? null
          })),
          strengths: areaSummary.strengths,
          weaknesses: areaSummary.weaknesses,
          sourcePath: window.location.pathname + window.location.search,
          source: auditEntryContext.source,
          topic: auditEntryContext.topic ?? ""
        })
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        fieldErrors?: Record<string, string[] | undefined>;
      };

      if (!response.ok) {
        const firstFieldError = data.fieldErrors
          ? Object.values(data.fieldErrors).flat().filter(Boolean)[0]
          : null;

        if (!firstFieldError) {
          const warning =
            "We could not save your audit details right now, but your result is shown below.";
          console.warn("audit-lead-save-failed", {
            status: response.status,
            error: data.error
          });
          setResultWarning(warning);
          setStage("result");
          return;
        }

        setLeadSubmitError(firstFieldError ?? data.error ?? "Unable to save your audit details.");
        return;
      }

      setStage("result");
    } catch (error) {
      console.warn("audit-lead-save-failed", error);
      setResultWarning(
        "We could not save your audit details right now, but your result is shown below."
      );
      setStage("result");
    } finally {
      setLeadSubmitting(false);
    }
  };

  if (stage === "intro") {
    return (
      <section className="public-hero-spacing relative overflow-hidden rounded-[2.05rem] border border-border/80 bg-card/60 shadow-panel">
        <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(32,74,138,0.28),transparent_24rem),radial-gradient(circle_at_78%_12%,rgba(215,180,107,0.12),transparent_18rem),linear-gradient(180deg,rgba(0,0,0,0.18),rgba(0,0,0,0.62))]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.38fr)] lg:items-end">
          <div className="max-w-4xl space-y-6">
            <p className="premium-kicker">Founder Audit</p>
            <div className="space-y-5">
              <h1 className="font-display text-4xl leading-[0.98] tracking-tight text-foreground sm:text-5xl lg:text-7xl">
                Use the Founder Audit as a strategic first step into the right room.
              </h1>
              <p className="max-w-3xl text-lg leading-relaxed text-white/80 sm:text-xl">
                Answer 10 focused questions and understand which level of business environment
                may fit your current stage best.
              </p>
              <p className="max-w-3xl text-sm leading-relaxed text-silver">
                This is not a full business diagnosis and it does not pretend to know everything
                about your company. It is a calm starting point for owners who want better context
                before joining.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => {
                  trackAnalyticsEvent(ANALYTICS_EVENTS.auditStart);
                  trackFounderAuditStarted(auditEntryContext);
                  window.bcnAnalytics?.collect?.({
                    eventName: "audit_started",
                    path: window.location.pathname + window.location.search,
                    metadata: auditEntryContext
                  });
                  setStage("questions");
                }}
                className={cn(buttonVariants({ variant: "default", size: "lg" }), "group")}
              >
                Start the audit
                <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
              </button>
              <p className="text-sm text-muted">Takes around 2 minutes.</p>
            </div>
          </div>

          <div className="rounded-[1.7rem] border border-gold/18 bg-background/24 p-5 shadow-panel-soft backdrop-blur">
            <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Clarity checkpoint</p>
            <div className="mt-4 grid gap-3">
              {["Direction", "Structure", "Momentum", "Room fit"].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-[1.1rem] border border-white/8 bg-card/42 px-4 py-3 text-sm text-silver"
                >
                  <span>{item}</span>
                  <CheckCircle2 size={15} className="text-gold/80" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (stage === "lead-capture") {
    return (
      <section className="public-hero-spacing-tight relative overflow-hidden rounded-[2.05rem] border border-gold/22 bg-gradient-to-br from-gold/10 via-card/72 to-card/60 shadow-gold-soft">
        <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(32,74,138,0.22),transparent_24rem),linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.58))]" />
        <div className="relative mx-auto max-w-3xl space-y-6">
          <div className="space-y-3">
            <p className="premium-kicker">Audit Result</p>
            <h1 className="font-display text-3xl leading-[1.04] tracking-tight text-foreground sm:text-5xl">
              Your recommendation is ready.
            </h1>
            <p className="text-base leading-relaxed text-white/80 sm:text-lg">
              Add your details to unlock the full on-site result now.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-background/24 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-silver">
                Score {conversionRecommendation.scorePercent}/100
              </span>
              <span className="rounded-full border border-gold/22 bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-gold">
                Recommended room: {recommendation.tierName}
              </span>
            </div>
          </div>

          {leadSubmitError ? (
            <p
              aria-live="polite"
              className="rounded-[1.1rem] border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100"
            >
              {leadSubmitError}
            </p>
          ) : null}

          <form
            onSubmit={submitAuditLead}
            className="rounded-[1.7rem] border border-white/10 bg-background/24 p-5 shadow-panel-soft backdrop-blur sm:p-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="audit-lead-name">Name</Label>
                <Input
                  id="audit-lead-name"
                  autoComplete="name"
                  required
                  value={leadForm.name}
                  onChange={(event) => updateLeadField("name", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="audit-lead-email">Email</Label>
                <Input
                  id="audit-lead-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={leadForm.email}
                  onChange={(event) => updateLeadField("email", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="audit-lead-business">Business name</Label>
                <Input
                  id="audit-lead-business"
                  autoComplete="organization"
                  required
                  value={leadForm.businessName}
                  onChange={(event) => updateLeadField("businessName", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="audit-lead-website">Website</Label>
                <Input
                  id="audit-lead-website"
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="https://"
                  value={leadForm.website}
                  onChange={(event) => updateLeadField("website", event.target.value)}
                />
              </div>
            </div>

            <div className="mt-5 space-y-3 rounded-[1.2rem] border border-white/10 bg-card/36 p-4">
              <label
                htmlFor="audit-lead-essential-consent"
                className="flex items-start gap-3 text-sm leading-relaxed text-foreground"
              >
                <input
                  id="audit-lead-essential-consent"
                  type="checkbox"
                  required
                  className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
                  checked={leadForm.essentialConsent}
                  onChange={(event) => updateLeadField("essentialConsent", event.target.checked)}
                />
                <span className="min-w-0">
                  I agree to receive my audit result on this website and essential follow-up about
                  this submission.
                </span>
              </label>

              <label
                htmlFor="audit-lead-marketing-consent"
                className="flex items-start gap-3 text-sm leading-relaxed text-foreground"
              >
                <input
                  id="audit-lead-marketing-consent"
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
                  checked={leadForm.marketingEmailOptIn}
                  onChange={(event) => updateLeadField("marketingEmailOptIn", event.target.checked)}
                />
                <span className="min-w-0">
                  Send me BCN updates, audit offers and business growth tips by email.
                </span>
              </label>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={goBack}
                className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "group")}
              >
                <ArrowLeft size={16} className="mr-2 transition-transform group-hover:-translate-x-1" />
                Back
              </button>
              <button
                type="submit"
                disabled={leadSubmitting}
                className={cn(buttonVariants({ variant: "default", size: "lg" }), "group")}
              >
                {leadSubmitting ? "Saving..." : "Show my audit result"}
                {leadSubmitting ? null : (
                  <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
                )}
              </button>
            </div>
          </form>
        </div>
      </section>
    );
  }

  if (stage === "result") {
    return (
      <section className="public-hero-spacing-tight relative overflow-hidden rounded-[2.05rem] border border-gold/22 bg-gradient-to-br from-gold/10 via-card/72 to-card/60 shadow-gold-soft">
        <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(32,74,138,0.22),transparent_24rem),linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.58))]" />
        <div className="relative space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <p className="premium-kicker">Audit Result</p>
              <span className="rounded-full border border-white/10 bg-background/24 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-silver">
                {conversionRecommendation.scorePercent}/100
              </span>
              <span className="rounded-full border border-gold/22 bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-gold">
                {recommendation.tierName}
              </span>
            </div>
            <button
              type="button"
              onClick={restartAudit}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-background/24 px-4 py-2 text-sm text-silver transition-colors hover:border-gold/24 hover:text-foreground"
            >
              <RotateCcw size={14} />
              Start again
            </button>
          </div>

          {resultWarning ? (
            <p
              aria-live="polite"
              className="rounded-[1.1rem] border border-gold/35 bg-gold/10 px-4 py-3 text-sm text-gold"
            >
              {resultWarning}
            </p>
          ) : null}

          <div
            id="audit-result-summary"
            className="grid gap-4 rounded-[1.55rem] border border-gold/22 bg-background/30 p-4 shadow-panel-soft sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.38fr)]"
          >
            <div className="min-w-0 space-y-3">
              <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Score summary</p>
              <div className="flex flex-wrap items-end gap-3">
                <p className="font-display text-5xl leading-none text-foreground sm:text-6xl">
                  {conversionRecommendation.scorePercent}
                </p>
                <p className="pb-1 text-sm uppercase tracking-[0.08em] text-silver">out of 100</p>
              </div>
              <h1 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
                {conversionRecommendation.scoreLabel}
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
                Raw audit score: {totalScore} of 30. Best membership path: {recommendation.tierName}.
              </p>
            </div>

            <div className="min-w-0 rounded-[1.2rem] border border-white/10 bg-card/42 p-4">
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
                Recommended path
              </p>
              <p className="mt-2 font-display text-2xl leading-tight text-foreground">
                {conversionRecommendation.recommendedPath}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {conversionRecommendation.recommendedNextStep}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {resultHighlights.map((highlight) => {
              const Icon = highlight.icon;

              return (
                <div
                  key={highlight.label}
                  className="min-w-0 rounded-[1.25rem] border border-white/10 bg-background/24 p-4 shadow-panel-soft"
                >
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-gold/10 text-gold">
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
                        {highlight.label}
                      </p>
                      <h2 className="mt-2 font-display text-xl leading-tight text-foreground">
                        {highlight.title}
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-muted">{highlight.copy}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-[1.45rem] border border-white/10 bg-background/24 p-4 shadow-panel-soft sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href={conversionRecommendation.membershipHref}
                onClick={() => {
                  trackFounderAuditMembershipClicked({
                    score: totalScore,
                    tier: recommendation.tierName,
                    href: conversionRecommendation.membershipHref
                  });
                  trackMembershipSelectedFromAudit({
                    score: totalScore,
                    tier: recommendation.tierName,
                    href: conversionRecommendation.membershipHref,
                    topic: auditEntryContext.topic
                  });
                  trackAnalyticsEvent(ANALYTICS_EVENTS.recommendedTierClicked, {
                    source: "audit",
                    score: totalScore,
                    scorePercent: conversionRecommendation.scorePercent,
                    tier: recommendation.tierName
                  });
                }}
                className={cn(
                  buttonVariants({ variant: "default", size: "lg" }),
                  "group w-full whitespace-normal text-center sm:w-auto"
                )}
              >
                Join The Business Circle
                <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
              </Link>

              <Link
                href={conversionRecommendation.circleCardHref}
                onClick={() => {
                  trackAnalyticsEvent(ANALYTICS_EVENTS.auditCtaClicked, {
                    source: "audit",
                    cta: "circle-card",
                    href: conversionRecommendation.circleCardHref,
                    score: totalScore,
                    scorePercent: conversionRecommendation.scorePercent
                  });
                }}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "w-full whitespace-normal text-center sm:w-auto"
                )}
              >
                <CreditCard size={16} className="mr-2" />
                Create or improve Circle Card
              </Link>

              <Link
                href={conversionRecommendation.growthArchitectHref}
                onClick={() => {
                  trackAnalyticsEvent(ANALYTICS_EVENTS.auditCtaClicked, {
                    source: "audit",
                    cta: "growth-architect",
                    href: conversionRecommendation.growthArchitectHref,
                    score: totalScore,
                    scorePercent: conversionRecommendation.scorePercent
                  });
                }}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "w-full whitespace-normal text-center sm:w-auto"
                )}
              >
                <LifeBuoy size={16} className="mr-2" />
                Book Growth Architect support
              </Link>

              <button
                type="button"
                onClick={() => {
                  trackAnalyticsEvent(ANALYTICS_EVENTS.auditCtaClicked, {
                    source: "audit",
                    cta: "save-result",
                    href: "print",
                    score: totalScore,
                    scorePercent: conversionRecommendation.scorePercent
                  });
                  window.print();
                }}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "w-full whitespace-normal text-center sm:w-auto"
                )}
              >
                <FileDown size={16} className="mr-2" />
                Save result
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="public-hero-spacing-tight relative overflow-hidden rounded-[2.05rem] border border-border/80 bg-card/60 shadow-panel">
      <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(32,74,138,0.24),transparent_24rem),linear-gradient(180deg,rgba(0,0,0,0.16),rgba(0,0,0,0.56))]" />
      <div className="relative mx-auto max-w-4xl space-y-7">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="premium-kicker">{formatQuestionPosition(currentIndex)}</p>
            <p className="text-sm text-muted">{completedCount} answered</p>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-background/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold via-silver to-foreground transition-[width] duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="space-y-5">
          <h1 className="font-display text-3xl leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {currentQuestion.question}
          </h1>
          <div className="grid gap-3">
            {currentQuestion.answers.map((answer, answerIndex) => {
              const selected = selectedScore === answer.score;

              return (
                <button
                  key={answer.label}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => selectAnswer(answer.score)}
                  className={cn(
                    "group relative flex min-h-[5.25rem] w-full items-center justify-between gap-4 overflow-hidden rounded-[1.35rem] border p-4 text-left shadow-panel-soft transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/35 sm:p-5",
                    selected
                      ? "border-gold/34 bg-gold/10 text-foreground"
                      : "border-white/10 bg-background/24 text-silver hover:-translate-y-0.5 hover:border-white/18 hover:bg-background/34"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-4">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-card/54 text-[11px] uppercase tracking-[0.08em] text-gold">
                      {String(answerIndex + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm leading-relaxed sm:text-base">{answer.label}</span>
                  </span>
                  <CheckCircle2
                    size={18}
                    className={cn("shrink-0 transition-opacity", selected ? "opacity-100 text-gold" : "opacity-0")}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={goBack}
            className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "group")}
          >
            <ArrowLeft size={16} className="mr-2 transition-transform group-hover:-translate-x-1" />
            Back
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={typeof selectedScore !== "number"}
            className={cn(buttonVariants({ variant: "default", size: "lg" }), "group")}
          >
            {currentIndex === totalQuestions - 1 ? "See recommendation" : "Next"}
            <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </section>
  );
}
