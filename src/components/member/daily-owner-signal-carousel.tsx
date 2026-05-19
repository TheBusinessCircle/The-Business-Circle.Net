"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
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

function resolveScrollBehavior(behavior: ScrollBehavior) {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return "auto";
  }

  return behavior;
}

export function DailyOwnerSignalCarousel({
  signals,
  todayKey
}: DailyOwnerSignalCarouselProps) {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [isAwayFromToday, setIsAwayFromToday] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const todayIndex = useMemo(
    () => Math.max(0, signals.findIndex((signal) => signal.date === todayKey)),
    [signals, todayKey]
  );

  const scrollToSignalIndex = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const scroller = scrollerRef.current;
    const cards = scroller?.querySelectorAll<HTMLElement>("[data-owner-signal-card]");
    const clampedIndex = Math.min(Math.max(index, 0), todayIndex);
    const targetCard = cards?.[clampedIndex];

    if (!scroller || !targetCard) {
      return;
    }

    scroller.scrollTo({
      left: getCardCentreOffset(scroller, targetCard),
      behavior: resolveScrollBehavior(behavior)
    });
    setActiveIndex(clampedIndex);
  }, [todayIndex]);

  const scrollToToday = useCallback(
    (behavior: ScrollBehavior = "smooth") => scrollToSignalIndex(todayIndex, behavior),
    [scrollToSignalIndex, todayIndex]
  );

  const scrollToPreviousSignal = useCallback(() => {
    scrollToSignalIndex(activeIndex - 1);
  }, [activeIndex, scrollToSignalIndex]);

  const scrollToNextVisibleSignal = useCallback(() => {
    scrollToSignalIndex(Math.min(activeIndex + 1, todayIndex));
  }, [activeIndex, scrollToSignalIndex, todayIndex]);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => scrollToToday("auto"));
    return () => window.cancelAnimationFrame(animationFrame);
  }, [scrollToToday, todayKey, signals.length]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    const updateScrollState = () => {
      const todayCard = scroller.querySelector<HTMLElement>("[data-owner-signal-today='true']");
      const cards = Array.from(scroller.querySelectorAll<HTMLElement>("[data-owner-signal-card]"));
      if (!todayCard) {
        setIsAwayFromToday(false);
        return;
      }

      const todayOffset = getCardCentreOffset(scroller, todayCard);
      setIsAwayFromToday(scroller.scrollLeft < todayOffset - 80);

      const scrollerCentre = scroller.scrollLeft + scroller.clientWidth / 2;
      const closestIndex = cards.reduce((closest, card, index) => {
        const cardCentre = card.offsetLeft + card.clientWidth / 2;
        const closestCard = cards[closest];
        const closestCentre = closestCard.offsetLeft + closestCard.clientWidth / 2;
        return Math.abs(cardCentre - scrollerCentre) < Math.abs(closestCentre - scrollerCentre)
          ? index
          : closest;
      }, 0);
      setActiveIndex(Math.min(closestIndex, todayIndex));
    };

    updateScrollState();
    scroller.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      scroller.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [todayIndex, todayKey]);

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
      className="relative overflow-hidden rounded-[1.55rem] border border-silver/14 bg-[#05070d] py-4 shadow-panel-soft sm:rounded-[1.75rem] sm:py-6"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(212,175,55,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_34%)]" />
      <div className="relative px-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
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

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-muted">
            Swipe left for previous days. Future signals stay hidden until their day arrives.
          </p>
          <div className="hidden items-center gap-2 md:flex">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Show previous owner signal"
              disabled={activeIndex <= 0}
              className="border-silver/18 bg-background/38 text-silver disabled:opacity-35"
              onClick={scrollToPreviousSignal}
            >
              <ChevronLeft size={15} className="mr-1" />
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Show next visible owner signal"
              disabled={activeIndex >= todayIndex}
              className="border-silver/18 bg-background/38 text-silver disabled:opacity-35"
              onClick={scrollToNextVisibleSignal}
            >
              Next
              <ChevronRight size={15} className="ml-1" />
            </Button>
          </div>
        </div>
      </div>

      <div
        ref={scrollerRef}
        aria-label="Daily Owner Signals. Scroll backwards to review previous days."
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            scrollToPreviousSignal();
          }

          if (event.key === "ArrowRight" && activeIndex < todayIndex) {
            event.preventDefault();
            scrollToNextVisibleSignal();
          }
        }}
        className="relative mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-6 pt-2 [scrollbar-width:none] motion-reduce:scroll-auto sm:mt-5 sm:gap-5 sm:px-6 [&::-webkit-scrollbar]:hidden"
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
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center sm:bottom-5">
          <Button
            type="button"
            variant="outline"
            aria-label="Return to today's owner signal"
            className="pointer-events-auto border-gold/38 bg-background/88 text-gold shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl"
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
