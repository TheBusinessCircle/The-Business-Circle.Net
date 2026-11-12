import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const page = readFileSync(fileURLToPath(new URL("./page.tsx", import.meta.url)), "utf8");
const catalog = readFileSync(fileURLToPath(new URL("../../../../../components/circle-card/circle-card-my-tools-catalog.tsx", import.meta.url)), "utf8");

describe("Circle Card My Tools Pro hub", () => {
  it("derives access from the authenticated server billing access snapshot", () => {
    expect(page).toContain("loadCircleCardAccessForUser(session.user.id)");
    expect(page).toContain("const hasPro = access.hasProAccess");
    expect(page).toContain("requireCircleCardUser()");
    expect(page).toContain("<CircleCardMyToolsCatalog hasPro={hasPro}");
  });

  it("filters creator and business tools while allowing either category", () => {
    expect(catalog).toContain('category: "Creators"');
    expect(catalog).toContain('category: "Business"');
    expect(catalog).toContain('setCategory(option)');
    expect(catalog).toContain('aria-pressed={category === option}');
  });

  it("does not expose Pro tool actions to Free users", () => {
    expect(catalog).toContain('hasPro ? <Link href={tool.href}');
    expect(catalog).toContain('<Link href={upgradeHref}');
    expect(catalog).toContain('LockKeyhole');
  });

  it("leaves core free wallet and scanning separate from Pro tools", () => {
    expect(page).toContain("wallet, scanning and normal contact sharing remain accessible");
  });
});
