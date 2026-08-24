import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  chownSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, it } from "node:test";
import {
  assertDistinctNpmConfigSources,
  NPM_CONFIG_FILENAMES,
  TRUSTED_EMPTY_NPM_CONFIG,
  verifyTrustedNpmConfiguration
} from "./npm-configuration.mjs";

const packRoot = dirname(fileURLToPath(import.meta.url));
const roots = [];
const fixture = () => {
  const root = mkdtempSync(join(tmpdir(), "phase-f1-npm-config-"));
  roots.push(root);
  for (const name of Object.values(NPM_CONFIG_FILENAMES)) {
    writeFileSync(join(root, name), TRUSTED_EMPTY_NPM_CONFIG, { flag: "wx" });
    chmodSync(join(root, name), 0o444);
  }
  chmodSync(root, 0o555);
  return root;
};
afterEach(() => {
  for (const root of roots.splice(0)) {
    chmodSync(root, 0o755);
    for (const name of Object.values(NPM_CONFIG_FILENAMES)) {
      try { chmodSync(join(root, name), 0o644); } catch {}
    }
    rmSync(root, { recursive: true, force: true });
  }
});

describe("Phase F1 trusted npm configuration", () => {
  it("accepts only two distinct deterministic empty sources", () => {
    const root = fixture();
    const result = verifyTrustedNpmConfiguration(root);
    assert.equal(result.ready, true);
    assert.equal(result.content, "APPROVED_EMPTY");
    assert.notEqual(result.userConfig, result.globalConfig);
    assert.equal(assertDistinctNpmConfigSources(result.userConfig, result.globalConfig), true);
    assert.throws(() => assertDistinctNpmConfigSources(result.userConfig, result.userConfig), /distinct/u);
  });

  it("rejects symlinks, hard links, extras and non-empty configuration", () => {
    if (process.platform !== "win32") {
      const symlinkRoot = fixture();
      unlinkSync(join(symlinkRoot, NPM_CONFIG_FILENAMES.user));
      symlinkSync(join(symlinkRoot, NPM_CONFIG_FILENAMES.global), join(symlinkRoot, NPM_CONFIG_FILENAMES.user));
      assert.throws(() => verifyTrustedNpmConfiguration(symlinkRoot), /metadata/u);
    }

    const hardLinkRoot = fixture();
    chmodSync(hardLinkRoot, 0o755);
    unlinkSync(join(hardLinkRoot, NPM_CONFIG_FILENAMES.user));
    linkSync(join(hardLinkRoot, NPM_CONFIG_FILENAMES.global), join(hardLinkRoot, NPM_CONFIG_FILENAMES.user));
    chmodSync(hardLinkRoot, 0o555);
    assert.throws(() => verifyTrustedNpmConfiguration(hardLinkRoot), /metadata/u);

    const extraRoot = fixture();
    chmodSync(extraRoot, 0o755);
    writeFileSync(join(extraRoot, "unexpected.npmrc"), "\n");
    chmodSync(extraRoot, 0o555);
    assert.throws(() => verifyTrustedNpmConfiguration(extraRoot), /unexpected object/u);

    const contentRoot = fixture();
    chmodSync(contentRoot, 0o755);
    chmodSync(join(contentRoot, NPM_CONFIG_FILENAMES.user), 0o644);
    writeFileSync(join(contentRoot, NPM_CONFIG_FILENAMES.user), "_authToken=REJECTED_FIXTURE\n");
    chmodSync(join(contentRoot, NPM_CONFIG_FILENAMES.user), 0o444);
    chmodSync(contentRoot, 0o555);
    assert.throws(() => verifyTrustedNpmConfiguration(contentRoot), /approved empty/u);
  });

  it("rejects unsafe operational ownership and modes", {
    skip: process.platform !== "linux" || process.getuid?.() !== 0
  }, () => {
    const modeRoot = fixture();
    chmodSync(join(modeRoot, NPM_CONFIG_FILENAMES.user), 0o644);
    assert.throws(
      () => verifyTrustedNpmConfiguration(modeRoot, { operational: true }),
      /ownership or mode/u
    );

    const ownerRoot = fixture();
    chownSync(join(ownerRoot, NPM_CONFIG_FILENAMES.user), 65534, 0);
    assert.throws(
      () => verifyTrustedNpmConfiguration(ownerRoot, { operational: true }),
      /ownership or mode/u
    );
  });

  it("binds every npm invocation to fixed sources under an empty environment", () => {
    const scripts = [
      "prepare-offline-npm-cache.sh",
      "prepare-rollback-fixture.sh",
      "build-release.sh"
    ].map((name) => readFileSync(join(packRoot, name), "utf8"));
    for (const source of scripts) {
      assert.match(source, /require_trusted_npm_config_sources/u);
      assert.match(source, /sudo -u phase-f1-build env -i/u);
      assert.match(source, /NPM_CONFIG_USERCONFIG="\$\{PHASE_F1_NPM_USER_CONFIG\}"/u);
      assert.match(source, /NPM_CONFIG_GLOBALCONFIG="\$\{PHASE_F1_NPM_GLOBAL_CONFIG\}"/u);
      assert.doesNotMatch(source, /NPM_CONFIG_(?:USERCONFIG|GLOBALCONFIG)=\/dev\/null/u);
    }
    const preparation = scripts[0];
    assert.match(preparation, /NPM_CONFIG_CACHE="\$\{promotion\}"/u);
    assert.match(preparation, /NPM_CONFIG_REGISTRY=https:\/\/registry\.npmjs\.org\//u);
    assert.match(preparation, /--ignore-scripts --no-audit --no-fund/u);
    assert.doesNotMatch(preparation, /NPM_TOKEN|NODE_AUTH_TOKEN|npm (?:update|audit fix)/u);
  });

  it("refuses caller-selected operational paths", () => {
    const executable = join(packRoot, "npm-configuration.mjs");
    const result = spawnSync(process.execPath, [executable, "verify", fixture()], {
      encoding: "utf8",
      env: { PATH: process.env.PATH || "" }
    });
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}${result.stderr}`, /Usage/u);
  });

  it("is accepted by npm 10.9.7 without resolving ambient configuration", { skip: process.platform !== "linux" }, () => {
    const version = execFileSync("npm", ["--version"], { encoding: "utf8" }).trim();
    if (version !== "10.9.7") return;
    const root = fixture();
    chmodSync(root, 0o755);
    const untrustedHome = join(root, "untrusted-home");
    mkdirSync(untrustedHome, { mode: 0o700 });
    writeFileSync(join(untrustedHome, ".npmrc"), "registry=https://ambient.invalid/\ncache=/ambient-cache\n");
    chmodSync(root, 0o555);
    const environment = {
      HOME: untrustedHome,
      PATH: "/usr/local/bin:/usr/bin:/bin",
      NPM_CONFIG_USERCONFIG: join(root, NPM_CONFIG_FILENAMES.user),
      NPM_CONFIG_GLOBALCONFIG: join(root, NPM_CONFIG_FILENAMES.global),
      NPM_CONFIG_CACHE: join(root, "cache"),
      NPM_CONFIG_REGISTRY: "https://registry.npmjs.org/"
    };
    const result = spawnSync("npm", ["config", "list", "--json"], {
      encoding: "utf8",
      env: environment
    });
    assert.equal(result.status, 0);
    const config = JSON.parse(result.stdout);
    assert.equal(config.userconfig, environment.NPM_CONFIG_USERCONFIG);
    assert.equal(config.globalconfig, environment.NPM_CONFIG_GLOBALCONFIG);
    assert.equal(config.cache, environment.NPM_CONFIG_CACHE);
    assert.equal(config.registry, environment.NPM_CONFIG_REGISTRY);
    assert.doesNotMatch(result.stderr, /double-loading config/u);

    const collision = spawnSync("npm", ["--version"], {
      encoding: "utf8",
      env: {
        ...environment,
        NPM_CONFIG_USERCONFIG: "/dev/null",
        NPM_CONFIG_GLOBALCONFIG: "/dev/null"
      }
    });
    assert.notEqual(collision.status, 0);
    assert.match(collision.stderr, /double-loading config/u);
  });
});
