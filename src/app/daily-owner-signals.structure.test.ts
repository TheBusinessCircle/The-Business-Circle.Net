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
    expect(carousel).toContain("router.refresh()");
    expect(carousel).toContain("millisecondsUntilNextDailyOwnerSignalRollover");
    expect(carousel).not.toContain("infinite");
  });

  it("keeps cards short, cinematic, responsive, and anchored to today", () => {
    const card = readSource("src/components/member/daily-owner-signal-card.tsx");

    expect(card).toContain("data-owner-signal-card");
    expect(card).toContain("data-owner-signal-today");
    expect(card).toContain("w-[86vw]");
    expect(card).toContain("sm:w-[28rem]");
    expect(card).toContain("shadow-[0_24px_90px_rgba(212,175,55,0.18)]");
    expect(card).toContain("Today");
    expect(card).toContain("Archive");
  });
});
