import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("profile form accent theme chooser structure", () => {
  it("keeps the mobile accent theme chooser collapsed while desktop remains expanded", () => {
    const source = readSource("src/components/platform/profile-form.tsx");

    expect(source).toContain("const [accentThemeOptionsOpen, setAccentThemeOptionsOpen] = useState(false)");
    expect(source).toContain("Accent Theme");
    expect(source).toContain("Personalise the look of your private workspace.");
    expect(source).toContain("Current: {selectedAccentThemeOption.label}");
    expect(source).toContain("Expand accent theme options");
    expect(source).toContain("Collapse accent theme options");
    expect(source).toContain('aria-controls="profile-accent-theme-options"');
    expect(source).toContain('id="profile-accent-theme-options"');
    expect(source).toContain('accentThemeOptionsOpen ? "block" : "hidden"');
    expect(source).toContain("md:block");
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
