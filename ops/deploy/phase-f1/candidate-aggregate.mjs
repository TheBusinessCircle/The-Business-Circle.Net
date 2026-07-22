import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const AGGREGATE_SCHEMA = "phase-f1-candidate-aggregate-v1";
export const CANDIDATE_FILES = [
  "docs/circle-card-phase-f1-server-deployment-pack.md",
  "src/config/phase-f1-deployment-pack.test.ts"
];
const PACK_PREFIX = "ops/deploy/phase-f1/";
const forbidden = /(?:^|\/)(?:\.env\.local|\.next(?:\/|$)|tsconfig\.tsbuildinfo|[^/]+\.(?:tar|zip|dump|log))(?:$|\/)/u;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const normalize = (path) => path.replaceAll("\\", "/").replace(/^\.\//u, "");
const compareUtf8 = (left, right) => Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));

export function aggregateCandidateEntries(entries, expectedPaths = null) {
  const normalized = entries.map(({ path, body }) => ({ path: normalize(path), body: Buffer.isBuffer(body) ? body : Buffer.from(body) }));
  if (normalized.some(({ path }) => !path || path.startsWith("/") || path.split("/").some((part) => !part || part === "." || part === "..") || (!path.startsWith(PACK_PREFIX) && !CANDIDATE_FILES.includes(path)) || forbidden.test(path))) throw new Error("Candidate aggregate contains an unsafe, generated, or out-of-boundary path.");
  if (new Set(normalized.map(({ path }) => path)).size !== normalized.length) throw new Error("Candidate aggregate contains a duplicate normalized path.");
  const sorted = normalized.sort((a, b) => compareUtf8(a.path, b.path));
  if (expectedPaths) {
    const expected = [...expectedPaths].map(normalize).sort(compareUtf8);
    if (JSON.stringify(sorted.map(({ path }) => path)) !== JSON.stringify(expected)) throw new Error("Candidate aggregate path set is missing or contains extra files.");
  }
  const rows = sorted.map(({ path, body }) => `${path}\t${sha256(body)}\n`).join("");
  return { schemaVersion: AGGREGATE_SCHEMA, fileCount: sorted.length, aggregateSha256: sha256(Buffer.from(rows, "utf8")) };
}

function filesystemEntries(root) {
  const canonical = realpathSync(root), entries = [];
  function visit(directory) {
    for (const name of readdirSync(directory)) {
      const absolute = join(directory, name), stats = lstatSync(absolute);
      if (stats.isSymbolicLink() || stats.nlink !== 1) throw new Error("Candidate boundary contains a linked object.");
      if (stats.isDirectory()) visit(absolute);
      else if (stats.isFile()) entries.push({ path: relative(canonical, absolute).split(sep).join("/"), body: readFileSync(absolute) });
      else throw new Error("Candidate boundary contains a special object.");
    }
  }
  visit(join(canonical, "ops", "deploy", "phase-f1"));
  for (const path of CANDIDATE_FILES) entries.push({ path, body: readFileSync(join(canonical, path)) });
  return entries;
}

export function aggregateCandidateWorkspace(root = process.cwd()) {
  const canonical = realpathSync(resolve(root));
  const status = execFileSync("git", ["-C", canonical, "status", "--porcelain=v1", "--untracked-files=all"], { encoding: "utf8" }).trim().split(/\r?\n/u).filter(Boolean);
  const changed = status.map((line) => normalize(line.slice(3).replace(/^.* -> /u, "")));
  if (changed.some((path) => !path.startsWith(PACK_PREFIX) && !CANDIDATE_FILES.includes(path))) throw new Error("Ordinary application or out-of-boundary change detected.");
  const entries = filesystemEntries(canonical);
  return aggregateCandidateEntries(entries, entries.map(({ path }) => path));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(`${JSON.stringify(aggregateCandidateWorkspace(resolve(process.argv[2] || process.cwd())))}\n`);
}
