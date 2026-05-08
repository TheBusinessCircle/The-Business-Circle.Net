import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {}
}));

import { getLaunchProfileCompletionState } from "@/server/admin/launch-command.service";

const updatedAt = new Date("2026-05-08T10:00:00Z");

describe("launch command centre service", () => {
  it("marks missing profiles as not started", () => {
    expect(getLaunchProfileCompletionState(null)).toBe("Not started");
  });

  it("marks partial profiles as in progress", () => {
    expect(
      getLaunchProfileCompletionState({
        bio: "Owner building with more focus.",
        location: null,
        experience: null,
        collaborationNeeds: null,
        collaborationOffers: null,
        accentTheme: null,
        updatedAt,
        business: {
          companyName: "BCN Studio",
          description: null,
          industry: null,
          services: null
        }
      })
    ).toBe("In progress");
  });

  it("marks complete launch profiles as complete", () => {
    expect(
      getLaunchProfileCompletionState({
        bio: "Owner building with more focus.",
        location: "London",
        experience: "Ten years",
        collaborationNeeds: "Clearer partnerships",
        collaborationOffers: "Strategy support",
        accentTheme: "gold",
        updatedAt,
        business: {
          companyName: "BCN Studio",
          description: "A focused strategy studio.",
          industry: "Consulting",
          services: "Strategy, positioning, growth"
        }
      })
    ).toBe("Complete");
  });
});
