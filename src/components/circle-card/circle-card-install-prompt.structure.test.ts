import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const promptSource = readFileSync(
  "src/components/circle-card/circle-card-install-prompt.tsx",
  "utf8"
);
const dashboardSource = readFileSync(
  "src/app/(member)/dashboard/circle-card/page.tsx",
  "utf8"
);

describe("Circle Card phone install experience", () => {
  it("keeps a compact prompt near the main actions and permanent help in Settings", () => {
    expect(dashboardSource).toContain("<CircleCardInstallPrompt showManualFallback />");
    expect(dashboardSource).toContain(
      '<CircleCardInstallPrompt variant="settings" showManualFallback />'
    );
    expect(promptSource).toContain("Add Circle Card to your phone");
    expect(promptSource).toContain("Maybe later");
    expect(promptSource).toContain("Install Circle Card");
  });

  it("detects supported device states without database or navigation side effects", () => {
    expect(promptSource).toContain('matchMedia("(display-mode: standalone)")');
    expect(promptSource).toContain("beforeinstallprompt");
    expect(promptSource).toContain("appinstalled");
    expect(promptSource).toContain("window.localStorage");
    expect(promptSource).toContain("crios|fxios|edgios");
    expect(promptSource).toContain("androidChrome");
    expect(promptSource).not.toContain("prisma");
    expect(promptSource).not.toContain("fetch(");
    expect(promptSource).not.toContain("router.refresh");
    expect(promptSource).not.toContain("location.reload");
  });

  it("provides plain iPhone and Android fallback instructions", () => {
    expect(promptSource).toContain("Tap the Share button in Safari.");
    expect(promptSource).toContain("Scroll and tap Add to Home Screen.");
    expect(promptSource).toContain("open this page in Safari to add it to your Home Screen");
    expect(promptSource).toContain("Tap Add to Home screen or Install app.");
    expect(promptSource).not.toContain(">PWA<");
    expect(promptSource).not.toContain("service worker");
  });
});
