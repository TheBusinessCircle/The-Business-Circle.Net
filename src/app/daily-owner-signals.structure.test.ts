import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("daily owner signals dashboard structure", () => {
  it("integrates the carousel near the top of the member dashboard", () => {
    const dashboard = readSource("src/app/(member)/dashboard/page.tsx");

    expect(dashboard).toContain("getDailyOwnerSignalExperience");
    expect(dashboard).toContain("dailyOwnerSignalExperience.visibleSignals");
    expect(dashboard).toContain("DailyOwnerSignalCarousel");
    expect(dashboard.indexOf("DailyOwnerSignalCarousel")).toBeLessThan(
      dashboard.indexOf("{onboardingExperience ?")
    );
  });

  it("wires the premium carousel behaviour and back-to-today control", () => {
    const carousel = readSource("src/components/member/daily-owner-signal-carousel.tsx");

    expect(carousel).toContain("data-daily-owner-signal-carousel");
    expect(carousel).toContain("snap-x snap-mandatory");
    expect(carousel).toContain("scrollToToday");
    expect(carousel).toContain("Back to Today");
    expect(carousel).toContain("Return to today's owner signal");
    expect(carousel).toContain("requestAnimationFrame(() => scrollToToday(\"auto\"))");
    expect(carousel).toContain("router.refresh()");
    expect(carousel).toContain("millisecondsUntilNextDailyOwnerSignalRollover");
    expect(carousel).not.toContain("infinite");
  });

  it("adds bounded past navigation without forward access beyond today", () => {
    const carousel = readSource("src/components/member/daily-owner-signal-carousel.tsx");

    expect(carousel).toContain("Show previous owner signal");
    expect(carousel).toContain("Show next visible owner signal");
    expect(carousel).toContain("Math.min(Math.max(index, 0), todayIndex)");
    expect(carousel).toContain("disabled={activeIndex >= todayIndex}");
    expect(carousel).toContain("activeIndex < todayIndex");
    expect(carousel).toContain("Future signals stay hidden until their day arrives.");
  });

  it("supports keyboard navigation and reduced motion preferences", () => {
    const carousel = readSource("src/components/member/daily-owner-signal-carousel.tsx");

    expect(carousel).toContain("tabIndex={0}");
    expect(carousel).toContain('event.key === "ArrowLeft"');
    expect(carousel).toContain('event.key === "ArrowRight"');
    expect(carousel).toContain("prefers-reduced-motion: reduce");
    expect(carousel).toContain("motion-reduce:scroll-auto");
  });

  it("keeps cards short, cinematic, responsive, and anchored to today", () => {
    const card = readSource("src/components/member/daily-owner-signal-card.tsx");

    expect(card).toContain("data-owner-signal-card");
    expect(card).toContain("data-owner-signal-today");
    expect(card).toContain("w-[calc(100vw-2rem)]");
    expect(card).toContain("sm:w-[28rem]");
    expect(card).toContain("bg-[linear-gradient(180deg,rgba(2,6,23,0.26),rgba(2,6,23,0.72)_52%,rgba(2,6,23,0.9))]");
    expect(card).toContain("shadow-[0_26px_100px_rgba(212,175,55,0.2)]");
    expect(card).toContain("Today's Owner Signal");
    expect(card).toContain("Previous Signal");
    expect(card).toContain("focus-visible:ring-2");
  });
});
