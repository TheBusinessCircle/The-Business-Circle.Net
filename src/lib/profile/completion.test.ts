import { describe, expect, it } from "vitest";
import { getProfileCompletion } from "@/lib/profile/completion";

describe("getProfileCompletion", () => {
  it("treats BCN Rules acceptance as a profile completion requirement", () => {
    const incomplete = getProfileCompletion({
      name: "Trevor Newton"
    });
    const complete = getProfileCompletion({
      name: "Trevor Newton",
      acceptedRulesAt: new Date("2026-04-25T10:00:00.000Z")
    });

    expect(incomplete.fields).toContainEqual({
      key: "acceptedRules",
      label: "BCN Rules Acceptance",
      complete: false
    });
    expect(complete.fields).toContainEqual({
      key: "acceptedRules",
      label: "BCN Rules Acceptance",
      complete: true
    });
  });

  it("counts a valid confirmed accent theme as a small profile completion item", () => {
    const incomplete = getProfileCompletion({
      name: "Trevor Newton",
      accentTheme: null
    });
    const complete = getProfileCompletion({
      name: "Trevor Newton",
      accentTheme: "royal-blue"
    });

    expect(incomplete.fields).toContainEqual({
      key: "accentTheme",
      label: "Choose your accent theme",
      complete: false
    });
    expect(complete.fields).toContainEqual({
      key: "accentTheme",
      label: "Choose your accent theme",
      complete: true
    });
  });
});
