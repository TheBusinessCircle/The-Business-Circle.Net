import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const AGGREGATE_SCHEMA = "phase-f1-candidate-aggregate-v1";
export const OPERATIONS_BASE_SHA = "c95b10d82d192c273812a40c2c9d1e9e73791b96";
export const CANDIDATE_FILES = [
  "docs/circle-card-phase-f1-server-deployment-pack.md",
  "src/config/phase-f1-deployment-pack.test.ts"
];

const PACK_PREFIX = "ops/deploy/phase-f1/";
const allowedModes = new Set(["100644", "100755"]);
const forbidden = /(?:^|\/)(?:\.env\.local|\.next(?:\/|$)|tsconfig\.tsbuildinfo|[^/]+\.(?:tar|zip|dump|log))(?:$|\/)/u;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const compareUtf8 = (left, right) =>
  Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
const utf8 = new TextDecoder("utf-8", { fatal: true });

function canonicalRepository(root) {
  const repository = realpathSync(resolve(root));
  const topLevel = realpathSync(
    execFileSync("git", ["-C", repository, "rev-parse", "--show-toplevel"], {
      encoding: "utf8"
    }).trim()
  );
  if (topLevel !== repository) {
    throw new Error("Candidate aggregate repository root is not canonical.");
  }
  return repository;
}

function git(repository, args, options = {}) {
  return execFileSync("git", ["-C", repository, ...args], {
    maxBuffer: 256 * 1024 * 1024,
    ...options
  });
}

