"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Compass,
  DoorOpen,
  RotateCcw
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { FirstSevenDaysBlock } from "@/components/public/launch-cro-blocks";
import {
  ANALYTICS_EVENTS,
  trackAnalyticsEvent,
  trackFounderAuditCompleted,
  trackFounderAuditMembershipClicked,
  trackFounderAuditStarted
} from "@/lib/analytics";
import { cn } from "@/lib/utils";
import {
  FOUNDER_AUDIT_QUESTIONS,
  calculateFounderAuditScore,
  getFounderAuditBottleneck,
  getFounderAuditRecommendation
} from "./audit-data";

type AuditStage = "intro" | "questions" | "result";

const totalQuestions = FOUNDER_AUDIT_QUESTIONS.length;

function formatQuestionPosition(index: number) {
  return `Question ${index + 1} of ${totalQuestions}`;
}

export function FounderAuditClient() {
  const [stage, setStage] = useState<AuditStage>("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<number | undefined>>(
    () => Array.from({ length: totalQuestions }) as Array<number | undefined>
  );

  const currentQuestion = FOUNDER_AUDIT_QUESTIONS[currentIndex];
  const selectedScore = answers[currentIndex];
  const completedCount = answers.filter((score) => typeof score === "number").length;
  const progressPercent =
    stage === "result" ? 100 : Math.round(((currentIndex + 1) / totalQuestions) * 100);

  const totalScore = useMemo(
    () => calculateFounderAuditScore(answers.filter((score): score is number => typeof score === "number")),
    [answers]
  );
  const recommendation = getFounderAuditRecommendation(totalScore || totalQuestions);
  const bottleneck = useMemo(() => getFounderAuditBottleneck(answers), [answers]);

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
        tier: recommendation.tierName
      });
      trackFounderAuditCompleted({
        score: totalScore,
        tier: recommendation.tierName
      });
      setStage("result");
      return;
    }

    setCurrentIndex((index) => index + 1);
  };

  const goBack = () => {
    if (stage === "result") {
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
    setStage("intro");
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
                  trackFounderAuditStarted({ source: "audit" });
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
                Score {totalScore} of 30
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

          <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.43fr)] lg:items-start">
            <div className="min-w-0 space-y-5">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-gold/22 bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-gold">
                    Current phase
                  </span>
                  <span className="rounded-full border border-white/10 bg-background/24 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-silver">
                    Your next best room: {recommendation.tierName}
                  </span>
                </div>
                <h1 className="max-w-4xl font-display text-3xl leading-[1.02] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                  Based on your answers, your next best room is likely {recommendation.tierName}.
                </h1>
                <p className="max-w-3xl text-base leading-relaxed text-white/82 sm:text-lg">
                  {recommendation.summary} You can review the membership options before joining.
                </p>
              </div>

              <div className="rounded-[1.45rem] border border-gold/22 bg-background/30 p-4 shadow-panel-soft sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/24 bg-gold/10 text-gold">
                    <AlertTriangle size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-gold">
                      Likely bottleneck
                    </p>
                    <h2 className="mt-2 font-display text-2xl text-foreground">
                      {bottleneck.category}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {bottleneck.signal}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href={recommendation.membershipHref}
                  onClick={() => {
                    trackFounderAuditMembershipClicked({
                      score: totalScore,
                      tier: recommendation.tierName,
                      href: recommendation.membershipHref
                    });
                    trackAnalyticsEvent(ANALYTICS_EVENTS.recommendedTierClicked, {
                      source: "audit",
                      score: totalScore,
                      tier: recommendation.tierName
                    });
                  }}
                  className={cn(
                    buttonVariants({ variant: "default", size: "lg" }),
                    "group w-full whitespace-normal text-center sm:w-auto"
                  )}
                >
                  Review {recommendation.tierName} membership
                  <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/membership"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "w-full whitespace-normal text-center sm:w-auto"
                  )}
                >
                  Compare all tiers
                </Link>
                <Link
                  href="/home#how-it-works"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "lg" }),
                    "w-full whitespace-normal text-center sm:w-auto"
                  )}
                >
                  See how The Business Circle works
                </Link>
              </div>

              <p className="rounded-[1.1rem] border border-white/10 bg-background/22 px-4 py-3 text-sm leading-relaxed text-silver">
                If you are cautious, that is sensible. The audit is here to give direction, not
                pressure. Review the rooms, compare the tiers and only join when the fit is clear.
              </p>

              <div className="rounded-[1.45rem] border border-white/10 bg-background/24 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-card/54 text-silver">
                    <Compass size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
                      What this means
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">
                      {recommendation.phaseRisk}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <aside className="min-w-0 rounded-[1.7rem] border border-white/10 bg-background/24 p-5 shadow-panel-soft backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Recommended room</p>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="font-display text-3xl text-foreground">{recommendation.tierName}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{recommendation.tierFit}</p>
                </div>

                <div className="rounded-[1.2rem] border border-white/10 bg-card/42 p-4">
                  <div className="flex items-start gap-3">
                    <DoorOpen size={17} className="mt-0.5 shrink-0 text-gold" />
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
                        What changes
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-muted">
                        {recommendation.roomChange}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.2rem] border border-white/10 bg-card/42 p-4">
                  <div className="flex items-center gap-2">
                    <Clock3 size={16} className="text-gold" />
                    <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
                      First 7 days
                    </p>
                  </div>
                  <ol className="mt-3 space-y-2">
                    {recommendation.firstSevenDays.map((step, index) => (
                      <li key={step} className="flex gap-3 text-sm leading-relaxed text-muted">
                        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold/20 bg-gold/10 text-[11px] text-gold">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </aside>
          </div>

          <FirstSevenDaysBlock frame="panel" variant="audit" />
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
