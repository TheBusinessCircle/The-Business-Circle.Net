import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, it } from "node:test";
import {
  OPERATIONS_BASE_SHA,
  aggregateCandidateCommit,
  aggregateCandidateEntries,
  aggregateCandidateWorkspace
} from "./candidate-aggregate.mjs";

const CURRENT_REGRESSION_COMMIT = "e30b0cb3be0940bcb76b301abe0650d52dbbfeae";
const CURRENT_REGRESSION_AGGREGATE =
  "44da9055af374670abe803222182019e8c2f28091aaea58f65dd57a9b19ae681";
const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../.."
);
const temporaryRoots = [];
const candidateFiles = [
  "docs/circle-card-phase-f1-server-deployment-pack.md",
  "ops/deploy/phase-f1/a.mjs",
  "src/config/phase-f1-deployment-pack.test.ts"
];

function temporaryRoot() {
  const root = mkdtempSync(join(tmpdir(), "phase-f1-candidate-aggregate-"));
  temporaryRoots.push(root);
  return root;
}

function git(root, args, options = {}) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: join(root, "missing-global-gitconfig")
    },
    ...options
  }).trim();
}

function writeCandidate(root, path, body) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), body);
}

function syntheticRepository() {
  const root = temporaryRoot();
  git(root, ["init", "--quiet"]);
  git(root, ["config", "user.name", "Phase F1 Aggregate Test"]);
  git(root, ["config", "user.email", "phase-f1-aggregate@example.invalid"]);
  git(root, ["config", "core.autocrlf", "false"]);
  writeFileSync(join(root, "README.md"), "synthetic repository\n");
  git(root, ["add", "README.md"]);
  git(root, ["commit", "--quiet", "-m", "base"]);
  const baseCommit = git(root, ["rev-parse", "HEAD"]);

  writeCandidate(root, candidateFiles[0], "documentation\nsecond line\n");
  writeCandidate(root, candidateFiles[1], "export const fixture = true;\n");
  writeCandidate(root, candidateFiles[2], "export const testFixture = true;\n");
  git(root, ["add", "--all"]);
  git(root, ["commit", "--quiet", "-m", "candidate"]);
  const sourceCommit = git(root, ["rev-parse", "HEAD"]);
  return { root, baseCommit, sourceCommit };
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("canonical Phase F1 Git-object candidate aggregate", () => {
  it("records the current e30b0cb committed-object regression identity", () => {
    assert.deepEqual(
      aggregateCandidateCommit(repositoryRoot, CURRENT_REGRESSION_COMMIT, {
        baseCommit: OPERATIONS_BASE_SHA
      }),
      {
        schemaVersion: "phase-f1-candidate-aggregate-v1",
        fileCount: 106,
        aggregateSha256: CURRENT_REGRESSION_AGGREGATE
      }
    );
  });

  it("returns the same aggregate for clean LF and CRLF checkouts of identical blobs", () => {
    const { root, baseCommit, sourceCommit } = syntheticRepository();
    const lf = aggregateCandidateWorkspace(root, sourceCommit, { baseCommit });

    const cloneParent = temporaryRoot();
    const crlfRoot = join(cloneParent, "crlf-checkout");
    git(cloneParent, [
      "-c",
      "core.autocrlf=true",
      "clone",
      "--quiet",
      "--no-local",
      root,
      crlfRoot
    ]);
    git(crlfRoot, ["config", "core.autocrlf", "true"]);
    assert.equal(git(crlfRoot, ["rev-parse", "HEAD"]), sourceCommit);
    assert.equal(git(crlfRoot, ["status", "--porcelain=v1"]), "");
    assert.match(
      readFileSync(join(crlfRoot, candidateFiles[0]), "utf8"),
      /\r\n/u
    );

    const crlf = aggregateCandidateWorkspace(crlfRoot, sourceCommit, {
      baseCommit
    });
    assert.deepEqual(crlf, lf);
  });

  it("never substitutes dirty working-tree bytes and changes only for a new blob", () => {
    const { root, baseCommit, sourceCommit } = syntheticRepository();
    const committed = aggregateCandidateCommit(root, sourceCommit, { baseCommit });
    writeFileSync(
      join(root, candidateFiles[1]),
      "export const fixture = 'dirty working tree';\n"
    );

    assert.deepEqual(
      aggregateCandidateCommit(root, sourceCommit, { baseCommit }),
      committed
    );
    assert.throws(
      () => aggregateCandidateWorkspace(root, sourceCommit, { baseCommit }),
      /clean|working-tree bytes/u
    );

    git(root, ["add", candidateFiles[1]]);
    git(root, ["commit", "--quiet", "-m", "new committed blob"]);
    const changedCommit = git(root, ["rev-parse", "HEAD"]);
    assert.notEqual(
      aggregateCandidateCommit(root, changedCommit, { baseCommit })
        .aggregateSha256,
      committed.aggregateSha256
    );
  });

  it("orders UTF-8 paths deterministically and rejects duplicate or missing paths", () => {
    const entries = [
      { path: candidateFiles[2], body: "test\n" },
      { path: candidateFiles[0], body: "docs\n" },
      { path: candidateFiles[1], body: "ops\n" }
    ];
    assert.deepEqual(
      aggregateCandidateEntries(entries),
      aggregateCandidateEntries([...entries].reverse())
    );
    assert.throws(
      () => aggregateCandidateEntries([...entries, entries[0]]),
      /duplicate/u
    );
    assert.throws(
      () =>
        aggregateCandidateEntries(entries.slice(1), entries.map(({ path }) => path)),
      /missing|extra/u
    );
    assert.throws(
      () =>
        aggregateCandidateEntries([
          ...entries,
          { path: "ops/deploy/phase-f1/../escape", body: "x" }
        ]),
      /canonical|traversal/u
    );
  });

  it("rejects missing commits, deleted required paths, and unsupported Git modes", () => {
    const missing = syntheticRepository();
    assert.throws(
      () =>
        aggregateCandidateCommit(missing.root, "0".repeat(40), {
          baseCommit: missing.baseCommit
        }),
      /missing/u
    );

    git(missing.root, ["rm", "--quiet", candidateFiles[0]]);
    git(missing.root, ["commit", "--quiet", "-m", "delete required path"]);
    assert.throws(
      () =>
        aggregateCandidateCommit(missing.root, "HEAD", {
          baseCommit: missing.baseCommit
        }),
      /missing|required/u
    );

    const linked = syntheticRepository();
    const linkBlob = git(linked.root, ["hash-object", "-w", "--stdin"], {
      input: "synthetic-target"
    });
    git(linked.root, [
      "update-index",
      "--add",
      "--cacheinfo",
      `120000,${linkBlob},ops/deploy/phase-f1/link`
    ]);
    git(linked.root, ["commit", "--quiet", "-m", "add unsupported link"]);
    assert.throws(
      () =>
        aggregateCandidateCommit(linked.root, "HEAD", {
          baseCommit: linked.baseCommit
        }),
      /regular Git blob/u
    );
  });
});
