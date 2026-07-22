import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const executableShell = /(?:^|\/)\w[\w.-]*\.sh$/u;

export function expectedPackMode(path, type = "F") {
  if (type === "D") return "0555";
  return executableShell.test(path) ? "0555" : "0444";
}

export function renderPackManifest(entries) {
  return [...entries].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0).map((entry) => {
    if (entry.type === "D") return `D 0555 - - ${entry.path}`;
    const body = Buffer.isBuffer(entry.body) ? entry.body : Buffer.from(entry.body);
    return `F ${expectedPackMode(entry.path)} ${body.length} ${sha256(body)} ${entry.path}`;
  }).join("\n") + "\n";
}

export function parsePackManifest(body) {
  const entries = body.trimEnd().split("\n").filter(Boolean).map((line) => {
    const match = /^(D|F) (0[0-7]{3}) (-|\d+) (-|[0-9a-f]{64}) (.+)$/u.exec(line);
    if (!match) throw new Error("Malformed pack manifest row.");
    const [, type, mode, size, digest, path] = match;
    if (!path || path.startsWith("/") || path.split("/").some((part) => !part || part === "." || part === "..") || path.includes("\\")) throw new Error("Unsafe pack manifest path.");
    if (mode !== expectedPackMode(path, type)) throw new Error("Unexpected executable or pack mode.");
    if (type === "D" ? size !== "-" || digest !== "-" : size === "-" || digest === "-") throw new Error("Pack manifest type metadata mismatch.");
    return { type, mode, size: type === "F" ? Number(size) : null, sha256: type === "F" ? digest : null, path };
  });
  if (new Set(entries.map((entry) => entry.path)).size !== entries.length) throw new Error("Duplicate pack manifest path.");
  return entries;
}

export function validatePackTree(entries, manifest) {
  const approved = parsePackManifest(manifest), byPath = new Map(approved.map((entry) => [entry.path, entry]));
  if (entries.length !== approved.length) throw new Error("Pack tree and approved manifest path sets differ.");
  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry.path)) throw new Error("Duplicate pack tree path.");
    seen.add(entry.path);
    const expected = byPath.get(entry.path);
    if (!expected || expected.type !== entry.type || entry.mode !== expected.mode) throw new Error("Pack tree type or mode differs from approved manifest.");
    if (entry.type === "F") {
      const body = Buffer.isBuffer(entry.body) ? entry.body : Buffer.from(entry.body ?? "");
      if (body.length !== expected.size || sha256(body) !== expected.sha256) throw new Error("Pack tree content differs from approved manifest.");
    }
  }
  return true;
}

export function inventoryInstalledPack(root, { operational = false, excludeManifest = true } = {}) {
  const canonical = realpathSync(resolve(root));
  const rootStats = lstatSync(canonical);
  if (!rootStats.isDirectory() || rootStats.isSymbolicLink() || (rootStats.mode & 0o777) !== 0o555 || (operational && rootStats.uid !== 0)) throw new Error("Installed pack root mode or ownership mismatch.");
  const entries = [];
  function visit(directory) {
    for (const name of readdirSync(directory).sort()) {
      if (excludeManifest && directory === canonical && name === ".installed-pack.manifest") continue;
      const absolute = join(directory, name);
      const stats = lstatSync(absolute);
      const path = relative(canonical, absolute).split(sep).join("/");
      if (stats.isSymbolicLink() || (stats.isFile() && stats.nlink !== 1) || (stats.mode & 0o6000) || (stats.mode & 0o022) || (operational && stats.uid !== 0)) throw new Error("Unsafe installed pack object.");
      if (stats.isDirectory()) {
        if ((stats.mode & 0o777) !== 0o555) throw new Error("Installed pack directory mode mismatch.");
        entries.push({ type: "D", path });
        visit(absolute);
      } else if (stats.isFile()) {
        const mode = (stats.mode & 0o777).toString(8).padStart(4, "0");
        if (mode !== expectedPackMode(path)) throw new Error("Installed pack file mode mismatch.");
        entries.push({ type: "F", path, body: readFileSync(absolute) });
      } else throw new Error("Hard links and special files are forbidden.");
    }
  }
  visit(canonical);
  return renderPackManifest(entries);
}

export function verifyInstalledPack(root, manifest, options) {
  parsePackManifest(manifest);
  const actual = inventoryInstalledPack(root, options);
  if (actual !== manifest) throw new Error("Installed pack differs from its approved manifest.");
  return sha256(Buffer.from(manifest));
}