function resolveCommit(repository, revision, label) {
  let commit;
  try {
    commit = git(repository, ["rev-parse", "--verify", `${revision}^{commit}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch {
    throw new Error(`${label} commit object is missing.`);
  }
  if (!/^[0-9a-f]{40,64}$/u.test(commit)) {
    throw new Error(`${label} commit identity is malformed.`);
  }
  return commit;
}

function decodeGitPath(value) {
  let path;
  try {
    path = utf8.decode(value);
  } catch {
    throw new Error("Candidate path is not valid UTF-8.");
  }
  if (
    !Buffer.from(path, "utf8").equals(value) ||
    !path ||
    path.includes("\\") ||
    path.startsWith("/") ||
    path.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error("Candidate path is non-canonical or contains traversal.");
  }
  return path;
}

function nulRows(value) {
  const rows = [];
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== 0) continue;
    rows.push(value.subarray(start, index));
    start = index + 1;
  }
  if (start !== value.length) {
    throw new Error("Git candidate path output is not NUL terminated.");
  }
  return rows;
}

function validateCandidatePath(path) {
  if (
    (!path.startsWith(PACK_PREFIX) && !CANDIDATE_FILES.includes(path)) ||
    forbidden.test(path)
  ) {
    throw new Error("Candidate aggregate contains an unsafe, generated, or out-of-boundary path.");
  }
}

export function aggregateCandidateEntries(entries, expectedPaths = null) {
  const normalized = entries.map(({ path, body }) => {
    if (typeof path !== "string") {
      throw new Error("Candidate aggregate path must be a UTF-8 string.");
    }
    const canonicalPath = decodeGitPath(Buffer.from(path, "utf8"));
    validateCandidatePath(canonicalPath);
    return {
      path: canonicalPath,
      body: Buffer.isBuffer(body) ? body : Buffer.from(body)
    };
  });

  if (new Set(normalized.map(({ path }) => path)).size !== normalized.length) {
    throw new Error("Candidate aggregate contains a duplicate path.");
  }

  const sorted = normalized.sort((left, right) =>
    compareUtf8(left.path, right.path)
  );
  if (expectedPaths) {
    const expected = expectedPaths.map((path) =>
      decodeGitPath(Buffer.from(path, "utf8"))
    ).sort(compareUtf8);
    if (new Set(expected).size !== expected.length) {
      throw new Error("Expected candidate path set contains a duplicate path.");
    }
    if (JSON.stringify(sorted.map(({ path }) => path)) !== JSON.stringify(expected)) {
      throw new Error("Candidate aggregate path set is missing or contains extra files.");
    }
  }

  const rows = sorted
    .map(({ path, body }) => `${path}\t${sha256(body)}\n`)
    .join("");
  return {
    schemaVersion: AGGREGATE_SCHEMA,
    fileCount: sorted.length,
    aggregateSha256: sha256(Buffer.from(rows, "utf8"))
  };
}

function candidatePaths(repository, baseCommit, sourceCommit) {
  const output = git(repository, [
    "diff",
    "--name-only",
    "--no-renames",
    "-z",
    `${baseCommit}..${sourceCommit}`,
    "--"
  ]);
  const paths = nulRows(output).map(decodeGitPath);
  if (!paths.length) {
    throw new Error("Candidate commit range contains no files.");
  }
  if (new Set(paths).size !== paths.length) {
    throw new Error("Git candidate selection contains a duplicate path.");
  }
  for (const path of paths) validateCandidatePath(path);
  if (
    !CANDIDATE_FILES.every((path) => paths.includes(path)) ||
    !paths.some((path) => path.startsWith(PACK_PREFIX))
  ) {
    throw new Error("Candidate commit range is missing a required boundary path.");
  }
  return paths;
}

function committedBlob(repository, sourceCommit, path) {
  const treeRows = nulRows(
    git(repository, ["ls-tree", "-z", sourceCommit, "--", path])
  );
  if (treeRows.length !== 1) {
    throw new Error(`Candidate path is missing from the source commit: ${path}`);
  }
  let record;
  try {
    record = utf8.decode(treeRows[0]);
  } catch {
    throw new Error("Candidate tree record is not valid UTF-8.");
  }
  const separator = record.indexOf("\t");
  const header = separator === -1 ? [] : record.slice(0, separator).split(" ");
  const treePath = separator === -1 ? "" : record.slice(separator + 1);
  const [mode, type, objectId] = header;
  if (
    header.length !== 3 ||
    treePath !== path ||
    type !== "blob" ||
    !allowedModes.has(mode) ||
    !/^[0-9a-f]{40,64}$/u.test(objectId || "")
  ) {
    throw new Error(`Candidate path is not an approved regular Git blob: ${path}`);
  }
  return git(repository, ["cat-file", "blob", objectId]);
}

export function aggregateCandidateCommit(
  root,
  revision,
  { baseCommit: baseRevision = OPERATIONS_BASE_SHA } = {}
) {
  const repository = canonicalRepository(root);
  const sourceCommit = resolveCommit(repository, revision, "Candidate source");
  const baseCommit = resolveCommit(repository, baseRevision, "Candidate base");
  const paths = candidatePaths(repository, baseCommit, sourceCommit);
  const entries = paths.map((path) => ({
    path,
    body: committedBlob(repository, sourceCommit, path)
  }));
  return aggregateCandidateEntries(entries, paths);
}

export function aggregateCandidateWorkspace(
  root = process.cwd(),
  revision = "HEAD",
  options = {}
) {
  const repository = canonicalRepository(root);
  if (
    git(repository, ["status", "--porcelain=v1", "-z", "--untracked-files=all"])
      .length !== 0
  ) {
    throw new Error("Candidate workspace must be clean; working-tree bytes are never aggregated.");
  }
  const head = resolveCommit(repository, "HEAD", "Workspace HEAD");
  const sourceCommit = resolveCommit(repository, revision, "Candidate source");
  if (head !== sourceCommit) {
    throw new Error("Candidate workspace HEAD does not match the requested source commit.");
  }
  return aggregateCandidateCommit(repository, sourceCommit, options);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [root = process.cwd(), revision = "HEAD", baseCommit = OPERATIONS_BASE_SHA] =
    process.argv.slice(2);
  process.stdout.write(
    `${JSON.stringify(
      aggregateCandidateWorkspace(root, revision, { baseCommit })
    )}\n`
  );
}
