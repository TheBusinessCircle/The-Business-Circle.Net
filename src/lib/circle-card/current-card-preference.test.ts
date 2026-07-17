import { describe, expect, it } from "vitest";
import {
  buildCircleCardCurrentCardCookie,
  buildCircleCardCurrentCardCookieMigration,
  CIRCLE_CARD_CURRENT_CARD_COOKIE_PATH,
  CIRCLE_CARD_LEGACY_CURRENT_CARD_COOKIE_PATH,
  resolveCircleCardCurrentCardCookieValues
} from "@/lib/circle-card/current-card-preference";

describe("Circle Card current-card cookie paths", () => {
  it("uses a root path so both clean and legacy workspaces can read the preference", () => {
    expect(CIRCLE_CARD_CURRENT_CARD_COOKIE_PATH).toBe("/");
    expect(
      buildCircleCardCurrentCardCookie("card_123", CIRCLE_CARD_CURRENT_CARD_COOKIE_PATH, 60, true)
    ).toBe("circle_card_workspace_card=card_123; Path=/; Max-Age=60; SameSite=Lax; Secure");
  });

  it("retains the legacy path for explicit cleanup of older scoped cookies", () => {
    expect(CIRCLE_CARD_LEGACY_CURRENT_CARD_COOKIE_PATH).toBe("/dashboard/circle-card");
    expect(
      buildCircleCardCurrentCardCookie(
        "",
        CIRCLE_CARD_LEGACY_CURRENT_CARD_COOKIE_PATH,
        0,
        false
      )
    ).toContain("Path=/dashboard/circle-card; Max-Age=0");
  });

  it("removes a simultaneous legacy value before replacing the root value", () => {
    const cookieJar = new Map([
      [CIRCLE_CARD_LEGACY_CURRENT_CARD_COOKIE_PATH, "legacy-card"],
      [CIRCLE_CARD_CURRENT_CARD_COOKIE_PATH, "stale-root-card"]
    ]);
    const writes = buildCircleCardCurrentCardCookieMigration("current-card", true);

    for (const write of writes) {
      const path = /(?:^|; )Path=([^;]+)/.exec(write)?.[1];
      const maxAge = Number(/(?:^|; )Max-Age=([^;]+)/.exec(write)?.[1]);
      const value = /^[^=]+=([^;]*)/.exec(write)?.[1] ?? "";
      expect(path).toBeTruthy();
      expect(write).not.toContain("Domain=");
      expect(write).toContain("SameSite=Lax; Secure");

      if (maxAge === 0) {
        cookieJar.delete(path!);
      } else {
        cookieJar.set(path!, value);
      }
    }

    expect(cookieJar.get(CIRCLE_CARD_LEGACY_CURRENT_CARD_COOKIE_PATH)).toBeUndefined();
    expect(cookieJar.get(CIRCLE_CARD_CURRENT_CARD_COOKIE_PATH)).toBe("current-card");
  });

  it("prefers the root cookie when a legacy path cookie is sent first", () => {
    expect(
      resolveCircleCardCurrentCardCookieValues(["legacy-card", "current-card"])
    ).toBe("current-card");
    expect(resolveCircleCardCurrentCardCookieValues(["legacy-card"])).toBe(
      "legacy-card"
    );
  });
});
