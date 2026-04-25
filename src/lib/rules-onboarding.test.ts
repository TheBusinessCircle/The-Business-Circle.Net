import { describe, expect, it } from "vitest";
import { shouldShowRulesWelcomeOverlay } from "@/lib/rules-onboarding";

describe("rules onboarding trigger", () => {
  it("shows the welcome overlay for logged-in users who have not accepted BCN Rules", () => {
    expect(
      shouldShowRulesWelcomeOverlay({
        isLoggedIn: true,
        rulesAccepted: false
      })
    ).toBe(true);
  });

  it("does not show the welcome overlay once BCN Rules are accepted", () => {
    expect(
      shouldShowRulesWelcomeOverlay({
        isLoggedIn: true,
        rulesAccepted: true
      })
    ).toBe(false);
  });

  it("does not show the welcome overlay when there is no logged-in user", () => {
    expect(
      shouldShowRulesWelcomeOverlay({
        isLoggedIn: false,
        rulesAccepted: false
      })
    ).toBe(false);
  });
});
