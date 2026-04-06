"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type JoinHeroStageProps = {
  primaryHref: string;
  secondaryHref: string;
  foundingSignal: string;
  showLoginLink: boolean;
};

const heroSupportPoints = [
  "Private member ecosystem",
  "Founder-led standard",
  "Real conversations and built-in calls"
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function JoinHeroStage({
  primaryHref,
  secondaryHref,
  foundingSignal,
  showLoginLink
}: JoinHeroStageProps) {
  const stageRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const stage = stageRef.current;

    if (!stage) {
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (reduceMotion.matches) {
      return;
    }

    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    let scrollShift = 0;

    const applyMotion = () => {
      frame = 0;

      stage.style.setProperty("--join-video-x", `${pointerX * -18}px`);
      stage.style.setProperty("--join-video-y", `${pointerY * -20 + scrollShift * -24}px`);
      stage.style.setProperty("--join-panel-left-x", `${pointerX * -10}px`);
      stage.style.setProperty("--join-panel-left-y", `${pointerY * -12 + scrollShift * 10}px`);
      stage.style.setProperty("--join-panel-right-x", `${pointerX * 12}px`);
      stage.style.setProperty("--join-panel-right-y", `${pointerY * 10 + scrollShift * -10}px`);
      stage.style.setProperty("--join-copy-x", `${pointerX * -8}px`);
      stage.style.setProperty("--join-copy-y", `${pointerY * 8 + scrollShift * -14}px`);
      stage.style.setProperty("--join-beam-x", `${pointerX * 26}px`);
    };

    const scheduleMotion = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(applyMotion);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;

      pointerX = clamp((x - 0.5) * 2, -1, 1);
      pointerY = clamp((y - 0.5) * 2, -1, 1);
      scheduleMotion();
    };

    const handlePointerLeave = () => {
      pointerX = 0;
      pointerY = 0;
      scheduleMotion();
    };

    const handleScroll = () => {
      const rect = stage.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 1;
      const midPoint = rect.top + rect.height / 2;

      scrollShift = clamp((midPoint - viewportHeight / 2) / viewportHeight, -1, 1);
      scheduleMotion();
    };

    handleScroll();
    applyMotion();

    stage.addEventListener("pointermove", handlePointerMove);
    stage.addEventListener("pointerleave", handlePointerLeave);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      stage.removeEventListener("pointermove", handlePointerMove);
      stage.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  return (
    <section
      ref={stageRef}
      className="join-hero-stage join-cinematic-shell relative isolate overflow-hidden rounded-[2.4rem] border border-white/10 px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10 xl:px-12 xl:py-12"
    >
      <div className="join-network-grid pointer-events-none absolute inset-0 opacity-45" />
      <div className="pointer-events-none absolute -left-20 top-12 h-56 w-56 rounded-full bg-gold/20 blur-[96px]" />
      <div className="pointer-events-none absolute -right-24 top-8 h-64 w-64 rounded-full bg-blue-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-48 w-[78%] -translate-x-1/2 rounded-full bg-sky-500/10 blur-[110px]" />

      <div className="relative space-y-8 sm:space-y-10">
        <div className="relative">
          <div className="join-stage-panel relative min-h-[24rem] overflow-hidden rounded-[2.15rem] border border-white/10 p-4 sm:min-h-[32rem] sm:p-6 lg:min-h-[41rem]">
            <div className="absolute inset-0 overflow-hidden">
              <video
                className="join-hero-video"
                style={{
                  transform:
                    "translate3d(var(--join-video-x, 0px), var(--join-video-y, 0px), 0) scale(1.04)"
                }}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                poster="/branding/the-business-circle-logo.webp"
                aria-hidden="true"
              >
                <source src="/branding/join-hero-atmosphere.mp4" type="video/mp4" />
              </video>
            </div>
            <div className="join-hero-video-film pointer-events-none absolute inset-0" />
            <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-[0.06]" />
            <div
              className="join-hero-scan pointer-events-none absolute inset-x-8 top-[48%] h-24 -translate-y-1/2 rounded-full blur-3xl"
              style={{ transform: "translate3d(var(--join-beam-x, 0px), -50%, 0)" }}
            />

            <div
              className="join-floating-panel absolute left-4 top-4 hidden max-w-[13rem] px-4 py-3 sm:block"
              style={{
                transform:
                  "translate3d(var(--join-panel-left-x, 0px), var(--join-panel-left-y, 0px), 0)"
              }}
            >
              <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Built with standards</p>
              <p className="mt-2 text-sm text-silver">
                A calmer room for owners who want signal, not noise.
              </p>
            </div>

            <div
              className="join-floating-panel absolute right-4 top-8 hidden max-w-[13rem] px-4 py-3 sm:block"
              style={{
                transform:
                  "translate3d(var(--join-panel-right-x, 0px), var(--join-panel-right-y, 0px), 0)"
              }}
            >
              <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Real connection</p>
              <p className="mt-2 text-sm text-silver">
                Calls and better conversations are built into the platform.
              </p>
            </div>

            <div
              className="join-stage-copy absolute inset-x-4 bottom-4 rounded-[1.5rem] border border-white/10 p-5 backdrop-blur-md sm:inset-x-6 sm:bottom-6 sm:max-w-[32rem]"
              style={{
                transform: "translate3d(var(--join-copy-x, 0px), var(--join-copy-y, 0px), 0)"
              }}
            >
              <p className="text-[11px] uppercase tracking-[0.08em] text-gold">
                A better room changes the way you move
              </p>
              <h2 className="mt-3 font-display text-2xl text-foreground">
                Clearer direction starts with the right environment.
              </h2>
              <p className="mt-3 max-w-xl text-sm text-muted">
                Built for serious business owners who want calmer thinking, better conversations,
                and momentum that holds.
              </p>
            </div>
          </div>

          <div className="join-scroll-cue mt-4 hidden items-center gap-2 text-xs uppercase tracking-[0.08em] text-silver/70 lg:inline-flex">
            <span>Scroll for the rooms and the entry point</span>
            <ArrowRight size={12} className="rotate-90" />
          </div>
        </div>

        <div className="mx-auto max-w-5xl space-y-6 px-1">
          <div className="space-y-5">
            <p className="premium-kicker">Private Growth Environment For Business Owners</p>
            <h1 className="max-w-4xl font-display text-4xl leading-[0.98] text-foreground sm:text-5xl lg:text-[4.15rem]">
              Stop building alone.
              <span className="mt-2 block text-silver">
                Enter the room where business owners move properly.
              </span>
            </h1>
            <p className="max-w-3xl text-base leading-relaxed text-silver sm:text-lg">
              The Business Circle is a founder-led room for business owners who want better
              conversations, clearer direction, and a stronger environment around the business.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href={primaryHref}>
              <Button
                size="lg"
                className="group min-w-[15rem] justify-center shadow-[0_18px_48px_rgba(214,180,103,0.2)]"
              >
                Join The Business Circle
                <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href={secondaryHref}>
              <Button
                size="lg"
                variant="outline"
                className="min-w-[12rem] justify-center border-white/15 bg-white/5 backdrop-blur"
              >
                Explore The Rooms
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap gap-3">
            {heroSupportPoints.map((point) => (
              <div
                key={point}
                className="join-floating-panel inline-flex items-center gap-3 rounded-full px-4 py-3 text-sm text-muted"
              >
                <CheckCircle2 size={15} className="shrink-0 text-gold" />
                <span>{point}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
            <span>{foundingSignal}</span>
            {showLoginLink ? (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-silver hover:text-foreground"
              >
                Already a member? Sign in
                <ArrowRight size={14} />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
