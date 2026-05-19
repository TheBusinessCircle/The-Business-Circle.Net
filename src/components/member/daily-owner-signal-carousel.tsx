"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { DailyOwnerSignalCard } from "@/components/member/daily-owner-signal-card";
import { Button } from "@/components/ui/button";
import type { DailyOwnerSignal } from "@/server/daily-owner-signal";

type DailyOwnerSignalCarouselProps = {
  signals: DailyOwnerSignal[];
  todayKey: string;
};

function getCardCentreOffset(container: HTMLDivElement, card: HTMLElement) {
  return card.offsetLeft - (container.clientWidth - card.clientWidth) / 2;
}

function millisecondsUntilNextDailyOwnerSignalRollover(now = new Date()) {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 1);
  return Math.max(1000, next - now.getTime());
}

export function DailyOwnerSignalCarousel({
  signals,
  todayKey
}: DailyOwnerSignalCarouselProps) {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [isAwayFromToday, setIsAwayFromToday] = useState(false);
  const todayIndex = useMemo(
    () => Math.max(0, signals.findIndex((signal) => signal.date === todayKey)),
    [signals, todayKey]
  );

  const scrollToToday = useCallback((behavior: ScrollBehavior = "smooth") => {
    const scroller = scrollerRef.current;
    const todayCard = scroller?.querySelector<HTMLElement>("[data-owner-signal-today='true']");

    if (!scroller || !todayCard) {
      return;
    }

    scroller.scrollTo({
      left: getCardCentreOffset(scroller, todayCard),
      behavior
    });
  }, []);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => scrollToToday("auto"));
    return () => window.cancelAnimationFrame(animationFrame);
  }, [scrollToToday, todayKey, signals.length]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    const updateAwayState = () => {
      const todayCard = scroller.querySelector<HTMLElement>("[data-owner-signal-today='true']");
      if (!todayCard) {
        setIsAwayFromToday(false);
        return;
      }

      const todayOffset = getCardCentreOffset(scroller, todayCard);
      setIsAwayFromToday(scroller.scrollLeft < todayOffset - 80);
    };

    updateAwayState();
    scroller.addEventListener("scroll", updateAwayState, { passive: true });
    window.addEventListener("resize", updateAwayState);

    return () => {
      scroller.removeEventListener("scroll", updateAwayState);
      window.removeEventListener("resize", updateAwayState);
    };
  }, [todayKey]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      router.refresh();
      window.requestAnimationFrame(() => scrollToToday("smooth"));
    }, millisecondsUntilNextDailyOwnerSignalRollover(new Date()));

    return () => window.clearTimeout(timeout);
  }, [router, scrollToToday]);

  if (!signals.length) {
    return null;
  }

  return (
    <section
      data-daily-owner-signal-carousel
      className="relative overflow-hidden rounded-[1.75rem] border border-silver/14 bg-[#05070d] py-5 shadow-panel-soft sm:py-6"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(212,175,55,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_34%)]" />
      <div className="relative px-5 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-gold">
              Daily Owner Signals
            </p>
            <h2 className="mt-2 font-display text-2xl text-foreground sm:text-3xl">
              A quieter read on today
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted">
            A short founder recalibration for the day in front of you.
          </p>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="relative mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-5 pb-5 pt-2 [scrollbar-width:none] sm:gap-5 sm:px-6 [&::-webkit-scrollbar]:hidden"
      >
        {signals.map((signal, index) => (
          <DailyOwnerSignalCard
            key={signal.id}
            signal={signal}
            isToday={index === todayIndex}
          />
        ))}
      </div>

      {isAwayFromToday ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
          <Button
            type="button"
            variant="outline"
            className="pointer-events-auto border-gold/32 bg-background/80 text-gold shadow-[0_18px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl"
            onClick={() => scrollToToday("smooth")}
          >
            <RotateCcw size={15} className="mr-1" />
            Back to Today
          </Button>
        </div>
      ) : null}
    </section>
  );
}
