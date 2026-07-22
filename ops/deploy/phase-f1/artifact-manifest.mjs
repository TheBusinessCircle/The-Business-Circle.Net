import { createHash } from "node:crypto";
import {
  lstatSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { execFileSync } from "node:child_process";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

function sha(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalized(path) {
  return path.split(sep).join("/");
}

function atomicWrite(path, body) {
  if (existsSync(path)) throw new Error(`Refusing to replace an existing manifest: ${path}`);
  const temporaryRoot = mkdtempSync(join(dirname(path), `.${basename(path)}.`));
  const temporary = join(temporaryRoot, "manifest.tmp");
  try {
    writeFileSync(temporary, body, { encoding: "utf8", mode: 0o600, flag: "wx" });
    renameSync(temporary, path);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

function inventory(root, excluded) {
  const canonicalRoot = realpathSync(root);
  const exclusions = excluded.map((entry) => entry.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, ""));
  const rows = [];
  function isExcluded(path) {
    return exclusions.some((entry) => path === entry || path.startsWith(`${entry}/`));
  }
  function visit(directory) {
    for (const name of readdirSync(directory).sort()) {
      const absolute = join(directory, name);
      const path = normalized(relative(canonicalRoot, absolute));
      if (isExcluded(path)) continue;
      const stats = lstatSync(absolute);
      const mode = (stats.mode & 0o777).toString(8).padStart(3, "0");
      if (stats.isDirectory()) {
        rows.push(`D ${mode} - ${path}`);
        visit(absolute);
      } else if (stats.isFile()) {
        if (stats.nlink !== 1) throw new Error(`Hard-linked file cannot enter an immutable artifact: ${path}`);
        rows.push(`F ${mode} ${sha(readFileSync(absolute))} ${path}`);
      } else if (stats.isSymbolicLink()) {
        rows.push(`L ${mode} ${sha(readlinkSync(absolute))} ${path}`);
      } else {
        throw new Error(`Special file cannot enter an immutable artifact: ${path}`);
      }
    }
  }
  visit(canonicalRoot);
  return rows.join("\n") + "\n";
}

export function createContentManifest(root, excluded = []) {
  return inventory(root, excluded);
}

export function assertRuntimeCacheExcluded(root) {
  const canonicalRoot = realpathSync(root);
  for (const relativePath of ["cache", "cache/fetch-cache", "cache/images"]) {
    if (existsSync(join(canonicalRoot, relativePath))) {
      throw new Error(`Runtime artifact contains forbidden Next build/cache path: ${relativePath}`);
    }
  }
  for (const requiredPath of ["BUILD_ID", "server", "static"]) {
    if (!existsSync(join(canonicalRoot, requiredPath))) {
      throw new Error(`Runtime artifact is missing required Next output: ${requiredPath}`);
    }
  }
}

export function assertBuildWorkspaceInputs(root, phase) {
  const canonicalRoot = realpathSync(root);
  const allowedIgnored = phase === "post-install" ? ["node_modules/"] : phase === "post-build" ? ["node_modules/", ".next/"] : phase === "fresh" ? [] : null;
  if (!allowedIgnored) throw new Error("Unknown build input phase.");
  const git = existsSync("/usr/bin/git") ? "/usr/bin/git" : "git";
  const ignored = execFileSync(git, ["-C", canonicalRoot, "ls-files", "--others", "--ignored", "--exclude-standard", "-z"], { encoding: "buffer", maxBuffer: 256 * 1024 * 1024 }).toString("utf8").split("\0").filter(Boolean);
  const unexpectedIgnored = ignored.filter((path) => !allowedIgnored.some((prefix) => path === prefix.slice(0, -1) || path.startsWith(prefix)));
  const untracked = execFileSync(git, ["-C", canonicalRoot, "ls-files", "--others", "--exclude-standard", "-z"], { encoding: "buffer", maxBuffer: 64 * 1024 * 1024 }).toString("utf8").split("\0").filter(Boolean);
  if (unexpectedIgnored.length || untracked.length) throw new Error("Unexpected ignored or untracked build input.");
  return { ignoredCount: ignored.length, allowedPrefixes: allowedIgnored };
}

const storageLinks = {
  "public/uploads": "/var/www/shared/public",
  ".uploads": "/var/www/shared/private",
  "public/generated/community-source-previews": "/var/www/shared/generated/community-source-previews"
};
export function assertApprovedReleaseSymlinks(root, { storageTargets = storageLinks } = {}) {
  const canonicalRoot = realpathSync(root);
  const discovered = [];
  function visit(directory) {
    for (const name of readdirSync(directory)) {
      const absolute = join(directory, name), relativePath = normalized(relative(canonicalRoot, absolute)), stats = lstatSync(absolute);
      if (stats.isSymbolicLink()) discovered.push([relativePath, readlinkSync(absolute), realpathSync(absolute)]);
      else if (stats.isDirectory()) visit(absolute);
    }
  }
  visit(canonicalRoot);
  for (const [path, link, target] of discovered) {
    if (path in storageTargets) {
      if (storageTargets[path] !== link || storageTargets[path] !== target) throw new Error(`Release storage symlink substitution: ${path}`);
      continue;
    }
    const dependencyRoot = `${canonicalRoot}${sep}node_modules${sep}`;
    if (!path.startsWith("node_modules/") || !(target === dependencyRoot.slice(0, -1) || target.startsWith(dependencyRoot))) {
      throw new Error(`Release contains an unapproved symlink: ${path}`);
    }
  }
  for (const path of Object.keys(storageTargets)) if (!discovered.some(([candidate]) => candidate === path)) throw new Error(`Release storage symlink is missing: ${path}`);
  return discovered;
}

export function createReleaseManifest(root, options) {
  assertApprovedReleaseSymlinks(root, options);
  return createContentManifest(root);
}

export function verifyReleaseManifest(root, manifest, options) {
  const actual = createReleaseManifest(root, options);
  if (actual !== manifest) throw new Error(`Artifact manifest mismatch: ${root}`);
  return sha(Buffer.from(manifest));
}

function trackedSourceInventory(root, excluded = []) {
  const canonicalRoot = realpathSync(root);
  const exclusions = excluded.map((entry) => entry.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, ""));
  const isExcluded = (path) => exclusions.some((entry) => path === entry || path.startsWith(`${entry}/`));
  const git = existsSync("/usr/bin/git") ? "/usr/bin/git" : "git";
  const status = execFileSync(git, ["-C", canonicalRoot, "status", "--porcelain", "--untracked-files=all"], {
    encoding: "utf8"
  });
  const unexpectedStatus = status.split("\n").filter(Boolean).filter((line) => {
    const path = line.slice(3).replace(/^.* -> /, "");
    return !isExcluded(path);
  });
  if (unexpectedStatus.length) throw new Error("Tracked source is dirty outside approved persistent overlays.");
  const names = execFileSync(git, ["-C", canonicalRoot, "ls-files", "-z"], {
    encoding: "buffer",
    maxBuffer: 64 * 1024 * 1024
  }).toString("utf8").split("\0").filter(Boolean).sort();
  return names.filter((path) => !isExcluded(path)).map((path) => {
    const absolute = resolve(canonicalRoot, path);
    if (!absolute.startsWith(`${canonicalRoot}${sep}`)) throw new Error("Tracked path escaped source root.");
    const stats = lstatSync(absolute);
    if (stats.isFile()) return `F ${sha(readFileSync(absolute))} ${path}`;
    if (stats.isSymbolicLink()) return `L ${sha(readlinkSync(absolute))} ${path}`;
    throw new Error(`Tracked source contains an unsupported object: ${path}`);
  }).join("\n") + "\n";
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [command, root, manifest, ...excluded] = process.argv.slice(2);
  if (!command || !root || !manifest) {
    throw new Error("Usage: artifact-manifest.mjs <create|source|runtime-create|verify|verify-source|runtime-verify> <root> <manifest> [excluded ...]");
  }
  if (command === "runtime-create") assertRuntimeCacheExcluded(root);
  if (command === "release-create" || command === "release-verify") assertApprovedReleaseSymlinks(root);
  if (command === "build-inputs") {
    process.stdout.write(JSON.stringify(assertBuildWorkspaceInputs(root, manifest)));
  } else if (command === "create" || command === "source" || command === "runtime-create" || command === "release-create") {
    const body = command === "source" ? trackedSourceInventory(root, excluded) : inventory(root, excluded);
    atomicWrite(manifest, body);
    process.stdout.write(sha(Buffer.from(body)));
  } else if (command === "verify" || command === "verify-source" || command === "runtime-verify" || command === "release-verify") {
    if (command === "runtime-verify") assertRuntimeCacheExcluded(root);
    const expected = readFileSync(manifest, "utf8");
    const actual = command === "verify-source" ? trackedSourceInventory(root, excluded) : inventory(root, excluded);
    if (actual !== expected) throw new Error(`Artifact manifest mismatch: ${root}`);
    process.stdout.write(sha(Buffer.from(expected)));
  } else {
    throw new Error("Unknown artifact manifest command.");
  }
}
