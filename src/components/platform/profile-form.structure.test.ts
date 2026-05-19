import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("profile form accent theme chooser structure", () => {
  it("keeps the accent theme chooser collapsed on every screen size", () => {
    const source = readSource("src/components/platform/profile-form.tsx");

    expect(source).toContain("const [accentThemeOptionsOpen, setAccentThemeOptionsOpen] = useState(false)");
    expect(source).toContain("profile-form-shell member-accent-theme relative");
    expect(source).toContain("xl:grid-cols-[320px_minmax(0,1fr)]");
    expect(source).toContain("profile-form-main w-full max-w-full min-w-0");
    expect(source).toContain("Profile colour");
    expect(source).toContain("Current theme: {selectedAccentThemeOption.label}");
    expect(source).toContain('Workspace Atmosphere: {workspaceAtmosphereEnabled ? "On" : "Off"}');
    expect(source).toContain("Expand profile colour options");
    expect(source).toContain("Collapse profile colour options");
    expect(source).toContain('aria-controls="profile-accent-theme-options"');
    expect(source).toContain('id="profile-accent-theme-options"');
    expect(source).toContain('accentThemeOptionsOpen ? "block" : "hidden"');
    expect(source).not.toContain("md:mt-5 md:block");
    expect(source).not.toContain("focus-visible:ring-[hsl(var(--member-accent-soft)/0.75)] md:hidden");
  });

  it("keeps the existing member accent theme explainer inside the expanded chooser", () => {
    const source = readSource("src/components/platform/profile-form.tsx");

    expect(source).toContain("Member Accent Theme");
    expect(source).toContain("Personalise Your Member Space");
    expect(source).toContain("Choose the accent theme that best fits how you want your member profile and workspace to feel.");
  });

  it("keeps existing accent theme form wiring and save fields intact", () => {
    const source = readSource("src/components/platform/profile-form.tsx");

    expect(source).toContain('form.register("accentTheme")');
    expect(source).toContain('form.register("workspaceAtmosphereEnabled")');
    expect(source).toContain("selectAccentTheme(theme.value)");
    expect(source).toContain("applyWorkspaceAtmosphere(theme.value)");
    expect(source).toContain('payload.set(key, typeof value === "boolean" ? String(value) : value ?? "")');
    expect(source).toContain('fetch("/api/profile"');
  });
});
