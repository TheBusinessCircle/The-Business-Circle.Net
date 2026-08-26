import assert from "node:assert/strict";
import { chmodSync, chownSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
    assert.equal((source.match(/\/usr\/bin\/sudo --user=phase-f1-build \/usr\/bin\/env --chdir="\$\{workspace\}" -i/gu) ?? []).length, 2);
    assert.equal((source.match(/\/usr\/bin\/sudo --user=phase-f1-build \/usr\/bin\/env --chdir="\$\{workspace\}" -i[^\n]*\\\n(?:[^\n]*\\\n){1,4}\s*\/usr\/bin\/node "\$\{workspace\}\/node_modules\/vitest\/vitest\.mjs"/gu) ?? []).length, 2);
    assert.match(source, /fixture_parent=.*\$\{workspace_basename\}/u);
    assert.doesNotMatch(source, /fixture_parent=.*openssl rand/u);
    assert.doesNotMatch(source, /run src\/config\/rollback-immutable-runtime-cache\.test\.ts/u);
    assert.doesNotMatch(source, /(?:bash|sh) -c|\bcd\s+"?\$\{workspace\}|--chdir="?\$\{?(?:PWD|CWD)/u);
  });

  it("finds the approved relative filter from an unrelated caller cwd", () => {
    const repository = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));
    const root = mkdtempSync(join(tmpdir(), "phase-f1-vitest-root-")); roots.push(root);
    const unrelated = mkdtempSync(join(tmpdir(), "phase-f1-vitest-caller-")); roots.push(unrelated);
    const testPath = join(root, "src", "config", "rollback-immutable-runtime-cache.test.ts");
    mkdirSync(dirname(testPath), { recursive: true });
    writeFileSync(join(root, "package.json"), '{"name":"trusted-workspace"}\n');
    writeFileSync(join(root, "package-lock.json"), '{"name":"trusted-workspace","lockfileVersion":3}\n');
    const installedVitest = join(repository, "node_modules", "vitest", "vitest.mjs");
    let vitest = installedVitest;
    if (existsSync(installedVitest)) {
      const vitestImport = new URL("../../../node_modules/vitest/dist/index.js", import.meta.url).href;
      writeFileSync(testPath,
        `import { readFileSync } from "node:fs";\nimport { expect, it } from ${JSON.stringify(vitestImport)};\nit("trusted root",()=>{expect(process.cwd()).toBe(${JSON.stringify(root)});expect(JSON.parse(readFileSync("package.json","utf8")).name).toBe("trusted-workspace");expect(JSON.parse(readFileSync("package-lock.json","utf8")).lockfileVersion).toBe(3);});\n`);
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
if (realpathSync(workspace) !== workspace || process.cwd() !== workspace || !existsSync(join(workspace, filter))) process.exit(21);
if (!existsSync(join(workspace, "package.json")) || !existsSync(join(workspace, "package-lock.json"))) process.exit(22);
process.stdout.write("1 passed\\n");
`);
    }
    const result = spawnSync(process.execPath, [
      vitest, "run", "--root", root, "src/config/rollback-immutable-runtime-cache.test.ts"
    ], { cwd: root, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /1 passed/u);
    assert.notEqual(unrelated, root);
  });

  it("uses build-user env chdir on Linux root without sudo policy authority", {
    skip: process.platform !== "linux" || process.getuid?.() !== 0
  }, () => {
    const buildRoot = "/var/www/builds";
    assert.equal(existsSync(buildRoot), true);
    const uidResult = spawnSync("/usr/bin/id", ["-u", "phase-f1-build"], { encoding: "utf8" });
    const gidResult = spawnSync("/usr/bin/id", ["-g", "phase-f1-build"], { encoding: "utf8" });
    assert.equal(uidResult.status, 0); assert.equal(gidResult.status, 0);
    const uid = Number(uidResult.stdout.trim()), gid = Number(gidResult.stdout.trim());
    const root = mkdtempSync(join(buildRoot, "rollback-5d1f81bb05a01b08e1134785c2f86b77c8969fe3-cwd-test-")); roots.push(root);
    const unrelated = mkdtempSync(join(tmpdir(), "phase-f1-sudo-caller-")); roots.push(unrelated);
    writeFileSync(join(root, "package.json"), '{"name":"trusted-workspace"}\n');
    writeFileSync(join(root, "package-lock.json"), '{"name":"trusted-workspace","lockfileVersion":3}\n');
    chownSync(root, uid, gid); chmodSync(root, 0o750);
    for (const name of ["package.json", "package-lock.json"]) {
      chownSync(join(root, name), uid, gid); chmodSync(join(root, name), 0o440);
    }
    const proof = "const fs=require('node:fs');if(process.cwd()!==process.argv[1])process.exit(31);if(JSON.parse(fs.readFileSync('package.json')).name!=='trusted-workspace')process.exit(32);if(JSON.parse(fs.readFileSync('package-lock.json')).lockfileVersion!==3)process.exit(33);";
    const result = spawnSync("/usr/bin/sudo", [
      "--user=phase-f1-build", "/usr/bin/env", `--chdir=${root}`, "-i",
      "HOME=/var/lib/thebusinesscircle/build", "PATH=/usr/local/bin:/usr/bin:/bin",
      "/usr/bin/node", "-e", proof, root
    ], { cwd: unrelated, encoding: "utf8" });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  });
});
