import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Circle Card spin activation guidance", () => {
  it("keeps Spin To Connect copy and first-interaction state in the shared spin component", () => {
    const spin = readSource("src/components/circle-card/circle-card-spin-to-connect.tsx");

    expect(spin).toContain('const SPIN_TO_CONNECT_LABEL = "Spin To Connect"');
    expect(spin).toContain("CircleCardSpinActivationGuide");
    expect(spin).toContain("SPIN_INTERACTION_STORAGE_KEY");
    expect(spin).toContain("localStorage.setItem");
    expect(spin).toContain("circle-card-spin-profile-nudge");
    expect(spin).not.toContain("Spin My CC");
    expect(spin).not.toContain("Spin to connect");
  });

  it("keeps directional arrows and reduced-motion CSS available globally", () => {
    const guide = readSource("src/components/circle-card/circle-card-spin-activation-guide.tsx");
    const globals = readSource("src/app/globals.css");

    expect(guide).toContain("circle-card-spin-guide-arrow-left");
    expect(guide).toContain("circle-card-spin-guide-arrow-right");
    expect(guide).toContain("data-interacted");
    expect(globals).toContain("@keyframes circle-card-spin-guide-left");
    expect(globals).toContain("@keyframes circle-card-spin-guide-right");
    expect(globals).toContain("@keyframes circle-card-spin-profile-nudge");
    expect(globals).toContain(".circle-card-spin-profile-nudge");
    expect(globals).toContain("prefers-reduced-motion: reduce");
    expect(globals).toContain(".circle-card-spin-guide-arrow");
  });
});
