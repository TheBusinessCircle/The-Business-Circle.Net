import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Circle Card schema verification script", () => {
  it("executes through tsx in CommonJS mode without top-level-await transforms", () => {
    const result = spawnSync(
      process.execPath,
      [
        resolve(process.cwd(), "node_modules/tsx/dist/cli.mjs"),
        resolve(process.cwd(), "scripts/verify-circle-card-schema.ts")
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: { ...process.env, DATABASE_URL: "" }
      }
    );
    const output = `${result.stdout}\n${result.stderr}`;

    expect(result.status).toBe(1);
    expect(output).toContain("Circle Card database schema verification failed. Error: DATABASE_URL is not set");
    expect(output).not.toContain("TransformError");
    expect(output).not.toContain("Top-level await");
    expect(output).not.toMatch(/postgres(?:ql)?:\/\//i);
  });
});
