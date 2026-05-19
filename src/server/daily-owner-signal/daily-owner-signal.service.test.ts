import { describe, expect, it } from "vitest";
import {
  getDailyOwnerSignalBackgroundKey,
  getDailyOwnerSignalExperience,
  getVisibleDailyOwnerSignals,
  millisecondsUntilNextDailyOwnerSignalRollover,
  toDailyOwnerSignalDateKey
} from "@/server/daily-owner-signal";

describe("daily owner signal service", () => {
  const referenceDate = new Date("2026-05-19T10:30:00.000Z");

  it("selects today's signal by the reference date", () => {
    const experience = getDailyOwnerSignalExperience(referenceDate);

    expect(experience.todayKey).toBe("2026-05-19");
    expect(experience.today.date).toBe("2026-05-19");
    expect(experience.today.status).toBe("PUBLISHED");
  });

  it("keeps visible signals chronological and hides future signals", () => {
    const visibleSignals = getVisibleDailyOwnerSignals(referenceDate);

    expect(visibleSignals).toHaveLength(61);
    expect(visibleSignals[0]?.date).toBe("2026-03-20");
    expect(visibleSignals.at(-1)?.date).toBe("2026-05-19");
    expect(visibleSignals.every((signal) => signal.date <= "2026-05-19")).toBe(true);
    expect(visibleSignals.every((signal) => signal.status === "PUBLISHED")).toBe(true);
  });

  it("creates a six-month scheduled content bank without exposing it as visible", () => {
    const experience = getDailyOwnerSignalExperience(referenceDate);

    expect(experience.scheduledBank).toHaveLength(183);
    expect(experience.scheduledBank[0]?.date).toBe("2026-05-20");
    expect(experience.scheduledBank[0]?.status).toBe("SCHEDULED");
    expect(experience.visibleSignals.some((signal) => signal.date === "2026-05-20")).toBe(false);
  });

  it("rotates backgrounds by weekday so the same day repeats weekly", () => {
    const tuesday = new Date("2026-05-19T12:00:00.000Z");
    const nextTuesday = new Date("2026-05-26T12:00:00.000Z");
    const wednesday = new Date("2026-05-20T12:00:00.000Z");

    expect(getDailyOwnerSignalBackgroundKey(tuesday)).toBe(
      getDailyOwnerSignalBackgroundKey(nextTuesday)
    );
    expect(getDailyOwnerSignalBackgroundKey(tuesday)).not.toBe(
      getDailyOwnerSignalBackgroundKey(wednesday)
    );
  });

  it("falls back to a valid date key and calculates midnight rollover timing", () => {
    expect(toDailyOwnerSignalDateKey(new Date("2026-12-31T23:59:59.000Z"))).toBe(
      "2026-12-31"
    );
    expect(millisecondsUntilNextDailyOwnerSignalRollover(new Date("2026-05-19T23:59:59.500Z"))).toBe(
      1500
    );
    expect(millisecondsUntilNextDailyOwnerSignalRollover(new Date("2026-05-19T12:00:00.000Z"))).toBe(
      43_201_000
    );
  });
});
