import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, existsSync, fsyncSync, openSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const FORWARD_APPLICATION_SHA = "b43a1e4e708bc9f02ef83bd63dab1db1f366b32e";
export const FORWARD_PARENT_SHA = "6949bb2b7ef0ce28e5983751f3c8a10accde99b3";
export const FORWARD_REVIEW_BASE_SHA = "2c83694de301b0244c5586c1598aceb10fa2214b";
export const ROLLBACK_APPLICATION_SHA = "5d1f81bb05a01b08e1134785c2f86b77c8969fe3";
export const HISTORICAL_PRODUCTION_SHA = "5fa2bbf6ac7d39aa14636882bbae2d2713faf11a";

export const APPLICATION_IDENTITIES = Object.freeze({
  forward: Object.freeze({
    sha: FORWARD_APPLICATION_SHA,
    parentSha: FORWARD_PARENT_SHA,
    reviewBaseSha: FORWARD_REVIEW_BASE_SHA,
    files: Object.freeze([
      Object.freeze({ status: "M", mode: "100644", path: "package.json" }),
      Object.freeze({ status: "M", mode: "100644", path: "scripts/validate-production-env.ts" }),
      Object.freeze({ status: "A", mode: "100644", path: "tests/validate-production-env.test.ts" })
    ])
  }),
  rollback: Object.freeze({
    sha: ROLLBACK_APPLICATION_SHA,
    parentSha: HISTORICAL_PRODUCTION_SHA,
    files: Object.freeze([
      Object.freeze({ status: "A", mode: "100644", path: "docs/bcn-phase-e3-rollback-immutable-runtime-cache.md" }),
      Object.freeze({ status: "M", mode: "100644", path: "next.config.ts" }),
      Object.freeze({ status: "A", mode: "100644", path: "src/config/rollback-immutable-runtime-cache.test.ts" })
    ])
  })
});

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const git = (root, args, encoding = "utf8") =>
  execFileSync("git", ["-C", root, ...args], { encoding, maxBuffer: 64 * 1024 * 1024 });

function rowsFromNul(buffer) {
  return buffer.toString("utf8").split("\0").filter(Boolean);
}

export function verifyApplicationCommit(root, role, identities = APPLICATION_IDENTITIES) {
  const expected = identities[role];
  if (!expected) throw new Error("Application role must be forward or rollback.");
  const repository = resolve(root);
  const head = git(repository, ["rev-parse", "HEAD"]).trim();
  const status = git(repository, ["status", "--porcelain=v1", "-z", "--untracked-files=all"], "buffer");
  if (head !== expected.sha || status.length !== 0) throw new Error(`${role} checkout is not the exact clean approved commit.`);

  const parents = git(repository, ["rev-list", "--parents", "-n", "1", head]).trim().split(/\s+/u);
  if (parents.length !== 2 || parents[1] !== expected.parentSha) {
    throw new Error(`${role} commit is a merge, has an extra commit, or has the wrong parent.`);
  }

  const reviewBaseSha = expected.reviewBaseSha ?? parents[1];
  if (expected.reviewBaseSha) {
    const reviewBaseIsAncestor = git(
      repository,
      ["merge-base", "--is-ancestor", reviewBaseSha, parents[1]],
      "buffer"
    );
    if (reviewBaseIsAncestor.length !== 0) {
      throw new Error(`${role} reviewed base ancestry check produced unexpected output.`);
    }
  }
  const statusRows = rowsFromNul(git(repository, [
    "diff-tree", "--no-commit-id", "-r", "--no-renames", "--name-status", "-z", reviewBaseSha, head
  ], "buffer"));
  const actual = [];
  for (let index = 0; index < statusRows.length; index += 2) {
    actual.push({ status: statusRows[index], path: statusRows[index + 1] });
  }
  const expectedRows = expected.files.map(({ status: fileStatus, path }) => ({ status: fileStatus, path }));
  if (JSON.stringify(actual) !== JSON.stringify(expectedRows)) {
    throw new Error(`${role} commit file set or status differs from the reviewed application commit.`);
  }

  const fileHashes = expected.files.map(({ status: fileStatus, mode, path }) => {
    const tree = git(repository, ["ls-tree", head, "--", path]).trim();
    const match = /^(\d+) blob ([0-9a-f]+)\t(.+)$/u.exec(tree);
    if (!match || match[1] !== mode || match[3] !== path) {
      throw new Error(`${role} commit has a rename, deletion, special object, or mode change: ${path}`);
    }
    const parentTree = git(repository, ["ls-tree", reviewBaseSha, "--", path]).trim();
    if (fileStatus === "M" && !parentTree.startsWith(`${mode} blob `)) {
      throw new Error(`${role} modified file did not exist with the approved mode in its parent: ${path}`);
    }
    if (fileStatus === "A" && parentTree) throw new Error(`${role} added file already existed in its parent: ${path}`);
    return { path, sha256: sha256(git(repository, ["show", `${head}:${path}`], "buffer")) };
  });
  const rawDiff = git(repository, [
    "diff-tree", "--no-commit-id", "-r", "--no-renames", "--raw", "-z", reviewBaseSha, head
  ], "buffer");
  return {
    role,
    applicationSha: head,
    parentSha: parents[1],
    reviewBaseSha,
    candidateFileSet: expected.files.map(({ path }) => path),
    candidateRawDiffSha256: sha256(rawDiff),
    fileHashes
  };
}

function writeExclusive(path, payload) {
  if (existsSync(path)) throw new Error("Application identity evidence already exists.");
  const temporary = `${path}.${process.pid}.tmp`;
  const fd = openSync(temporary, "wx", 0o600);
  try {
    writeFileSync(fd, `${JSON.stringify(payload, null, 2)}\n`);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(temporary, path);
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  const [command, role, repository, evidencePath] = process.argv.slice(2);
  if (command !== "verify" || !role || !repository || !evidencePath) {
    throw new Error("Usage: application-identities.mjs verify <forward|rollback> <repository> <new-evidence-path>");
  }
  const identity = verifyApplicationCommit(repository, role);
  writeExclusive(resolve(evidencePath), identity);
  process.stdout.write(sha256(readFileSync(resolve(evidencePath))));
}
