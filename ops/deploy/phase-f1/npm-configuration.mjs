import { execFileSync } from "node:child_process";
import {
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const NPM_CONFIG_SCHEMA = "phase-f1-trusted-npm-configuration-v1";
export const NPM_CONFIG_FILENAMES = Object.freeze({
  user: "user.npmrc",
  global: "global.npmrc"
});
export const TRUSTED_EMPTY_NPM_CONFIG = Buffer.from("\n", "utf8");

function assertSafeFile(path, { operational }) {
  const stats = lstatSync(path);
  if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1) {
    throw new Error("Trusted npm configuration source metadata is unsafe.");
  }
  if (!readFileSync(path).equals(TRUSTED_EMPTY_NPM_CONFIG)) {
    throw new Error("Trusted npm configuration source is not the approved empty content.");
  }
  if (operational &&
      (stats.uid !== 0 || stats.gid !== 0 || (stats.mode & 0o777) !== 0o444)) {
    throw new Error("Trusted npm configuration source ownership or mode is unsafe.");
  }
}

export function assertDistinctNpmConfigSources(userConfig, globalConfig) {
  if (resolve(userConfig) === resolve(globalConfig)) {
    throw new Error("Trusted npm user and global configuration sources must be distinct.");
  }
  return true;
}

export function verifyTrustedNpmConfiguration(root, { operational = false } = {}) {
  const requested = resolve(root);
  const rootStats = lstatSync(requested);
  if (!rootStats.isDirectory() || rootStats.isSymbolicLink() || realpathSync(requested) !== requested) {
    throw new Error("Trusted npm configuration root is unsafe or noncanonical.");
  }
  if (operational &&
      (rootStats.uid !== 0 || rootStats.gid !== 0 || (rootStats.mode & 0o777) !== 0o555)) {
    throw new Error("Trusted npm configuration root ownership or mode is unsafe.");
  }
  const expectedNames = Object.values(NPM_CONFIG_FILENAMES).sort();
  const names = readdirSync(requested).sort();
  if (JSON.stringify(names) !== JSON.stringify(expectedNames)) {
    throw new Error("Trusted npm configuration root contains an unexpected object.");
  }
  const userConfig = join(requested, NPM_CONFIG_FILENAMES.user);
  const globalConfig = join(requested, NPM_CONFIG_FILENAMES.global);
  assertDistinctNpmConfigSources(userConfig, globalConfig);
  assertSafeFile(userConfig, { operational });
  assertSafeFile(globalConfig, { operational });
  if (operational) {
    execFileSync("/usr/bin/sudo", ["-u", "phase-f1-build", "--", "/usr/bin/test", "-x", requested], {
      env: { HOME: "/var/lib/thebusinesscircle/build", PATH: "/usr/local/bin:/usr/bin:/bin" },
      stdio: "ignore"
    });
    for (const path of [userConfig, globalConfig]) {
      execFileSync("/usr/bin/sudo", ["-u", "phase-f1-build", "--", "/usr/bin/test", "-r", path], {
        env: { HOME: "/var/lib/thebusinesscircle/build", PATH: "/usr/local/bin:/usr/bin:/bin" },
        stdio: "ignore"
      });
    }
    for (const user of ["bcn-app", "circle-card-app"]) {
      for (const path of [requested, userConfig, globalConfig]) {
        execFileSync(
          "/usr/bin/sudo",
          ["-u", user, "--", "/usr/bin/test", "!", "-w", path],
          {
            env: { HOME: "/", PATH: "/usr/local/bin:/usr/bin:/bin" },
            stdio: "ignore"
          }
        );
      }
    }
  }
  return Object.freeze({
    schemaVersion: NPM_CONFIG_SCHEMA,
    userConfig,
    globalConfig,
    content: "APPROVED_EMPTY",
    ready: true
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, ...extras] = process.argv.slice(2);
  if (command !== "verify" || extras.length) {
    throw new Error("Usage: npm-configuration.mjs verify");
  }
  const root = join(dirname(fileURLToPath(import.meta.url)), "npm-config");
  verifyTrustedNpmConfiguration(root, { operational: true });
  process.stdout.write("TRUSTED_NPM_CONFIG_SOURCES_READY\n");
}
