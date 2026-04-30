"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FOUNDER_AUDIT_QUESTIONS,
  calculateFounderAuditScore,
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
                Find the room that fits where your business is right now.
              </h1>
              <p className="max-w-3xl text-lg leading-relaxed text-white/80 sm:text-xl">
                Answer 10 focused questions and get a clear recommendation for where to start
                inside The Business Circle.
              </p>
              <p className="max-w-3xl text-sm leading-relaxed text-silver">
                This is not a test. It is a clarity checkpoint for business owners who want to make
                their next move with more direction.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => setStage("questions")}
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
      <section className="public-hero-spacing relative overflow-hidden rounded-[2.05rem] border border-gold/22 bg-gradient-to-br from-gold/10 via-card/72 to-card/60 shadow-gold-soft">
        <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(32,74,138,0.22),transparent_24rem),linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.58))]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.36fr)] lg:items-start">
          <div className="max-w-4xl space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <p className="premium-kicker">Audit Result</p>
              <span className="rounded-full border border-white/10 bg-background/24 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-silver">
                Score {totalScore} of 30
              </span>
            </div>
            <div className="space-y-5">
              <h1 className="font-display text-4xl leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                {recommendation.headline}
              </h1>
              <p className="max-w-3xl text-lg leading-relaxed text-white/82">
                {recommendation.summary}
              </p>
              <div className="rounded-[1.5rem] border border-white/10 bg-background/24 p-5">
                <p className="text-[11px] uppercase tracking-[0.08em] text-gold">
                  Recommended room
                </p>
                <p className="mt-3 text-base leading-relaxed text-silver">
                  {recommendation.tierFit}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href={recommendation.membershipHref}
                className={cn(
                  buttonVariants({ variant: "default", size: "lg" }),
                  "group w-full whitespace-normal text-center sm:w-auto"
                )}
              >
                {recommendation.primaryCta}
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
                href="/about"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "w-full whitespace-normal text-center sm:w-auto"
                )}
              >
                See how The Business Circle works
              </Link>
            </div>
          </div>

          <aside className="rounded-[1.7rem] border border-white/10 bg-background/24 p-5 shadow-panel-soft backdrop-blur">
            <p className="text-[11px] uppercase tracking-[0.08em] text-gold">{recommendation.phase}</p>
            <div className="mt-4 space-y-3">
              <p className="font-display text-3xl text-foreground">{recommendation.tierName}</p>
              <p className="text-sm leading-relaxed text-muted">
                Your recommendation is based on the answers you selected across clarity, structure,
                network, and readiness.
              </p>
              <button
                type="button"
                onClick={restartAudit}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-background/24 px-4 py-2 text-sm text-silver transition-colors hover:border-gold/24 hover:text-foreground"
              >
                <RotateCcw size={14} />
                Start again
              </button>
            </div>
          </aside>
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
