import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

describe("authentication domain session boundary", () => {
  it("keeps Auth.js cookie defaults host-only", async () => {
    const cookieModuleUrl = pathToFileURL(
      join(process.cwd(), "node_modules/@auth/core/lib/utils/cookie.js")
    ).href;
    const { defaultCookies } = (await import(cookieModuleUrl)) as {
      defaultCookies: (secure: boolean) => Record<
        string,
        { name: string; options: Record<string, unknown> }
      >;
    };

    for (const cookie of Object.values(defaultCookies(true))) {
      expect(cookie.options).not.toHaveProperty("domain");
      expect(cookie.options).toMatchObject({
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: true
      });
    }
  });

  it("does not override Auth.js cookies with a cross-domain Domain attribute", () => {
    const config = readFileSync(
      join(process.cwd(), "src/lib/auth/config.ts"),
      "utf8"
    );
    const actions = readFileSync(
      join(process.cwd(), "src/actions/auth/auth.actions.ts"),
      "utf8"
    );

    expect(config).toContain('strategy: "jwt"');
    expect(config).not.toMatch(/\bcookies\s*:/);
    expect(config).not.toMatch(/\bdomain\s*:/i);
    expect(actions).toContain('signOut({ redirectTo: "/" })');
  });
});
