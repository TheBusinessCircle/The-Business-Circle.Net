import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pagePath = fileURLToPath(new URL("./page.tsx", import.meta.url));
const source = readFileSync(pagePath, "utf8");

describe("Circle Card My Tools Pro hub", () => {
  it("derives access from the server billing access snapshot", () => {
    expect(source).toContain("loadCircleCardAccessForUser(session.user.id)");
    expect(source).toContain("const hasPro = access.hasProAccess");
    expect(source).toContain("requireCircleCardUser()");
  });

  it("makes both creator and business tools discoverable", () => {
    expect(source).toContain('category: "Creators"');
    expect(source).toContain('category: "Business"');
    expect(source).toContain('href="#creators"');
    expect(source).toContain('href="#business"');
  });

  it("offers an upgrade rather than a tool action to Free members", () => {
    expect(source).toContain('hasPro ? <Link href={tool.href}');
    expect(source).toContain('<Link href={upgradeHref}');
    expect(source).toContain('LockKeyhole');
  });

  it("leaves the existing free scanner and wallet intact", () => {
    expect(source).toContain("wallet, scanning and normal contact sharing remain accessible");
  });
});
