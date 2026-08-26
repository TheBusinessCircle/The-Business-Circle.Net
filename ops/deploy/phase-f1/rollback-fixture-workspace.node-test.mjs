import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const roots = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("Phase F1 rollback fixture trusted workspace root", () => {
  it("binds both fixed Vitest invocations and fixture residue to the protected workspace", () => {
    const source = readFileSync(new URL("./prepare-rollback-fixture.sh", import.meta.url), "utf8");
    assert.equal((source.match(/run --root "\$\{workspace\}"/gu) ?? []).length, 2);
    assert.equal((source.match(/vitest\.mjs" run --root/gu) ?? []).length, 2);
    assert.ok((source.match(/src\/config\/rollback-immutable-runtime-cache\.test\.ts/gu) ?? []).length >= 2);
    assert.match(source, /workspace=\$\(\/usr\/bin\/node .*build-state\.mjs" inspect/u);
    assert.match(source, /workspace=\$\(realpath -e "\$\{workspace\}"\)/u);
    assert.match(source, /fixture_parent=.*\$\{workspace_basename\}/u);
    assert.doesNotMatch(source, /fixture_parent=.*openssl rand/u);
    assert.doesNotMatch(source, /run src\/config\/rollback-immutable-runtime-cache\.test\.ts/u);
  });

  it("finds the approved relative filter from an unrelated caller cwd", () => {
    const repository = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));
    const root = mkdtempSync(join(tmpdir(), "phase-f1-vitest-root-")); roots.push(root);
    const unrelated = mkdtempSync(join(tmpdir(), "phase-f1-vitest-caller-")); roots.push(unrelated);
    const testPath = join(root, "src", "config", "rollback-immutable-runtime-cache.test.ts");
    mkdirSync(dirname(testPath), { recursive: true });
    const installedVitest = join(repository, "node_modules", "vitest", "vitest.mjs");
    let vitest = installedVitest;
    if (existsSync(installedVitest)) {
      const vitestImport = new URL("../../../node_modules/vitest/dist/index.js", import.meta.url).href;
      writeFileSync(testPath,
        `import { expect, it } from ${JSON.stringify(vitestImport)};\nit("trusted root",()=>expect(true).toBe(true));\n`);
    } else {
      vitest = join(root, "node_modules", "vitest", "vitest.mjs");
      mkdirSync(dirname(vitest), { recursive: true });
      writeFileSync(testPath, "synthetic approved filter\n");
      writeFileSync(vitest, `
import { existsSync, realpathSync } from "node:fs";
import { isAbsolute, join } from "node:path";
const [command, option, workspace, filter, ...extra] = process.argv.slice(2);
const approved = "src/config/rollback-immutable-runtime-cache.test.ts";
if (command !== "run" || option !== "--root" || !isAbsolute(workspace) || filter !== approved || extra.length !== 0) process.exit(20);
if (realpathSync(workspace) !== workspace || process.cwd() === workspace || !existsSync(join(workspace, filter))) process.exit(21);
process.stdout.write("1 passed\\n");
`);
    }
    const result = spawnSync(process.execPath, [
      vitest, "run", "--root", root, "src/config/rollback-immutable-runtime-cache.test.ts"
    ], { cwd: unrelated, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /1 passed/u);
  });
});
