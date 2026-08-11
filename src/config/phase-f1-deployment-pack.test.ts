import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, linkSync, lstatSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";
import { parseEnvironmentJson } from "../../ops/deploy/phase-f1/environment-file.mjs";
import { parseDatabaseUrl } from "../../ops/deploy/phase-f1/database-identity.mjs";
import { readState, transition } from "../../ops/deploy/phase-f1/deployment-state.mjs";
import { assertExactListener, parseProcNet } from "../../ops/deploy/phase-f1/listener-verification.mjs";
import { createRollbackProof, requiredRollbackEvidence, ROLLBACK_COMMIT_FILE_SET, verifyRollbackProof } from "../../ops/deploy/phase-f1/rollback-proof.mjs";
import { compareStorage, storageInventory } from "../../ops/deploy/phase-f1/storage-manifest.mjs";
import { unclassifiedEnvironmentNames } from "../../ops/deploy/phase-f1/audit-environment-inventory.mjs";
import { APPLICATION_IDENTITIES, FORWARD_APPLICATION_SHA, FORWARD_PARENT_SHA, FORWARD_REVIEW_BASE_SHA, HISTORICAL_PRODUCTION_SHA, ROLLBACK_APPLICATION_SHA, verifyApplicationCommit } from "../../ops/deploy/phase-f1/application-identities.mjs";
import { assertBuildWorkspaceInputs, assertRuntimeCacheExcluded, createContentManifest, createReleaseManifest, verifyReleaseManifest } from "../../ops/deploy/phase-f1/artifact-manifest.mjs";
import { createArtifactIdentity } from "../../ops/deploy/phase-f1/artifact-identity.mjs";
import { validateReleaseEvidenceObjects } from "../../ops/deploy/phase-f1/validate-release-gates.mjs";
import { expectedPackMode, parsePackManifest, renderPackManifest, validatePackTree } from "../../ops/deploy/phase-f1/pack-layout.mjs";
import { parsePackTreeRows } from "../../ops/deploy/phase-f1/pack-tree.mjs";
import { ARCHIVE_FORMAT, CORE_PUBLICATION_FILES, PUBLICATION_SUMMARY_SCHEMA, inspectPublicationArchive, verifyPublicationDirectory } from "../../ops/deploy/phase-f1/publication-summary.mjs";
import { renderSystemdUnit } from "../../ops/deploy/phase-f1/render-systemd-units.mjs";
import { publishBootEligibility, validateBootEligibility } from "../../ops/deploy/phase-f1/boot-eligibility.mjs";
import { consumeBuildAttempt, createBuildAttempt, finishBuildAttempt } from "../../ops/deploy/phase-f1/build-state.mjs";
import { parseSystemdExecStart, resolveProcessExpectation, verifyProcessSnapshot } from "../../ops/deploy/phase-f1/verify-systemd-process.mjs";
import { createCandidateInvocation, readCandidateInvocation, validateCandidateCleanupResult } from "../../ops/deploy/phase-f1/candidate-invocation.mjs";
import { validateStructuredEvidence } from "../../ops/deploy/phase-f1/structured-evidence.mjs";
import { validateDatabaseBackupEvidence, validatePublishedBackupSet } from "../../ops/deploy/phase-f1/database-backup-evidence.mjs";
import { OWNER_ROUTE_METHODS, OWNER_ROUTE_VARIANTS, assertUncachedPublicResponse, expectedCircleHttpStatusClass, isCircleOwnerRequestTarget } from "../../ops/deploy/phase-f1/http-policy.mjs";
import { aggregateCandidateCommit, aggregateCandidateEntries, aggregateCandidateWorkspace } from "../../ops/deploy/phase-f1/candidate-aggregate.mjs";
import { captureNginxDependencyClosure, discoverNginxDependencies, discoverNginxDependencyClosure, validateNginxSymlinkPolicyRecord, verifyCapturedNginxClosure } from "../../ops/deploy/phase-f1/nginx-dependency-closure.mjs";
import { parseStrictJsonObject, readCloudflareTlsEvidence, validateCloudflareTlsEvidence } from "../../ops/deploy/phase-f1/cloudflare-tls-evidence.mjs";

const require = createRequire(import.meta.url);
const serialization = require("../../ops/deploy/phase-f1/environment-serialization.cjs");
const groups = require("../../ops/deploy/phase-f1/environment-groups.cjs");
const root = resolve(process.cwd());
const pack = join(root, "ops", "deploy", "phase-f1");
const applicationSha = FORWARD_APPLICATION_SHA;
const rollbackSha = ROLLBACK_APPLICATION_SHA;
const operationsIdentity = "d".repeat(40);
const source = (path: string) => readFileSync(join(pack, path), "utf8");
const tempRoots: string[] = [];
const temp = () => { const path = mkdtempSync(join(tmpdir(), "phase-f1-test-")); tempRoots.push(path); return path; };
const sha = (body: string | Buffer) => createHash("sha256").update(body).digest("hex");
afterEach(() => { while (tempRoots.length) rmSync(tempRoots.pop()!, { recursive: true, force: true }); });

type TarMember = { name: string; mode: string; size: number; mtime: number; type: string; body: Buffer };
function tarMembers(archive: Buffer) {
  const members: TarMember[] = [];
  let pendingPath: string | null = null;
  for (let offset = 0; offset + 512 <= archive.length;) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const text = (start: number, length: number) => header.subarray(start, start + length).toString("utf8").replace(/\0.*$/u, "");
    const octal = (start: number, length: number) => Number.parseInt(text(start, length).trim() || "0", 8);
    const headerName = [text(345, 155), text(0, 100)].filter(Boolean).join("/");
    const size = octal(124, 12), type = text(156, 1) || "0";
    const body = archive.subarray(offset + 512, offset + 512 + size);
    if (type === "x") {
      const pathRow = body.toString("utf8").split("\n").find((row) => /^\d+ path=/u.test(row));
      pendingPath = pathRow?.replace(/^\d+ path=/u, "") || null;
    } else if (type !== "g") {
      members.push({ name: pendingPath || headerName, mode: octal(100, 8).toString(8).padStart(4, "0"), size, mtime: octal(136, 12), type, body });
      pendingPath = null;
    }
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return members;
}

const gitObjectEnvironment = (repository: string) => ({
  ...process.env,
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: join(repository, "missing.gitconfig")
});

function readCommittedBlob(repository: string, commit: string, path: string) {
  if (!/^[0-9a-f]{40}$/u.test(commit)) throw new Error(`Invalid exact commit identity: ${commit}`);
  if (!path || path.startsWith("/") || path.includes("\\") || path.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error(`Unsafe committed blob path: ${path}`);
  }
  const options = { cwd: repository, env: gitObjectEnvironment(repository) };
  let commitType: string;
  try {
    commitType = execFileSync("git", ["cat-file", "-t", commit], { ...options, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    throw new Error(`Missing committed object: ${commit}`);
  }
  if (commitType !== "commit") throw new Error(`Expected commit object, received: ${commitType}`);
  const rows = execFileSync("git", ["ls-tree", "-z", "--full-tree", commit, "--", path], { ...options, stdio: ["ignore", "pipe", "pipe"] })
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
  if (rows.length !== 1) throw new Error(`Missing or ambiguous committed blob path: ${path}`);
  const match = rows[0].match(/^([0-9]{6}) ([^ ]+) ([0-9a-f]{40})\t([\s\S]+)$/u);
  if (!match || match[4] !== path) throw new Error(`Unprovable committed blob path: ${path}`);
  const [, mode, objectType, objectId] = match;
  if (objectType !== "blob" || !["100644", "100755"].includes(mode)) {
    throw new Error(`Unsupported committed object type or mode for ${path}: ${mode} ${objectType}`);
  }
  const verifiedType = execFileSync("git", ["cat-file", "-t", objectId], { ...options, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  if (verifiedType !== "blob") throw new Error(`Expected blob object for ${path}, received: ${verifiedType}`);
  return execFileSync("git", ["cat-file", "blob", objectId], { ...options, stdio: ["ignore", "pipe", "pipe"] });
}

function assertArchiveMemberEqualsCommittedBlob(members: TarMember[], repository: string, commit: string, path: string) {
  const archivePath = `phase-f1/${path}`;
  const matches = members.filter(({ name }) => name === archivePath);
  if (matches.length !== 1) throw new Error(`Missing or duplicate archive member: ${archivePath}`);
  if (!["", "0"].includes(matches[0].type)) throw new Error(`Unsupported archive member type for ${archivePath}: ${matches[0].type}`);
  const expected = readCommittedBlob(repository, commit, `ops/deploy/phase-f1/${path}`);
  if (!matches[0].body.equals(expected)) throw new Error(`Archive member differs from committed Git blob: ${archivePath}`);
  return expected;
}

function createCommittedPackFixture() {
  const repository = temp(), outputs = temp();
  const git = (...args: string[]) => execFileSync("git", args, {
    cwd: repository,
    encoding: "utf8",
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: join(repository, "missing.gitconfig") }
  }).trim();
  git("init", "--quiet");
  git("config", "user.name", "Phase F1 Pack Test");
  git("config", "user.email", "phase-f1-pack@example.invalid");
  git("fetch", "--quiet", "--no-tags", root, "c95b10d82d192c273812a40c2c9d1e9e73791b96");
  git("checkout", "--quiet", "--detach", "FETCH_HEAD");
  cpSync(pack, join(repository, "ops", "deploy", "phase-f1"), { recursive: true });
  mkdirSync(join(repository, "docs"), { recursive: true });
  mkdirSync(join(repository, "src", "config"), { recursive: true });
  cpSync(join(root, "docs", "circle-card-phase-f1-server-deployment-pack.md"), join(repository, "docs", "circle-card-phase-f1-server-deployment-pack.md"));
  cpSync(join(root, "src", "config", "phase-f1-deployment-pack.test.ts"), join(repository, "src", "config", "phase-f1-deployment-pack.test.ts"));
  git("add", "ops/deploy/phase-f1", "docs/circle-card-phase-f1-server-deployment-pack.md", "src/config/phase-f1-deployment-pack.test.ts");
  git("commit", "--quiet", "-m", "synthetic Phase F1 pack candidate");
  return { repository, outputs, commit: git("rev-parse", "HEAD") };
}

describe("Phase F1 installed pack and immutable systemd identity", () => {
  it("omits only the selected root tree and strictly rejects unsafe enumeration rows", () => {
    const rootRow = "040000 tree " + "1".repeat(40) + "\tops/deploy/phase-f1";
    const fileRow = "100644 blob " + "2".repeat(40) + "\tops/deploy/phase-f1/nested/helper.mjs";
    expect(parsePackTreeRows(`${rootRow}\n${fileRow}\n`, () => Buffer.from("helper\n"))).toEqual([
      { type: "F", path: "nested/helper.mjs", body: Buffer.from("helper\n") }
    ]);
    expect(() => parsePackTreeRows(`${rootRow}\n040000 tree ${"3".repeat(40)}\tops/deploy/phase-f1/\n`, () => Buffer.alloc(0))).toThrow(/Unsafe/u);
    expect(() => parsePackTreeRows(`${rootRow}\n${fileRow}\n${fileRow}\n`, () => Buffer.alloc(0))).toThrow(/Duplicate/u);
    expect(() => parsePackTreeRows(`${rootRow}\n100644 blob ${"4".repeat(40)}\tops/deploy/phase-f1/../escape\n`, () => Buffer.alloc(0))).toThrow(/Unsafe/u);
    expect(() => parsePackTreeRows(`${rootRow}\n100644 blob ${"5".repeat(40)}\tdocs/outside.md\n`, () => Buffer.alloc(0))).toThrow(/outside/u);
    expect(() => parsePackTreeRows(`${rootRow}\n160000 commit ${"6".repeat(40)}\tops/deploy/phase-f1/submodule\n`, () => Buffer.alloc(0))).toThrow(/object type/u);
  });

  it("creates and verifies identical committed-checkout archives and manifests twice", () => {
    const { repository, outputs, commit } = createCommittedPackFixture();
    const run = (name: string) => {
      const output = join(outputs, name);
      expect(execFileSync("node", ["ops/deploy/phase-f1/create-pack-artifact.mjs", commit, output], { cwd: repository, encoding: "utf8" })).toMatch(/six-file operations publication/u);
      const archive = readFileSync(join(output, "phase-f1-pack.tar"));
      const manifest = readFileSync(join(output, "installed-pack.manifest"), "utf8");
      const members = tarMembers(archive);
      const packMembers = members.filter(({ name }) => name !== "phase-f1/" && name !== "phase-f1").map((member) => {
        expect(member.name.startsWith("phase-f1/")).toBe(true);
        const path = member.name.slice("phase-f1/".length).replace(/\/$/u, "");
        expect(path).not.toMatch(/^$|^\.$/u);
        const type = member.type === "5" ? "D" as const : "F" as const;
        expect(member.mode).toBe(expectedPackMode(path, type));
        return { type, path, mode: expectedPackMode(path, type), body: member.body, metadata: { archiveMode: member.mode, size: member.size, mtime: member.mtime, type: member.type } };
      });
      expect(packMembers.some(({ path }) => path === "systemd/circle-card.service")).toBe(true);
      const identityExchange = packMembers.find(({ path }) => path === "atomic-identity-exchange.py");
      expect(identityExchange).toMatchObject({ type: "F", mode: "0444" });
      const committedIdentityExchange = assertArchiveMemberEqualsCommittedBlob(members, repository, commit, "atomic-identity-exchange.py");
      expect(identityExchange?.body).toEqual(committedIdentityExchange);
      const manifestByPath = new Map(parsePackManifest(manifest).map((entry) => [entry.path, entry]));
      expect(manifestByPath.get("atomic-identity-exchange.py")?.mode).toBe("0444");
      for (const member of packMembers.filter(({ type }) => type === "F")) {
        const expected = manifestByPath.get(member.path);
        if (!expected || expected.size !== member.body.length || expected.sha256 !== sha(member.body)) throw new Error(`Archive content mismatch for ${member.path}: ${member.body.length}/${expected?.size}`);
      }
      expect(validatePackTree(packMembers, manifest)).toBe(true);
      expect(parsePackManifest(manifest).map(({ path }) => path)).not.toContain("");
      expect(existsSync(join(output, "approved-pack-identity.json"))).toBe(true);
      expect(existsSync(join(output, "EXTERNAL-SHA256SUMS"))).toBe(true);
      expect(readdirSync(output).length).toBe(6);
      const summaryName = `PUBLICATION-SUMMARY-${commit}.txt`;
      expect(existsSync(join(output, summaryName))).toBe(true);
      expect(verifyPublicationDirectory(output, commit).summaryName).toBe(summaryName);
      return { archive, manifest: Buffer.from(manifest), packMembers, summary: readFileSync(join(output, summaryName)) };
    };
    const first = run("first"), second = run("second");
    expect(first.archive.equals(second.archive)).toBe(true);
    expect(sha(first.archive)).toBe(sha(second.archive));
    expect(first.manifest.equals(second.manifest)).toBe(true);
    expect(sha(first.manifest)).toBe(sha(second.manifest));
    expect(first.summary.equals(second.summary)).toBe(true);
    expect(sha(first.summary)).toBe(sha(second.summary));
    expect(first.packMembers.map(({ type, path, mode, metadata }) => ({ type, path, mode, metadata }))).toEqual(second.packMembers.map(({ type, path, mode, metadata }) => ({ type, path, mode, metadata })));
  }, 60_000);

  it("renders and verifies the deterministic six-file publication summary contract", () => {
    const { repository, outputs, commit } = createCommittedPackFixture();
    const output = join(outputs, "summary-contract");
    execFileSync("node", ["ops/deploy/phase-f1/create-pack-artifact.mjs", commit, output], { cwd: repository, encoding: "utf8" });
    const summaryName = `PUBLICATION-SUMMARY-${commit}.txt`;
    const expectedNames = [...CORE_PUBLICATION_FILES, summaryName].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
    expect(readdirSync(output).sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)))).toEqual(expectedNames);
    for (const name of expectedNames) {
      const stats = lstatSync(join(output, name));
      expect(stats.isFile()).toBe(true);
      expect(stats.isSymbolicLink()).toBe(false);
      expect(stats.nlink).toBe(1);
    }

    const summary = readFileSync(join(output, summaryName));
    const text = summary.toString("utf8");
    expect(Buffer.from(text, "utf8")).toEqual(summary);
    expect(summary.subarray(0, 3)).not.toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
    expect(text).not.toContain("\r");
    expect(text.endsWith("\n")).toBe(true);
    expect(text.endsWith("\n\n")).toBe(false);
    const lines = text.slice(0, -1).split("\n");
    const identity = JSON.parse(readFileSync(join(output, "approved-pack-identity.json"), "utf8"));
    const manifest = parsePackManifest(readFileSync(join(output, "installed-pack.manifest"), "utf8"));
    const archive = inspectPublicationArchive(readFileSync(join(output, "phase-f1-pack.tar")));
    expect(lines.slice(0, 14)).toEqual([
      `schemaVersion=${PUBLICATION_SUMMARY_SCHEMA}`,
      `operationsCommit=${commit}`,
      `forwardApplicationSha=${applicationSha}`,
      `rollbackApplicationSha=${rollbackSha}`,
      `historicalProductionSha=${HISTORICAL_PRODUCTION_SHA}`,
      `installedPackPath=/opt/thebusinesscircle/deployment-packs/${commit}`,
      `candidateAggregateSchema=${identity.candidateAggregate.schemaVersion}`,
      `candidateFileCount=${identity.candidateAggregate.fileCount}`,
      `candidateAggregateSha256=${identity.candidateAggregate.aggregateSha256}`,
      `manifestEntryCount=${manifest.length}`,
      `manifestRegularFileCount=${manifest.filter(({ type }) => type === "F").length}`,
      `manifestDirectoryCount=${manifest.filter(({ type }) => type === "D").length}`,
      `archiveFormat=${ARCHIVE_FORMAT}`,
      `archiveMemberCount=${archive.memberCount}`
    ]);
    const records = lines.slice(14).map((line) => {
      const [label, filename, size, digest] = line.split("\t");
      expect(label).toBe("coreOutput");
      return { filename, size: Number(size), sha256: digest };
    });
    expect(records.map(({ filename }) => filename)).toEqual(CORE_PUBLICATION_FILES);
    for (const record of records) {
      const body = readFileSync(join(output, record.filename));
      expect(record.size).toBe(body.length);
      expect(record.sha256).toBe(sha(body));
    }
    expect(text).not.toContain(summaryName);
    expect(text).not.toMatch(/summarySha256|selfSha256/iu);
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}T|generatedAt|createdAt|timestamp|hostname|username|[A-Za-z]:\\|\/(?:tmp|home|Users)\//iu);
    expect(text).not.toMatch(/(?:^|\/)\.env(?:\.|$)|runtime\.env\.json|build\.env\.json/iu);
    expect(text).not.toMatch(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk_live_[A-Za-z0-9]{12,}\b|\brk_live_[A-Za-z0-9]{12,}\b|\bwhsec_[A-Za-z0-9]{12,}\b/iu);
    expect(verifyPublicationDirectory(output, commit)).toMatchObject({ summaryName, summarySize: summary.length, summarySha256: sha(summary) });

    const unexpected = join(output, "unexpected.log");
    writeFileSync(unexpected, "synthetic unexpected fixture\n");
    expect(() => verifyPublicationDirectory(output, commit)).toThrow(/file set/u);
    unlinkSync(unexpected);

    const originalSummary = Buffer.from(summary);
    writeFileSync(join(output, summaryName), "manually supplied summary\n");
    expect(() => verifyPublicationDirectory(output, commit)).toThrow(/differs/u);
    writeFileSync(join(output, summaryName), originalSummary);

    const hardLink = join(outputs, "core-output-hard-link");
    linkSync(join(output, "approved-pack-identity.json"), hardLink);
    expect(() => verifyPublicationDirectory(output, commit)).toThrow(/single-link/u);
    unlinkSync(hardLink);
    expect(verifyPublicationDirectory(output, commit).summarySha256).toBe(sha(originalSummary));

    const existing = join(outputs, "manually-supplied");
    mkdirSync(existing);
    writeFileSync(join(existing, summaryName), "unverified input\n");
    expect(() => execFileSync("node", ["ops/deploy/phase-f1/create-pack-artifact.mjs", commit, existing], { cwd: repository, stdio: "pipe" })).toThrow();
  }, 60_000);

  it("keeps summary bytes identical across LF and CRLF checkouts of the same commit", () => {
    const { repository, outputs, commit } = createCommittedPackFixture();
    const lfOutput = join(outputs, "lf");
    execFileSync("node", ["ops/deploy/phase-f1/create-pack-artifact.mjs", commit, lfOutput], { cwd: repository, stdio: "pipe" });

    const cloneParent = temp(), crlfCheckout = join(cloneParent, "crlf-checkout");
    execFileSync("git", ["-c", "core.autocrlf=true", "clone", "--quiet", "--no-local", repository, crlfCheckout]);
    execFileSync("git", ["config", "core.autocrlf", "true"], { cwd: crlfCheckout });
    execFileSync("git", ["checkout", "--force", commit], { cwd: crlfCheckout, stdio: "ignore" });
    expect(execFileSync("git", ["status", "--porcelain=v1"], { cwd: crlfCheckout, encoding: "utf8" })).toBe("");
    expect(readFileSync(join(crlfCheckout, "ops", "deploy", "phase-f1", "publication-summary.mjs"), "utf8")).toContain("\r\n");

    const crlfOutputParent = temp(), crlfOutput = join(crlfOutputParent, "output");
    execFileSync("node", ["ops/deploy/phase-f1/create-pack-artifact.mjs", commit, crlfOutput], { cwd: crlfCheckout, stdio: "pipe" });
    const names = readdirSync(lfOutput).sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
    expect(readdirSync(crlfOutput).sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)))).toEqual(names);
    for (const name of names) expect(readFileSync(join(crlfOutput, name))).toEqual(readFileSync(join(lfOutput, name)));
  }, 60_000);

  it("binds archive membership to exact Git blobs across LF, CRLF and dirty checkouts", () => {
    const fixture = createCommittedPackFixture();
    const clone = (name: string, eol: "lf" | "crlf") => {
      const directory = join(temp(), name);
      execFileSync("git", ["clone", "--quiet", "--no-local", "--no-checkout", fixture.repository, directory]);
      execFileSync("git", ["config", "core.autocrlf", "false"], { cwd: directory });
      execFileSync("git", ["config", "core.eol", eol], { cwd: directory });
      execFileSync("git", ["checkout", "--force", fixture.commit], { cwd: directory, stdio: "ignore" });
      expect(execFileSync("git", ["status", "--porcelain=v1"], { cwd: directory, encoding: "utf8" })).toBe("");
      return directory;
    };
    const lfCheckout = clone("lf-checkout", "lf");
    const crlfCheckout = clone("crlf-checkout", "crlf");
    const utilityPath = "ops/deploy/phase-f1/atomic-identity-exchange.py";
    const lfWorkingBytes = readFileSync(join(lfCheckout, ...utilityPath.split("/")));
    const crlfWorkingBytes = readFileSync(join(crlfCheckout, ...utilityPath.split("/")));
    expect(lfWorkingBytes.equals(crlfWorkingBytes)).toBe(false);
    expect(crlfWorkingBytes.includes(Buffer.from("\r\n"))).toBe(true);

    const generate = (repository: string, name: string) => {
      const output = join(fixture.outputs, name);
      execFileSync("node", ["ops/deploy/phase-f1/create-pack-artifact.mjs", fixture.commit, output], { cwd: repository, stdio: "pipe" });
      return tarMembers(readFileSync(join(output, "phase-f1-pack.tar")));
    };
    const lfMembers = generate(lfCheckout, "lf-archive");
    const crlfMembers = generate(crlfCheckout, "crlf-archive");
    const lfBlob = assertArchiveMemberEqualsCommittedBlob(lfMembers, lfCheckout, fixture.commit, "atomic-identity-exchange.py");
    const crlfBlob = assertArchiveMemberEqualsCommittedBlob(crlfMembers, crlfCheckout, fixture.commit, "atomic-identity-exchange.py");
    expect(lfBlob).toEqual(crlfBlob);

    writeFileSync(join(crlfCheckout, ...utilityPath.split("/")), Buffer.concat([crlfWorkingBytes, Buffer.from("# SYNTHETIC UNCOMMITTED CHECKOUT CHANGE\r\n")]));
    expect(execFileSync("git", ["status", "--porcelain=v1"], { cwd: crlfCheckout, encoding: "utf8" })).toMatch(/atomic-identity-exchange\.py/u);
    expect(readCommittedBlob(crlfCheckout, fixture.commit, utilityPath)).toEqual(lfBlob);
    expect(assertArchiveMemberEqualsCommittedBlob(crlfMembers, crlfCheckout, fixture.commit, "atomic-identity-exchange.py")).toEqual(lfBlob);

    const changedBytes = Buffer.concat([lfBlob, Buffer.from("# SYNTHETIC COMMITTED BLOB CHANGE\n")]);
    writeFileSync(join(lfCheckout, ...utilityPath.split("/")), changedBytes);
    execFileSync("git", ["add", utilityPath], { cwd: lfCheckout });
    execFileSync("git", ["-c", "user.name=Phase F1 Blob Test", "-c", "user.email=phase-f1-blob@example.invalid", "commit", "--quiet", "-m", "synthetic committed blob change"], { cwd: lfCheckout });
    const changedCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: lfCheckout, encoding: "utf8" }).trim();
    const changedBlob = readCommittedBlob(lfCheckout, changedCommit, utilityPath);
    expect(changedBlob).not.toEqual(lfBlob);
    expect(changedBlob).toEqual(changedBytes);
    const changedOutput = join(fixture.outputs, "changed-archive");
    execFileSync("node", ["ops/deploy/phase-f1/create-pack-artifact.mjs", changedCommit, changedOutput], { cwd: lfCheckout, stdio: "pipe" });
    const changedMembers = tarMembers(readFileSync(join(changedOutput, "phase-f1-pack.tar")));
    expect(assertArchiveMemberEqualsCommittedBlob(changedMembers, lfCheckout, changedCommit, "atomic-identity-exchange.py")).toEqual(changedBlob);

    expect(() => readCommittedBlob(lfCheckout, "0".repeat(40), utilityPath)).toThrow(/Missing committed object/u);
    expect(() => readCommittedBlob(lfCheckout, changedCommit, "ops/deploy/phase-f1/missing.py")).toThrow(/Missing or ambiguous/u);
    expect(() => assertArchiveMemberEqualsCommittedBlob(changedMembers.filter(({ name }) => name !== "phase-f1/atomic-identity-exchange.py"), lfCheckout, changedCommit, "atomic-identity-exchange.py")).toThrow(/Missing or duplicate/u);
    const tamperedMembers = changedMembers.map((member) => member.name === "phase-f1/atomic-identity-exchange.py"
      ? { ...member, body: Buffer.concat([Buffer.from([member.body[0] ^ 1]), member.body.subarray(1)]) }
      : member);
    expect(() => assertArchiveMemberEqualsCommittedBlob(tamperedMembers, lfCheckout, changedCommit, "atomic-identity-exchange.py")).toThrow(/differs from committed Git blob/u);

    const exactCrLfBytes = Buffer.from("# SYNTHETIC COMMITTED CRLF BLOB\r\nprint('fixture')\r\n");
    writeFileSync(join(lfCheckout, ...utilityPath.split("/")), exactCrLfBytes);
    const exactCrLfObject = execFileSync("git", ["hash-object", "-w", "--no-filters", utilityPath], { cwd: lfCheckout, encoding: "utf8" }).trim();
    execFileSync("git", ["update-index", "--cacheinfo", `100644,${exactCrLfObject},${utilityPath}`], { cwd: lfCheckout });
    execFileSync("git", ["-c", "user.name=Phase F1 Blob Test", "-c", "user.email=phase-f1-blob@example.invalid", "commit", "--quiet", "-m", "synthetic committed CRLF blob"], { cwd: lfCheckout });
    const crlfCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: lfCheckout, encoding: "utf8" }).trim();
    const exactCrLfBlob = readCommittedBlob(lfCheckout, crlfCommit, utilityPath);
    expect(exactCrLfBlob).toEqual(exactCrLfBytes);
    expect(exactCrLfBlob).not.toEqual(Buffer.from(exactCrLfBlob.toString("utf8").replace(/\r\n/gu, "\n")));
    const crlfCommittedOutput = join(fixture.outputs, "committed-crlf-archive");
    execFileSync("node", ["ops/deploy/phase-f1/create-pack-artifact.mjs", crlfCommit, crlfCommittedOutput], { cwd: lfCheckout, stdio: "pipe" });
    const crlfCommittedMembers = tarMembers(readFileSync(join(crlfCommittedOutput, "phase-f1-pack.tar")));
    expect(assertArchiveMemberEqualsCommittedBlob(crlfCommittedMembers, lfCheckout, crlfCommit, "atomic-identity-exchange.py")).toEqual(exactCrLfBytes);
    const normalizedMembers = crlfCommittedMembers.map((member) => member.name === "phase-f1/atomic-identity-exchange.py"
      ? { ...member, body: Buffer.from(member.body.toString("utf8").replace(/\r\n/gu, "\n")) }
      : member);
    expect(() => assertArchiveMemberEqualsCommittedBlob(normalizedMembers, lfCheckout, crlfCommit, "atomic-identity-exchange.py")).toThrow(/differs from committed Git blob/u);

    const linkTarget = join(temp(), "synthetic-link-target.txt");
    writeFileSync(linkTarget, "synthetic-target\n");
    const linkBlob = execFileSync("git", ["hash-object", "-w", linkTarget], { cwd: lfCheckout, encoding: "utf8" }).trim();
    const linkPath = "ops/deploy/phase-f1/synthetic-link";
    execFileSync("git", ["update-index", "--add", "--cacheinfo", `120000,${linkBlob},${linkPath}`], { cwd: lfCheckout });
    execFileSync("git", ["-c", "user.name=Phase F1 Blob Test", "-c", "user.email=phase-f1-blob@example.invalid", "commit", "--quiet", "-m", "synthetic committed link"], { cwd: lfCheckout });
    const linkCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: lfCheckout, encoding: "utf8" }).trim();
    expect(() => readCommittedBlob(lfCheckout, linkCommit, linkPath)).toThrow(/Unsupported committed object type or mode/u);
  }, 120_000);

  it("rejects a committed candidate missing or exceeding the approved boundary", () => {
    const missing = createCommittedPackFixture();
    execFileSync("git", ["rm", "--quiet", "docs/circle-card-phase-f1-server-deployment-pack.md"], { cwd: missing.repository });
    execFileSync("git", ["commit", "--quiet", "-m", "remove required boundary file"], { cwd: missing.repository });
    const missingCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: missing.repository, encoding: "utf8" }).trim();
    expect(() => execFileSync("node", ["ops/deploy/phase-f1/create-pack-artifact.mjs", missingCommit, join(missing.outputs, "missing")], { cwd: missing.repository, encoding: "utf8", stdio: "pipe" })).toThrow();

    const extra = createCommittedPackFixture();
    writeFileSync(join(extra.repository, "unapproved.txt"), "outside\n");
    execFileSync("git", ["add", "unapproved.txt"], { cwd: extra.repository });
    execFileSync("git", ["commit", "--quiet", "-m", "add unapproved file"], { cwd: extra.repository });
    const extraCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: extra.repository, encoding: "utf8" }).trim();
    expect(() => execFileSync("node", ["ops/deploy/phase-f1/create-pack-artifact.mjs", extraCommit, join(extra.outputs, "extra")], { cwd: extra.repository, encoding: "utf8", stdio: "pipe" })).toThrow();
  }, 60_000);

  it("assigns deterministic executable modes and rejects mode or content tampering", () => {
    const entries = [
      { type: "D" as const, path: "systemd" },
      { type: "F" as const, path: "harmless.sh", body: "#!/bin/sh\nexit 0\n" },
      { type: "F" as const, path: "helper.mjs", body: "export default true;\n" }
    ];
    const manifest = renderPackManifest(entries);
    expect(parsePackManifest(manifest)).toMatchObject([
      { path: "harmless.sh", mode: "0555" },
      { path: "helper.mjs", mode: "0444" },
      { path: "systemd", mode: "0555" }
    ]);
    const tree = entries.map((entry) => ({ ...entry, mode: expectedPackMode(entry.path, entry.type) }));
    expect(validatePackTree(tree, manifest)).toBe(true);
    expect(() => validatePackTree(tree.map((entry) => entry.path === "harmless.sh" ? { ...entry, mode: "0444" } : entry), manifest)).toThrow(/mode/u);
    expect(() => validatePackTree(tree.map((entry) => entry.path === "helper.mjs" ? { ...entry, body: "tampered\n" } : entry), manifest)).toThrow(/content/u);
  });

  it.runIf(process.platform !== "win32")("directly executes a harmless installed-mode shell fixture", () => {
    const directory = temp(), script = join(directory, "harmless.sh");
    writeFileSync(script, "#!/bin/sh\nprintf phase-f1-mode-ok\n"); chmodSync(script, 0o555);
    expect(execFileSync(script, [], { encoding: "utf8" })).toBe("phase-f1-mode-ok");
  });

  it("renders every systemd executable path to the exact operations commit", () => {
    const templates = ["the-business-circle-network.service", "the-business-circle-network-candidate.service", "the-business-circle-network-rollback-probe.service", "circle-card.service"].map((name) => source(`systemd/${name}`));
    for (const template of templates) {
      const first = renderSystemdUnit(template, operationsIdentity), second = renderSystemdUnit(template, "e".repeat(40));
      expect(first.rendered).toContain(`/deployment-packs/${operationsIdentity}/runtime-launcher.mjs`);
      expect(first.rendered).not.toMatch(/deployment-packs\/current|@@PHASE_F1/u);
      expect(first.sha256).not.toBe(second.sha256);
    }
    const handoff = renderSystemdUnit(source("systemd/pm2-root.service.d/phase-f1-handoff.conf"), operationsIdentity);
    expect(handoff.rendered).toContain(`/deployment-packs/${operationsIdentity}/boot-owner-condition.mjs`);
    expect(() => renderSystemdUnit(templates[0], "agent/circle-card-domain-breakaway")).toThrow(/commit/u);
    expect(() => renderSystemdUnit(templates[0].replaceAll("@@PHASE_F1_PACK_DIR@@", "/opt/thebusinesscircle/deployment-packs/current"), operationsIdentity)).toThrow();
  });

  it("binds readable boot eligibility to the exact selector, state and artifact", () => {
    const record = { format: "phase-f1-boot-eligibility-v1", operationsIdentity, activeBcnSelector: "rollback", selectedArtifactRole: "rollback", applicationSha: rollbackSha, artifactDigest: "1".repeat(64), durableStateDigest: "2".repeat(64), eligibilityGeneration: 7 } as const;
    expect(validateBootEligibility(record, { operationsIdentity, selectorTarget: `/var/www/rollbacks/${rollbackSha}`, previousGeneration: 6 })).toEqual(record);
    expect(() => validateBootEligibility({ ...record, artifactDigest: "3".repeat(64) }, { operationsIdentity, selectorTarget: `/var/www/releases/${applicationSha}`, previousGeneration: 6 })).toThrow(/unapproved/u);
    expect(() => validateBootEligibility(record, { operationsIdentity, selectorTarget: `/var/www/rollbacks/${rollbackSha}`, previousGeneration: 7 })).toThrow(/stale/u);
  });

  it("publishes boot eligibility atomically from protected identity inputs", () => {
    const directory = temp(), state = join(directory, "state.json"), bindings = join(directory, "bindings.json"), artifact = join(directory, "artifact.json"), output = join(directory, "eligibility", "bcn.json");
    writeFileSync(state, "state\n");
    writeFileSync(bindings, JSON.stringify({ activeBcnSelector: "forward" }));
    writeFileSync(artifact, JSON.stringify({ applicationSha, applicationRole: "forward-bcn", operationsIdentity, artifactDigest: "a".repeat(64) }));
    const published = publishBootEligibility({ statePath: state, bindingsPath: bindings, artifactIdentityPath: artifact, outputPath: output, operationsIdentity });
    expect(published).toMatchObject({ selectedArtifactRole: "forward", applicationSha, eligibilityGeneration: 1 });
    writeFileSync(artifact, JSON.stringify({ applicationSha: rollbackSha, applicationRole: "rollback-bcn", operationsIdentity, artifactDigest: "b".repeat(64) }));
    expect(() => publishBootEligibility({ statePath: state, bindingsPath: bindings, artifactIdentityPath: artifact, outputPath: output, operationsIdentity })).toThrow(/mismatch/u);
  });
});

describe("Phase F1 application and environment identity", () => {
  it("pins forward, rollback, historical and operations identities separately", () => {
    expect(groups.APPROVED_SHA).toBe(applicationSha);
    expect(groups.FORWARD_APPLICATION_SHA).toBe(applicationSha);
    expect(groups.ROLLBACK_APPLICATION_SHA).toBe(rollbackSha);
    expect(groups.HISTORICAL_PRODUCTION_SHA).toBe(HISTORICAL_PRODUCTION_SHA);
    expect(new Set([applicationSha, rollbackSha, HISTORICAL_PRODUCTION_SHA, operationsIdentity]).size).toBe(4);
    expect(source("common.sh")).toContain(`PHASE_F1_FORWARD_SHA="${applicationSha}"`);
    expect(source("common.sh")).toContain(`PHASE_F1_ROLLBACK_SHA="${rollbackSha}"`);
    expect(source("create-pack-artifact.mjs")).toContain(`const ROLLBACK_APPLICATION_SHA = "${rollbackSha}"`);
    expect(source("prepare-checkout.sh")).toContain("checkout --detach");
    expect(source("prepare-checkout.sh")).not.toMatch(/checkout\s+agent\//);
  });

  it("verifies exact reviewed application commit structures and rejects substitution", () => {
    const repository = temp();
    const git = (...args: string[]) => execFileSync("git", args, { cwd: repository, encoding: "utf8", env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: join(repository, "missing.gitconfig") } }).trim();
    git("init", "--quiet"); git("config", "user.name", "Phase F1 Test"); git("config", "user.email", "phase-f1@example.invalid");
    writeFileSync(join(repository, "next.config.ts"), "export default {};\n"); git("add", "next.config.ts"); git("commit", "--quiet", "-m", "base");
    const parentSha = git("rev-parse", "HEAD");
    mkdirSync(join(repository, "docs")); mkdirSync(join(repository, "src", "config"), { recursive: true });
    writeFileSync(join(repository, "next.config.ts"), "export default { cacheMaxMemorySize: 52428800 };\n");
    writeFileSync(join(repository, "docs", "rollback.md"), "rollback\n");
    writeFileSync(join(repository, "src", "config", "rollback.test.ts"), "export {};\n");
    git("add", "--all"); git("commit", "--quiet", "-m", "candidate");
    const candidateSha = git("rev-parse", "HEAD");
    const expected = { rollback: { sha: candidateSha, parentSha, files: [
      { status: "A", mode: "100644", path: "docs/rollback.md" },
      { status: "M", mode: "100644", path: "next.config.ts" },
      { status: "A", mode: "100644", path: "src/config/rollback.test.ts" }
    ] } };
    expect(verifyApplicationCommit(repository, "rollback", expected)).toMatchObject({ applicationSha: candidateSha, parentSha });
    expect(() => verifyApplicationCommit(repository, "rollback", { rollback: { ...expected.rollback, parentSha: "0".repeat(40) } })).toThrow(/wrong parent/u);
    writeFileSync(join(repository, "next.config.ts"), "export default { cacheMaxMemorySize: 52428800, followUp: true };\n");
    git("add", "--all"); git("commit", "--quiet", "-m", "follow-up");
    const followUpSha = git("rev-parse", "HEAD");
    const stacked = { forward: {
      sha: followUpSha,
      parentSha: candidateSha,
      reviewBaseSha: parentSha,
      files: expected.rollback.files
    } };
    expect(verifyApplicationCommit(repository, "forward", stacked)).toMatchObject({
      applicationSha: followUpSha,
      parentSha: candidateSha,
      reviewBaseSha: parentSha
    });
    writeFileSync(join(repository, "fourth.ts"), "unexpected\n");
    expect(() => verifyApplicationCommit(repository, "forward", stacked)).toThrow(/exact clean/u);
    expect(APPLICATION_IDENTITIES.rollback).toMatchObject({ sha: rollbackSha, parentSha: HISTORICAL_PRODUCTION_SHA });
  }, 15_000);

  it("round-trips supported fake values byte-for-byte", () => {
    const values = { A: "apostrophe' \\n \\r \\t \\\\ # $ = spaces", EMPTY: "", UNICODE: "caf\u00e9 \u00a3", URL: "postgresql://u:p%23%24%3D@127.0.0.1:5432/db" };
    const rendered = serialization.renderEnvironmentJson(values);
    expect(JSON.parse(rendered)).toEqual(values);
    expect(parseEnvironmentJson(rendered)).toEqual(values);
  });

  it("rejects duplicates, multiline controls, placeholders and conflicting overrides", () => {
    expect(() => serialization.parseDotEnvSource("A=one\r\nA=two\r\n", "fake")).toThrow(/Duplicate/);
    expect(() => serialization.renderEnvironmentJson({ A: "one\ntwo" })).toThrow(/Multiline/);
    expect(() => serialization.buildEnvironment(["A"], ["A"], [{ A: "one" }, { A: "two" }])).toThrow(/Conflicting/);
    expect(serialization.buildEnvironment(["A"], ["A"], [{ A: "one" }, { A: "two" }], { A: "reviewed" }).result.A).toBe("reviewed");
    expect(() => serialization.buildEnvironment(["A"], ["A"], [{ A: "changeme" }])).toThrow(/Placeholder/);
    expect(serialization.buildEnvironment(["A"], ["A"], [{ A: "xreplace-withx-legitimate" }]).result.A).toBe("xreplace-withx-legitimate");
  });

  it("classifies every statically named application environment read", () => {
    expect(unclassifiedEnvironmentNames(root)).toEqual([]);
    expect(groups.CIRCLE_ALLOWED_KEYS).not.toContain("STRIPE_WEBHOOK_SECRET");
    expect(groups.CIRCLE_ALLOWED_KEYS).not.toContain("RESEND_API_KEY");
    expect(groups.BCN_ALLOWED_KEYS).toContain("CIRCLE_CARD_RESEND_API_KEY");
    for (const toolingName of ["POSTGRES_PASSWORD", "ADMIN_PASSWORD", "SEED_MODE"]) {
      expect(groups.BCN_ALLOWED_KEYS).not.toContain(toolingName);
      expect(groups.CIRCLE_ALLOWED_KEYS).not.toContain(toolingName);
      expect(groups.TOOLING_ONLY_KEYS).toContain(toolingName);
    }
    expect(groups.RUNTIME_VALUES["circle-card"]).toMatchObject({ APP_BRAND: "circle-card", HOSTNAME: "127.0.0.1", PORT: "3200" });
  });
});

describe("Phase F1 build lifecycle and complete release sealing", () => {
  it("keeps non-reusable build-attempt state outside the checkout", () => {
    const directory = temp(), attempt = join(directory, "attempt.json"), workspace = join(directory, "checkout"); mkdirSync(workspace);
    expect(createBuildAttempt(attempt, { role: "forward", applicationSha, workspace, attemptId: "1".repeat(24) })).toMatchObject({ status: "prepared", path: resolve(workspace) });
    expect(consumeBuildAttempt(attempt, { role: "forward", applicationSha })).toMatchObject({ status: "consumed" });
    expect(() => consumeBuildAttempt(attempt, { role: "forward", applicationSha })).toThrow(/stale|reused/u);
    expect(finishBuildAttempt(attempt, "failed")).toMatchObject({ status: "failed" });
    expect(() => finishBuildAttempt(attempt, "complete")).toThrow(/consumed/u);
    expect(() => createBuildAttempt(attempt, { role: "forward", applicationSha, workspace })).toThrow(/exists/u);
  });

  it("rejects unexpected ignored build input while classifying only generated roots", () => {
    const repository = temp();
    const git = (...args: string[]) => execFileSync("git", args, { cwd: repository, encoding: "utf8", env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: join(repository, "missing.gitconfig") } }).trim();
    git("init", "--quiet"); git("config", "user.name", "Phase F1 Test"); git("config", "user.email", "phase-f1@example.invalid");
    writeFileSync(join(repository, ".gitignore"), "node_modules/\n.next/\nignored-authority/\n"); writeFileSync(join(repository, "package.json"), "{}\n"); git("add", "."); git("commit", "--quiet", "-m", "base");
    expect(assertBuildWorkspaceInputs(repository, "fresh")).toMatchObject({ ignoredCount: 0 });
    mkdirSync(join(repository, "node_modules")); writeFileSync(join(repository, "node_modules", "locked-dependency.js"), "ok\n");
    expect(assertBuildWorkspaceInputs(repository, "post-install").allowedPrefixes).toEqual(["node_modules/"]);
    mkdirSync(join(repository, "ignored-authority")); writeFileSync(join(repository, "ignored-authority", "unexpected.js"), "bad\n");
    expect(() => assertBuildWorkspaceInputs(repository, "post-build")).toThrow(/unexpected/iu);
  });

  it.runIf(process.platform !== "win32")("seals dependencies, public assets, helpers and approved storage links", () => {
    const release = temp(), storage = join(release, "storage-targets"); mkdirSync(storage);
    const targets: Record<string, string> = {};
    for (const relativePath of ["public/uploads", ".uploads", "public/generated/community-source-previews"]) {
      const target = join(storage, relativePath.replaceAll("/", "-")); mkdirSync(target, { recursive: true });
      const link = join(release, relativePath); mkdirSync(resolve(link, ".."), { recursive: true }); symlinkSync(target, link, "dir"); targets[relativePath] = resolve(target);
    }
    mkdirSync(join(release, "node_modules", "pkg"), { recursive: true }); mkdirSync(join(release, "node_modules", ".bin"), { recursive: true });
    writeFileSync(join(release, "node_modules", "pkg", "index.js"), "module.exports=1\n");
    symlinkSync(join(release, "node_modules", "pkg", "index.js"), join(release, "node_modules", ".bin", "pkg"), "file");
    mkdirSync(join(release, "public"), { recursive: true }); writeFileSync(join(release, "public", "asset.txt"), "asset\n"); writeFileSync(join(release, "runtime-helper.mjs"), "export default true\n");
    const manifest = createReleaseManifest(release, { storageTargets: targets });
    expect(verifyReleaseManifest(release, manifest, { storageTargets: targets })).toMatch(/^[0-9a-f]{64}$/u);
    writeFileSync(join(release, "node_modules", "pkg", "index.js"), "tampered\n"); expect(() => verifyReleaseManifest(release, manifest, { storageTargets: targets })).toThrow(/mismatch/u);
    writeFileSync(join(release, "node_modules", "pkg", "index.js"), "module.exports=1\n"); writeFileSync(join(release, "public", "asset.txt"), "changed\n"); expect(() => verifyReleaseManifest(release, manifest, { storageTargets: targets })).toThrow(/mismatch/u);
    writeFileSync(join(release, "public", "asset.txt"), "asset\n"); writeFileSync(join(release, "runtime-helper.mjs"), "changed\n"); expect(() => verifyReleaseManifest(release, manifest, { storageTargets: targets })).toThrow(/mismatch/u);
  });

  it("detects tampering across dependencies, public assets and runtime helpers on every platform", () => {
    const release = temp(); mkdirSync(join(release, "node_modules", "pkg"), { recursive: true }); mkdirSync(join(release, "public"));
    writeFileSync(join(release, "node_modules", "pkg", "index.js"), "module.exports=1\n"); writeFileSync(join(release, "public", "asset.txt"), "asset\n"); writeFileSync(join(release, "runtime-helper.mjs"), "export default true\n");
    const manifest = createContentManifest(release);
    for (const [path, body] of [["node_modules/pkg/index.js", "changed\n"], ["public/asset.txt", "changed\n"], ["runtime-helper.mjs", "changed\n"]]) {
      const absolute = join(release, path); const original = readFileSync(absolute); writeFileSync(absolute, body);
      expect(createContentManifest(release)).not.toBe(manifest); writeFileSync(absolute, original);
    }
    expect(createContentManifest(release)).toBe(manifest);
    const external = temp(); linkSync(join(release, "runtime-helper.mjs"), join(external, "helper-link.mjs"));
    expect(() => createContentManifest(release)).toThrow(/hard-linked/iu);
  });

  it("rejects storage-link substitution and missing required runtime output", () => {
    const runtime = temp(); writeFileSync(join(runtime, "BUILD_ID"), "id\n"); mkdirSync(join(runtime, "server")); mkdirSync(join(runtime, "static"));
    expect(() => assertRuntimeCacheExcluded(runtime)).not.toThrow();
    rmSync(join(runtime, "server"), { recursive: true }); expect(() => assertRuntimeCacheExcluded(runtime)).toThrow(/missing/u);
    mkdirSync(join(runtime, "server")); mkdirSync(join(runtime, "cache", "images"), { recursive: true }); expect(() => assertRuntimeCacheExcluded(runtime)).toThrow(/forbidden/u);
  });

  it("pins the Next implementation whose build cache is excluded", () => {
    const nextPackage = JSON.parse(readFileSync(join(root, "node_modules", "next", "package.json"), "utf8"));
    const fileCache = readFileSync(join(root, "node_modules", "next", "dist", "server", "lib", "incremental-cache", "file-system-cache.js"), "utf8");
    const imageCache = readFileSync(join(root, "node_modules", "next", "dist", "server", "image-optimizer.js"), "utf8");
    expect(nextPackage.version).toBe("15.5.15");
    expect(fileCache).toMatch(/flushToDisk/u);
    expect(imageCache).toMatch(/isrFlushToDisk/u);
    expect(source("build-release.sh")).toContain("rm -rf -- .next/cache");
    expect(source("prepare-rollback-artifact.sh")).toContain("--exclude=.next/cache/");
  });
});

describe("Phase F1 protected environment and release ordering", () => {
  it("publishes commit-bound environment-only readiness before release creation", () => {
    const validator = source("validate-environments.sh");
    const readiness = source("environment-readiness.mjs");
    const common = source("common.sh");
    const build = source("build-release.sh");
    expect(validator).toContain('environment-readiness.mjs" publish');
    expect(validator).not.toContain("require_release_integrity");
    expect(readiness).toContain('"phase-f1-environment-readiness-v1"');
    expect(readiness).toContain('releaseIntegrity: "NOT_EVALUATED"');
    expect(readiness).toContain("publishNoReplaceSet");
    expect(readiness).not.toMatch(/skip-integrity|SKIP_RELEASE_INTEGRITY/iu);
    expect(common).toContain('environment-readiness.mjs" verify');
    expect(build.indexOf("require_environment_ready")).toBeLessThan(build.indexOf("npm ci"));
    expect(build.indexOf("require_release_integrity")).toBeGreaterThan(build.indexOf("release-create"));
  });

  it("keeps complete release integrity mandatory for preflight, starts and traffic changes", () => {
    for (const name of [
      "preflight-read-only.sh",
      "start-systemd-candidates.sh",
      "probe-rollback-candidate.sh",
      "adopt-systemd-boot-owner.sh",
      "cutover-systemd.sh",
      "finalise-systemd.sh",
      "rollback-systemd.sh",
      "record-traffic-switch.sh",
      "remove-circle-card-traffic.sh"
    ]) {
      const body = source(name);
      expect(body, name).toContain("require_environment_ready");
      expect(body, name).toContain("require_release_integrity");
    }
    expect(source("preflight-read-only.sh")).toContain('validate-environment.mjs" bcn');
    expect(source("preflight-read-only.sh")).toContain('validate-environment.mjs" circle-card');
  });

  it("includes the ordering validator and adversarial tests in deterministic publications", () => {
    const fixture = createCommittedPackFixture();
    const output = join(fixture.outputs, "environment-ordering");
    execFileSync("node", ["ops/deploy/phase-f1/create-pack-artifact.mjs", fixture.commit, output], {
      cwd: fixture.repository,
      stdio: "pipe"
    });
    const members = tarMembers(readFileSync(join(output, "phase-f1-pack.tar")));
    for (const name of ["environment-readiness.mjs", "environment-readiness.node-test.mjs"]) {
      expect(
        assertArchiveMemberEqualsCommittedBlob(
          members,
          fixture.repository,
          fixture.commit,
          name
        )
      ).toEqual(
        readCommittedBlob(
          fixture.repository,
          fixture.commit,
          `ops/deploy/phase-f1/${name}`
        )
      );
    }
  }, 60_000);
});

describe("Phase F1 durable state and rollback evidence", () => {
  const identities = { forwardApplicationSha: applicationSha, rollbackApplicationSha: rollbackSha, historicalProductionSha: HISTORICAL_PRODUCTION_SHA, operationsIdentity };
  const bindings = { forwardBcnArtifactDigest: "1".repeat(64), forwardCircleCardArtifactDigest: "2".repeat(64), rollbackBcnArtifactDigest: "3".repeat(64), forwardRehearsalEvidence: "4".repeat(64), rollbackRehearsalEvidence: "5".repeat(64), databaseIdentity: "6".repeat(64), storageConvergenceIdentity: "pending", systemdUnitIdentity: "7".repeat(64), activeBcnSelector: "legacy", circleCardTrafficStatus: "private" };
  it("persists only legal sequential transitions and detects tampering", () => {
    const stateRoot = join(temp(), "state");
    transition(stateRoot, "none", "prepared", identities, { manifest: "a" }, bindings);
    expect(readState(stateRoot)).toMatchObject({ stage: "prepared", sequence: 1, identities, bindings });
    expect(() => transition(stateRoot, "prepared", "writers-frozen", identities, {}, bindings)).toThrow(/Illegal/);
    transition(stateRoot, "prepared", "candidates-verified", identities, { smoke: "passed" }, bindings);
    expect(readState(stateRoot).stage).toBe("candidates-verified");
    expect(() => transition(stateRoot, "candidates-verified", "freezing", { ...identities, rollbackApplicationSha: applicationSha }, {}, bindings)).toThrow(/substituted|conflated/u);
    expect(() => transition(stateRoot, "candidates-verified", "freezing", identities, {}, { ...bindings, rollbackBcnArtifactDigest: "8".repeat(64) })).toThrow(/binding changed/u);
    transition(stateRoot, "candidates-verified", "freezing", identities, { rebootOwner: "none" }, bindings);
    transition(stateRoot, "freezing", "writers-frozen", identities, { ports: "free" }, bindings);
    expect(readState(stateRoot).stage).toBe("writers-frozen");
    const path = join(stateRoot, "state.json");
    const parsed = JSON.parse(readFileSync(path, "utf8")); parsed.payload.stage = "forward-live"; writeFileSync(path, JSON.stringify(parsed));
    expect(() => readState(stateRoot)).toThrow(/checksum/);
  });

  it("binds rollback proof to every evidence file and detects later mutation", () => {
    const directory = temp();
    const names = requiredRollbackEvidence;
    const evidence = Object.fromEntries(names.map((name) => { const path = join(directory, `${name}.txt`); writeFileSync(path, `${name}\n`); return [name, path]; }));
    const identity = { rollbackApplicationSha: rollbackSha, historicalParentSha: HISTORICAL_PRODUCTION_SHA, commitFileSet: ROLLBACK_COMMIT_FILE_SET };
    const proof = join(directory, "proof.json"); createRollbackProof(proof, identity, evidence);
    expect(verifyRollbackProof(proof, identity).rollbackApplicationSha).toBe(rollbackSha);
    expect(() => verifyRollbackProof(proof, { ...identity, rollbackApplicationSha: applicationSha })).toThrow(/identity/u);
    writeFileSync(evidence.privateSmokeEvidence, "changed\n");
    expect(() => verifyRollbackProof(proof, identity)).toThrow(/changed/);
  });

  it("models forward BCN adoption as a rollback-owned pending transaction", () => {
    const stateRoot = join(temp(), "state"), storageDigest = "8".repeat(64);
    let currentBindings = { ...bindings };
    const advance = (from: string, to: string, patch: Record<string, string> = {}) => {
      currentBindings = { ...currentBindings, ...patch };
      return transition(stateRoot, from, to, identities, { simulated: to }, currentBindings);
    };
    advance("none", "prepared"); advance("prepared", "candidates-verified"); advance("candidates-verified", "freezing"); advance("freezing", "writers-frozen");
    advance("writers-frozen", "storage-converged", { storageConvergenceIdentity: storageDigest });
    advance("storage-converged", "rollback-boot-ready", { activeBcnSelector: "rollback", circleCardTrafficStatus: "disabled" });
    advance("rollback-boot-ready", "rollback-live");
    advance("rollback-live", "forward-bcn-switch-pending");
    expect(readState(stateRoot)).toMatchObject({ stage: "forward-bcn-switch-pending", bindings: { activeBcnSelector: "rollback", circleCardTrafficStatus: "disabled" } });
    expect(() => advance("forward-bcn-switch-pending", "forward-bcn-starting", { activeBcnSelector: "rollback" })).toThrow(/forward selector/u);
    advance("forward-bcn-switch-pending", "forward-bcn-starting", { activeBcnSelector: "forward", circleCardTrafficStatus: "private" });
    expect(readState(stateRoot).stage).toBe("forward-bcn-starting");
    advance("forward-bcn-starting", "rollback-live", { activeBcnSelector: "rollback", circleCardTrafficStatus: "disabled" });
    expect(readState(stateRoot)).toMatchObject({ stage: "rollback-live", bindings: { activeBcnSelector: "rollback" } });
  });

  it("rejects Circle traffic removal state until routing is durably disabled", () => {
    const stateRoot = join(temp(), "state"), stable = { ...bindings, storageConvergenceIdentity: "8".repeat(64) };
    transition(stateRoot, "none", "prepared", identities, {}, stable);
    transition(stateRoot, "prepared", "candidates-verified", identities, {}, stable);
    transition(stateRoot, "candidates-verified", "freezing", identities, {}, stable);
    transition(stateRoot, "freezing", "writers-frozen", identities, {}, stable);
    transition(stateRoot, "writers-frozen", "storage-converged", identities, {}, stable);
    const rollbackBinding = { ...stable, activeBcnSelector: "rollback", circleCardTrafficStatus: "disabled" };
    transition(stateRoot, "storage-converged", "rollback-boot-ready", identities, {}, rollbackBinding);
    transition(stateRoot, "rollback-boot-ready", "rollback-live", identities, {}, rollbackBinding);
    transition(stateRoot, "rollback-live", "forward-bcn-switch-pending", identities, {}, rollbackBinding);
    const forwardPrivate = { ...stable, activeBcnSelector: "forward", circleCardTrafficStatus: "private" };
    transition(stateRoot, "forward-bcn-switch-pending", "forward-bcn-starting", identities, {}, forwardPrivate);
    transition(stateRoot, "forward-bcn-starting", "forward-bcn-live", identities, {}, forwardPrivate);
    transition(stateRoot, "forward-bcn-live", "forward-live", identities, {}, forwardPrivate);
    expect(() => transition(stateRoot, "forward-live", "circle-traffic-removed", identities, {}, forwardPrivate)).toThrow(/disabled routing/u);
    const forwardDisabled = { ...forwardPrivate, circleCardTrafficStatus: "disabled" };
    expect(transition(stateRoot, "forward-live", "circle-traffic-removed", identities, {}, forwardDisabled).stage).toBe("circle-traffic-removed");
    expect(transition(stateRoot, "circle-traffic-removed", "rollback-switch-pending", identities, {}, forwardDisabled).stage).toBe("rollback-switch-pending");
    const rollbackDisabled = { ...forwardDisabled, activeBcnSelector: "rollback" };
    expect(transition(stateRoot, "rollback-switch-pending", "rollback-starting", identities, {}, rollbackDisabled).stage).toBe("rollback-starting");
    expect(transition(stateRoot, "rollback-starting", "circle-traffic-removed", identities, {}, forwardDisabled).stage).toBe("circle-traffic-removed");
  });
});

describe("Phase F1 storage convergence and authority", () => {
  it("detects changed names, destination-only files, hidden and zero-byte files", () => {
    const base = temp(), sourceRoot = join(base, "source"), destination = join(base, "destination"); mkdirSync(sourceRoot); mkdirSync(destination);
    writeFileSync(join(sourceRoot, "same"), "new"); writeFileSync(join(destination, "same"), "old");
    writeFileSync(join(sourceRoot, ".hidden"), "hidden"); writeFileSync(join(sourceRoot, "zero"), ""); writeFileSync(join(destination, "destination-only"), "keep");
    const result = compareStorage(sourceRoot, destination);
    expect(result.changed).toContain("same"); expect(result.destinationOnly).toContain("destination-only");
    expect(storageInventory(sourceRoot).some((row) => row.endsWith(" .hidden"))).toBe(true);
    expect(storageInventory(sourceRoot).some((row) => row.includes(" 0 zero"))).toBe(true);
  });

  it("rejects nested links and models narrow service access", () => {
    const directory = temp(); writeFileSync(join(directory, "target"), "x");
    try { symlinkSync(join(directory, "target"), join(directory, "link")); expect(() => storageInventory(directory)).toThrow(/symlink/); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "EPERM") throw error; }
    const bcnUnit = source("systemd/the-business-circle-network.service"), circleUnit = source("systemd/circle-card.service");
    expect(bcnUnit).toContain("/var/www/shared/private/direct-messages");
    expect(circleUnit).not.toMatch(/direct-messages|founder-services|\/wins|visual-media|community-source-previews/);
    expect(circleUnit).toContain("/var/www/shared/private/circle-card-link-files");
  });
});

describe("Phase F1 structural process and listener policy", () => {
  it("parses kernel listener tables and rejects wildcard, duplicates and wrong PID inodes", () => {
    const header = "sl local_address rem_address st tx_queue rx_queue tr tm->when retrnsmt uid timeout inode";
    const line = "0: 0100007F:0C80 00000000:0000 0A 00000000:00000000 00:00000000 00000000 1000 0 4242";
    const entries = parseProcNet(`${header}\n${line}\n`, 4);
    expect(assertExactListener(entries, { address: "127.0.0.1", port: 3200, inodes: new Set(["4242"]) })).toMatchObject({ port: 3200 });
    expect(() => assertExactListener(entries, { address: "127.0.0.1", port: 3200, inodes: new Set(["9"]) })).toThrow();
    expect(() => assertExactListener([...entries, ...entries], { address: "127.0.0.1", port: 3200, inodes: new Set(["4242"]) })).toThrow();
  });

  it("uses systemd hardening and contains no deployable PM2 supervisor files", () => {
    for (const unit of ["the-business-circle-network.service", "circle-card.service"]) {
      const body = source(`systemd/${unit}`);
      for (const directive of ["NoNewPrivileges=true", "CapabilityBoundingSet=", "AmbientCapabilities=", "ProtectSystem=strict", "ProtectHome=true", "PrivateTmp=true", "UMask=0027", "StandardOutput=journal"]) expect(body).toContain(directive);
    }
    expect(source("runtime-launcher.mjs")).toContain('"127.0.0.1"');
    expect(source("runtime-launcher.mjs")).toContain("process.execve");
    expect(source("runtime-launcher.mjs")).toContain("process.getuid");
    const stableUnit = source("systemd/the-business-circle-network.service");
    expect(stableUnit.indexOf("ExecCondition=")).toBeGreaterThan(stableUnit.indexOf("[Service]"));
    expect(source("systemd/pm2-root.service.d/phase-f1-handoff.conf")).toMatch(/^\[Service\]/);
    const all = source("adopt-systemd-boot-owner.sh") + source("capture-legacy-baseline.mjs");
    expect(all).not.toMatch(/pm2\s+(kill|resurrect|save)|systemctl\s+(start|restart)\s+pm2-root/);
  });

  it("resolves exact runtime paths for every stable and private role", () => {
    const packPath = `/opt/thebusinesscircle/deployment-packs/${operationsIdentity}`;
    expect(resolveProcessExpectation("the-business-circle-network.service", `/var/www/rollbacks/${rollbackSha}`, packPath)).toMatchObject({ applicationRole: "rollback-bcn", applicationSha: rollbackSha, port: 3000, runtime: { NEXT_RUNTIME_DIST_DIR: ".next" } });
    expect(resolveProcessExpectation("the-business-circle-network.service", `/var/www/releases/${applicationSha}`, packPath)).toMatchObject({ applicationRole: "forward-bcn", applicationSha, port: 3000, runtime: { NEXT_RUNTIME_DIST_DIR: ".runtime/bcn" } });
    expect(resolveProcessExpectation("the-business-circle-network-candidate.service", `/var/www/releases/${applicationSha}`, packPath)).toMatchObject({ applicationRole: "forward-bcn", port: 3100, mode: "bcn-candidate" });
    expect(resolveProcessExpectation("the-business-circle-network-rollback-probe.service", `/var/www/rollbacks/${rollbackSha}`, packPath)).toMatchObject({ applicationRole: "rollback-bcn", port: 3300, runtime: { NEXT_RUNTIME_DIST_DIR: ".next" } });
    expect(resolveProcessExpectation("circle-card.service", `/var/www/releases/${applicationSha}`, packPath)).toMatchObject({ applicationRole: "forward-circle-card", port: 3200, runtime: { NEXT_RUNTIME_DIST_DIR: ".runtime/circle-card" } });
    expect(() => resolveProcessExpectation("the-business-circle-network.service", `/var/www/releases/${rollbackSha}`, packPath)).toThrow(/unapproved/iu);
    expect(() => resolveProcessExpectation("circle-card.service", `/var/www/releases/${applicationSha}`, "/opt/thebusinesscircle/deployment-packs/current")).toThrow(/operations/iu);
  });

  it("structurally parses systemd ExecStart and rejects process metadata mismatches", () => {
    const packPath = `/opt/thebusinesscircle/deployment-packs/${operationsIdentity}`, cwd = `/var/www/rollbacks/${rollbackSha}`;
    const expected = { ...resolveProcessExpectation("the-business-circle-network.service", cwd, packPath), uid: 1001, gid: 1001, workingDirectory: cwd, environmentNames: ["APP_BRAND", "HOSTNAME", "NEXT_RUNTIME_DIST_DIR", "PORT"], artifactDigest: "a".repeat(64) };
    const execStart = `{ path=/usr/bin/node ; argv[]=/usr/bin/node ${packPath}/runtime-launcher.mjs bcn-live ; ignore_errors=no ; }`;
    expect(parseSystemdExecStart(execStart)).toEqual(["/usr/bin/node", `${packPath}/runtime-launcher.mjs`, "bcn-live"]);
    const snapshot = { activeState: "active", user: "bcn-app", group: "bcn-app", noNewPrivileges: "yes", restart: "on-failure", uid: 1001, gid: 1001, groups: expected.groups, noNewPrivs: "1", capabilities: Array(5).fill("0000000000000000"), resolvedCwd: cwd, workingDirectory: cwd, execStart: parseSystemdExecStart(execStart), launcherMode: 0o444, command: ["/usr/bin/node", `${cwd}/node_modules/next/dist/bin/next`, "start", "-H", "127.0.0.1", "-p", "3000"], environmentNames: expected.environmentNames, environment: { ...expected.runtime }, artifactRole: "rollback-bcn", artifactSha: rollbackSha, artifactDigest: expected.artifactDigest };
    expect(verifyProcessSnapshot(snapshot, expected)).toBe(true);
    expect(() => verifyProcessSnapshot({ ...snapshot, groups: [...snapshot.groups, "sudo"] }, expected)).toThrow(/groups/u);
    expect(() => verifyProcessSnapshot({ ...snapshot, command: [...snapshot.command.slice(0, -1), "3001"] }, expected)).toThrow(/command/u);
    expect(() => verifyProcessSnapshot({ ...snapshot, launcherMode: 0o555 }, expected)).toThrow(/mode/u);
    expect(() => verifyProcessSnapshot({ ...snapshot, capabilities: ["1", ...snapshot.capabilities.slice(1)] }, expected)).toThrow(/capabilities/u);
  });

  it("records cleanup ownership before candidate start and rejects stale or wrong invocations", () => {
    const directory = temp(), ownership = join(directory, "invocation.json");
    expect(createCandidateInvocation(ownership, "circle-card.service", 3200, { invocationId: "a".repeat(24) })).toMatchObject({ cleanupRequired: true, preState: "inactive" });
    expect(readCandidateInvocation(ownership, "circle-card.service", 3200)).toMatchObject({ unit: "circle-card.service" });
    expect(() => readCandidateInvocation(ownership, "the-business-circle-network-candidate.service", 3100)).toThrow(/invalid/u);
    expect(() => createCandidateInvocation(join(directory, "active.json"), "circle-card.service", 3200, { preState: "activating" })).toThrow(/pre-state/u);
    expect(() => createCandidateInvocation(join(directory, "occupied.json"), "circle-card.service", 3200, { portWasFree: false })).toThrow(/pre-state/u);
  });

  it("fails candidate cleanup for stop, activation, PID, listener or journal residue", () => {
    const clean = { activeState: "inactive", journalPreserved: true, mainPid: 0, ownershipVerified: true, port: 3200, portFree: true, stopSucceeded: true, unit: "circle-card.service" };
    expect(validateCandidateCleanupResult(clean)).toBe(true);
    for (const changed of [{ stopSucceeded: false }, { activeState: "activating" }, { mainPid: 42 }, { portFree: false }, { journalPreserved: false }]) expect(() => validateCandidateCleanupResult({ ...clean, ...changed })).toThrow(/terminal/u);
  });

  it("uses real shell control flow to attempt every owned cleanup after each first-unit failure", () => {
    const bash = process.platform === "win32" ? "C:/Program Files/Git/bin/bash.exe" : "/bin/bash";
    for (const failure of ["journal", "stop", "inactive", "pid", "port", "both-port"]) {
      const directory = temp(), script = join(directory, "cleanup-fixture.sh"), state = join(directory, "state"); mkdirSync(state);
      const common = join(pack, "common.sh").replaceAll("\\", "/");
      const first = join(state, "first.owner"), second = join(state, "second.owner");
      createCandidateInvocation(first, "the-business-circle-network-candidate.service", 3100, { invocationId: "a".repeat(24) }); createCandidateInvocation(second, "circle-card.service", 3200, { invocationId: "b".repeat(24) }); chmodSync(first, 0o600); chmodSync(second, 0o600);
      writeFileSync(join(state, "malformed.owner"), "{\n");
      createCandidateInvocation(join(state, "stale.owner"), "circle-card.service", 3200, { invocationId: "c".repeat(24) });
      writeFileSync(join(state, "unallowlisted.owner"), `${JSON.stringify({ cleanupRequired: true, format: "phase-f1-candidate-invocation-v1", invocationId: "d".repeat(24), port: 3000, preState: "inactive", unit: "the-business-circle-network.service" })}\n`);
      const node = process.execPath.replaceAll("\\", "/"), packPath = pack.replaceAll("\\", "/"), fixtureState = state.replaceAll("\\", "/");
      writeFileSync(script, `#!/usr/bin/env bash\nset -Eeuo pipefail\nsource '${common}'\nFIXTURE_STATE='${fixtureState}'\nNODE_BIN='${node}'\nPACK_PATH='${packPath}'\nFAILURE='${failure}'\nprintf active >"$FIXTURE_STATE/first.active"; printf 101 >"$FIXTURE_STATE/first.pid"; printf active >"$FIXTURE_STATE/second.active"; printf 202 >"$FIXTURE_STATE/second.pid"\ncandidate_invocation_command(){ local command=$1 path=$2; shift 2; if [[ $command == verify ]]; then "$NODE_BIN" --input-type=module -e 'const [modulePath,recordPath,unit,port]=process.argv.slice(1);process.argv.length=1;const {pathToFileURL}=await import("node:url");const m=await import(pathToFileURL(modulePath).href);m.readCandidateInvocation(recordPath,unit,Number(port));' "$PACK_PATH/candidate-invocation.mjs" "$path" "$@"; else "$NODE_BIN" "$PACK_PATH/candidate-invocation.mjs" "$command" "$path" "$@"; fi; }\ncandidate_listener_free_command(){ local port=$1 unit=second; [[ $port == 3100 ]] && unit=first; printf 'listener %s\\n' "$port" >>"$FIXTURE_STATE/commands.log"; [[ $unit == first && ( $FAILURE == port || $FAILURE == both-port ) ]] && return 1; [[ $unit == second && $FAILURE == both-port ]] && return 1; return 0; }\njournalctl(){ local unit=$2 key=second; [[ $unit == the-business-circle-network-candidate.service ]] && key=first; printf 'journal %s\\n' "$unit" >>"$FIXTURE_STATE/commands.log"; [[ $key == first && $FAILURE == journal ]] && return 1; return 0; }\nsystemctl(){ local action=$1 unit=$2 key=second; [[ $unit == the-business-circle-network-candidate.service ]] && key=first; if [[ $action == stop ]]; then printf 'stop %s\\n' "$unit" >>"$FIXTURE_STATE/commands.log"; if [[ $key == first && $FAILURE == inactive ]]; then return 0; fi; printf inactive >"$FIXTURE_STATE/$key.active"; if [[ $key == first && $FAILURE == pid ]]; then printf 101 >"$FIXTURE_STATE/$key.pid"; else printf 0 >"$FIXTURE_STATE/$key.pid"; fi; [[ $key == first && $FAILURE == stop ]] && return 1; return 0; fi; local property=; for arg in "$@"; do [[ $arg == --property=* ]] && property=\${arg#--property=}; done; [[ $property == ActiveState ]] && cat "$FIXTURE_STATE/$key.active" || cat "$FIXTURE_STATE/$key.pid"; }\nchown(){ :; }\nsleep(){ :; }\nowned=("the-business-circle-network-candidate.service|3100|$FIXTURE_STATE/first.owner" "the-business-circle-network-candidate.service|3100|$FIXTURE_STATE/missing.owner" "the-business-circle-network-candidate.service|3100|$FIXTURE_STATE/malformed.owner" "the-business-circle-network-candidate.service|3100|$FIXTURE_STATE/stale.owner" "the-business-circle-network.service|3000|$FIXTURE_STATE/unallowlisted.owner" "circle-card.service|3200|$FIXTURE_STATE/second.owner")\ncleanup_all_candidate_invocations owned "$FIXTURE_STATE"\n`, { mode: 0o700 });
      expect(() => execFileSync(bash, [script], { encoding: "utf8" })).toThrow();
      const commandLog = readFileSync(join(state, "commands.log"), "utf8");
      expect(commandLog).toContain("journal the-business-circle-network-candidate.service"); expect(commandLog).toContain("stop the-business-circle-network-candidate.service"); expect(commandLog).toContain("listener 3100");
      expect(commandLog).toContain("journal circle-card.service"); expect(commandLog).toContain("stop circle-card.service"); expect(commandLog).toContain("listener 3200"); expect(commandLog).not.toContain("the-business-circle-network.service");
      expect(readdirSync(state).filter((name) => name.startsWith("candidate-cleanup-")).length).toBe(6);
      expect(existsSync(join(state, "first.owner"))).toBe(true);
      for (const unsafe of ["malformed.owner", "stale.owner", "unallowlisted.owner"]) expect(existsSync(join(state, unsafe))).toBe(true);
      expect(existsSync(join(state, "second.owner"))).toBe(failure === "both-port");
      expect(readdirSync(state).some((name) => name.startsWith("candidate-cleaned-second.owner"))).toBe(failure !== "both-port");
    }
  }, 15_000);
});

describe("Phase F1 database, pack, Nginx and release gates", () => {
  const commonEvidence = { schemaVersion: 1, operationsIdentity, forwardApplicationSha: applicationSha, rollbackApplicationSha: rollbackSha, artifactIdentity: "1".repeat(64), systemdUnitIdentity: "2".repeat(64), nginxIdentity: "3".repeat(64), databaseIdentity: "4".repeat(64), storageIdentity: "5".repeat(64), executedAt: "2026-07-22T12:00:00.000Z", reviewer: "operator-review-1" };

  it("requires strict structured authenticated, active-routing and removal evidence", () => {
    const authenticated = { ...commonEvidence, kind: "authenticated", existingProPassed: true, freeUserPassed: true, independentSessionsPassed: true, noLiveEmailPassed: true, noRealChargePassed: true, operatorOnlyBillingPassed: true, sharedAccountIdentityPassed: true };
    expect(validateStructuredEvidence("authenticated", authenticated)).toEqual(authenticated);
    expect(() => validateStructuredEvidence("authenticated", { ...authenticated, noRealChargePassed: false })).toThrow(/gate/u);
    expect(() => validateStructuredEvidence("authenticated", { ...authenticated, unexpected: true })).toThrow(/unknown/u);
    const active = { ...commonEvidence, kind: "routing-active", bcnHomepagePassed: true, bcnWebhookPassed: true, cacheBypassPassed: true, circleCardPassed: true, circleOwnerRouteMatrixPassed: true, circleTrafficEnabled: true, hostRejectionPassed: true, mutatingHttpNeverRedirected: true, nginxSyntaxPassed: true };
    expect(validateStructuredEvidence("routing-active", active)).toEqual(active);
    expect(() => validateStructuredEvidence("routing-removed", active)).toThrow();
    const removed = { ...commonEvidence, kind: "routing-removed", bcnHomepagePassed: true, bcnWebhookPassed: true, circleTrafficRemoved: true, nginxSyntaxPassed: true, publicRouteProbePassed: true };
    expect(validateStructuredEvidence("routing-removed", removed)).toEqual(removed);
  });

  it("validates database backup evidence and rejects partial, stale or mismatched publication sets", () => {
    const directory = temp(), archive = Buffer.from("synthetic custom archive"); writeFileSync(join(directory, "database.dump"), archive);
    const record = { schemaVersion: 1, applicationIdentities: { forward: applicationSha, rollback: rollbackSha, historical: HISTORICAL_PRODUCTION_SHA }, databaseIdentitySha256: "6".repeat(64), archiveSha256: sha(archive), restoreListSha256: "7".repeat(64), archiveName: "database.dump", setName: "production-20260722T120000.123456789Z", archiveSizeBytes: archive.length, databaseSizeBytes: 1024 };
    writeFileSync(join(directory, "evidence.json"), `${JSON.stringify(record)}\n`); writeFileSync(join(directory, "database.dump.sha256"), `${record.archiveSha256}  database.dump\n`);
    expect(validateDatabaseBackupEvidence(record)).toEqual(record);
    expect(validatePublishedBackupSet(directory)).toEqual(record);
    writeFileSync(join(directory, "database.dump"), "changed"); expect(() => validatePublishedBackupSet(directory)).toThrow(/mismatch/u);
    writeFileSync(join(directory, "database.dump"), archive); writeFileSync(join(directory, "extra"), "partial"); expect(() => validatePublishedBackupSet(directory)).toThrow(/partial|extras/u);
    const linked = temp(), outsideLink = temp(); writeFileSync(join(linked, "database.dump"), archive); linkSync(join(linked, "database.dump"), join(outsideLink, "database.dump.link"));
    writeFileSync(join(linked, "evidence.json"), `${JSON.stringify(record)}\n`); writeFileSync(join(linked, "database.dump.sha256"), `${record.archiveSha256}  database.dump\n`);
    expect(() => validatePublishedBackupSet(linked)).toThrow(/unsafe/iu);
  });

  it("models the encoded owner-route and no-cache request matrix", () => {
    for (const path of OWNER_ROUTE_VARIANTS) {
      expect(isCircleOwnerRequestTarget(path)).toBe(true);
      for (const method of OWNER_ROUTE_METHODS) expect(expectedCircleHttpStatusClass(method, path)).toBe(404);
    }
    expect(expectedCircleHttpStatusClass("POST", "/safe")).toBe(405);
    expect(expectedCircleHttpStatusClass("GET", "/safe")).toBe(308);
    expect(() => assertUncachedPublicResponse(new Headers({ "cf-cache-status": "HIT" }))).toThrow(/stale/u);
    expect(assertUncachedPublicResponse(new Headers({ "cf-cache-status": "DYNAMIC" }))).toBe("DYNAMIC");
  });

  it("parses approved local TCP, IPv6 and Unix-socket database identities", () => {
    expect(parseDatabaseUrl("postgresql://u:p%23@127.0.0.1:5433/db?sslmode=prefer")).toMatchObject({ host: "127.0.0.1", port: "5433", password: "p#" });
    expect(parseDatabaseUrl("postgresql://u:p@[::1]/db")).toMatchObject({ host: "::1" });
    expect(parseDatabaseUrl("postgresql://u:p@localhost/db?host=%2Fvar%2Frun%2Fpostgresql")).toMatchObject({ host: "/var/run/postgresql", sslmode: "disable" });
    expect(() => parseDatabaseUrl("postgresql://u:p@db.example/db")).toThrow(/local/);
  });

  it("makes external bootstrap identity precede pack code and rejects archive links", () => {
    const bootstrap = source("bootstrap-install.sh");
    expect(bootstrap.indexOf("sha256sum \"${BASH_SOURCE[0]}\"")).toBeLessThan(bootstrap.indexOf("python3"));
    expect(bootstrap).toContain("not (item.isfile() or item.isdir())");
    expect(bootstrap).toContain("DESTINATION");
    expect(source("verify-pack-integrity.mjs")).toMatch(/nlink !== 1|nlink === 1/);
    expect(source("create-pack-artifact.mjs")).toContain("installed-pack.manifest");
  });

  it("commits one fail-closed renameat2 identity-exchange contract", () => {
    const utility = source("atomic-identity-exchange.py");
    const documentation = readFileSync(join(root, "docs", "circle-card-phase-f1-server-deployment-pack.md"), "utf8");
    expect(utility).toContain("library.renameat2");
    expect(utility).toContain("AT_FDCWD = -100");
    expect(utility).toContain("RENAME_EXCHANGE = 2");
    expect(utility).toContain("POST_EXCHANGE_VERIFICATION_FAILED");
    expect(utility).toContain("exchange_may_have_occurred=true");
    expect(utility).toContain("probe_cleanup=complete");
    expect(utility).toContain("phase-f1-identity-history");
    expect(utility).not.toMatch(/\bos\.(?:rename|replace)\s*\(/u);
    expect(utility).not.toMatch(/\b(?:shutil|subprocess)\b/u);
    expect(utility).not.toMatch(/\.(?:syscall)\s*\(/u);
    expect(utility).not.toMatch(/\bjson\.(?:load|loads|dump|dumps)\b/u);
    for (const option of [
      "--authority",
      "--exchange-slot",
      "--preserved-history",
      "--pre-authority-sha256",
      "--pre-slot-sha256",
      "--preserved-history-sha256",
      "--post-authority-sha256",
      "--post-slot-sha256",
      "--expected-parent",
      "--expected-size",
      "--directory"
    ]) expect(utility).toContain(`"${option}"`);
    expect(documentation).toContain("atomic-identity-exchange.py");
    expect(documentation).toContain("RENAME_EXCHANGE");
    expect(documentation).toContain("No inline or improvised Python");
    expect(documentation).toContain("exchange_may_have_occurred=true");
  });

  it("commits one value-free protected environment acquisition contract", () => {
    const utility = source("environment-acquisition.mjs");
    const tests = source("environment-acquisition.node-test.mjs");
    const documentation = readFileSync(join(root, "docs", "circle-card-phase-f1-server-deployment-pack.md"), "utf8");
    for (const mode of [
      "inspect",
      "validate-plan",
      "acquire",
      "verify-input",
      "destroy-input",
      "correct-plan"
    ]) {
      expect(utility).toContain(`"${mode}"`);
      expect(documentation).toContain(mode);
    }
    for (const selector of [
      "LIVE_BCN_PROCESS",
      "HISTORICAL_DOTENV",
      "HISTORICAL_DOTENV_PRODUCTION",
      "SECURE_OPERATOR_ENTRY",
      "GENERATED_NON_SECRET_DECISION",
      "OMIT"
    ]) expect(utility).toContain(`"${selector}"`);
    expect(utility).toContain('"/run/thebusinesscircle"');
    expect(utility).toContain('"/var/www/The-Business-Circle.Net/.env"');
    expect(utility).toContain('"/var/www/The-Business-Circle.Net/.env.production"');
    expect(utility).toContain(".env.backup-20260720-164833");
    expect(utility).toContain('openSync("/dev/tty", "r+")');
    expect(utility).toContain("publishNoReplaceSet");
    expect(utility).toContain("readProtectedReadiness");
    expect(utility).toContain(
      '"CLOUDINARY_REQUIRED_SHARED_SOURCE_TO_HISTORICAL_DOTENV_PRODUCTION"'
    );
    expect(utility).toContain(
      '"UPSTASH_REQUIRED_SHARED_SOURCE_TO_HISTORICAL_DOTENV_PRODUCTION"'
    );
    expect(utility).toContain(
      '"phase-f1-environment-selection-correction-report-v1"'
    );
    expect(utility).toContain("publishCorrectedSelectionPlan");
    expect(utility).toContain("buildCorrectedSelectionPlan");
    expect(utility).toContain("prior-plan-sha256");
    expect(utility).not.toMatch(/--(?:value|secret|token|password)\b/u);
    expect(utility).not.toMatch(/--(?:source-path|selector|variable)\b/u);
    expect(utility).not.toMatch(/shell:\s*true|execSync|\/bin\/(?:ba)?sh/u);
    expect(tests).toContain("Linux root tmpfs directory and atomic input behaviour");
    expect(tests).toContain(
      "immutable correction changes only the commit and three Cloudinary selectors"
    );
    expect(tests).toContain(
      "failed set verification guards partial correction publication"
    );
    expect(tests).toContain(
      "immutable Upstash correction changes the complete pair atomically"
    );
    expect(tests).toContain(
      "Upstash correction rejects KV and combined correction authority"
    );
    expect(documentation).toContain("Ad hoc `cp`, `grep`, `cat`, `printenv`, `pm2 env`");
    expect(documentation).toContain(
      "Immutable selection-plan correction across operations commits"
    );
    expect(documentation).toContain(
      "The old commit-bound plan remains byte-identical historical evidence"
    );
    expect(documentation).toContain(
      "atomically make that pack authoritative before using its correction mode"
    );
    expect(documentation).toContain(
      "UPSTASH_REQUIRED_SHARED_SOURCE_TO_HISTORICAL_DOTENV_PRODUCTION"
    );
    expect(documentation).toContain("secure erasure");

    const fixture = createCommittedPackFixture();
    const output = join(fixture.outputs, "environment-acquisition");
    execFileSync("node", ["ops/deploy/phase-f1/create-pack-artifact.mjs", fixture.commit, output], {
      cwd: fixture.repository,
      stdio: "pipe"
    });
    const members = tarMembers(readFileSync(join(output, "phase-f1-pack.tar")));
    for (const name of [
      "environment-acquisition.mjs",
      "environment-acquisition.node-test.mjs"
    ]) {
      expect(
        assertArchiveMemberEqualsCommittedBlob(
          members,
          fixture.repository,
          fixture.commit,
          name
        )
      ).toEqual(
        readCommittedBlob(
          fixture.repository,
          fixture.commit,
          `ops/deploy/phase-f1/${name}`
        )
      );
    }
  }, 60_000);

  it("commits a closed value-free preflight reporting boundary", () => {
    const reporter = source("report-environment.mjs");
    const gitStatusReporter = source("preflight-git-status-report.mjs");
    const pm2Reporter = source("preflight-pm2-report.mjs");
    const protectedPolicy = source("protected-source-policy.mjs");
    const contract = source("value-free-report-contract.mjs");
    const proof = source("value-free-preflight-static-proof.mjs");
    const tests = source("value-free-preflight.node-test.mjs");
    const preflight = source("preflight-read-only.sh");
    const documentation = readFileSync(
      join(root, "docs", "circle-card-phase-f1-server-deployment-pack.md"),
      "utf8"
    );
    expect(contract).toContain("VALUE_INSPECTION_ALLOWLIST");
    expect(contract).toContain("validateLegacyReportOutput");
    expect(contract).toContain("SYMBOLIC_SOURCE_IDENTIFIERS");
    expect(contract).toContain("validateGitStatusReportOutput");
    expect(reporter).toContain("projectAllowlistedValues(parsed)");
    expect(reporter).toContain("UNKNOWN_SOURCE_NAME_COUNT");
    expect(reporter).toContain("PROTECTED_BACKUP_DENIAL_CODE");
    expect(reporter).not.toMatch(/new Error\(`[^`]*\$\{(?:file|path|sourceId)/u);
    expect(reporter).not.toContain("sourceKeys");
    expect(reporter).not.toMatch(/Object\.(?:keys|entries|values)\(parsed\)/u);
    expect(pm2Reporter).toContain("SAFE_PM2_OUTPUT_KEYS");
    expect(pm2Reporter).toContain("records = null");
    expect(pm2Reporter).not.toMatch(/pm2_env\s*(?:\.|\[)\s*(?:args|argv)/u);
    expect(preflight).toContain(
      'pm2 jlist | node "${PACK_DIR}/preflight-pm2-report.mjs"'
    );
    expect(preflight).toContain("preflight-git-status-report.mjs");
    expect(preflight).not.toMatch(/status --short(?:\s|$)/u);
    expect(gitStatusReporter).toContain("PROTECTED_BACKUP_DENIAL_CODE");
    expect(gitStatusReporter).not.toMatch(
      /(?:stdout|stderr)[^\n]*(?:path|input)/u
    );
    expect(protectedPolicy).toContain("isProtectedBackupSelector");
    expect(protectedPolicy).not.toMatch(/stdout|stderr|console\./u);
    expect(preflight).not.toContain("args:env.args");
    expect(proof).toContain("proveValueFreePreflightCommit");
    expect(proof).toContain("phase-f1-value-free-preflight-static-proof-v2");
    expect(tests).toContain("exact committed Git blobs");
    expect(documentation).toContain("Raw PM2 JSON is held in memory");
    expect(documentation).toContain(
      "unknown names contribute only to an aggregate names-only count"
    );
    expect(documentation).toContain(
      "phase-f1-value-free-preflight-static-proof-v2"
    );
    expect(documentation).toContain("PROTECTED_BACKUP_SOURCE_DENIED");

    const fixture = createCommittedPackFixture();
    const output = join(fixture.outputs, "value-free-preflight");
    execFileSync(
      "node",
      ["ops/deploy/phase-f1/create-pack-artifact.mjs", fixture.commit, output],
      { cwd: fixture.repository, stdio: "pipe" }
    );
    const members = tarMembers(readFileSync(join(output, "phase-f1-pack.tar")));
    for (const name of [
      "preflight-pm2-report.mjs",
      "preflight-git-status-report.mjs",
      "protected-source-policy.mjs",
      "report-environment.mjs",
      "value-free-preflight-static-proof.mjs",
      "value-free-preflight.node-test.mjs",
      "value-free-report-contract.mjs"
    ]) {
      expect(
        assertArchiveMemberEqualsCommittedBlob(
          members,
          fixture.repository,
          fixture.commit,
          name
        )
      ).toEqual(
        readCommittedBlob(
          fixture.repository,
          fixture.commit,
          `ops/deploy/phase-f1/${name}`
        )
      );
    }
  }, 60_000);

  it("denies Circle owner methods before HTTP redirect and preserves BCN webhook ownership", () => {
    const nginx = source("nginx-dual-runtime.conf.example");
    expect(nginx).toContain("if ($request_method !~ ^(GET|HEAD)$) { return 405; }");
    expect(nginx).toContain("server_name circlecard.co.uk");
    expect(nginx).toContain("location = /api/stripe/webhook { return 404; }");
    expect(nginx).toContain("proxy_pass http://business_circle_next");
    expect(nginx).not.toContain("server_name www.");
  });

  it("requires non-skipped Ubuntu and authenticated release evidence", () => {
    expect(source("validate-release-gates.mjs")).toMatch(/skipped === true|skipped/);
    expect(source("post-switch-smoke-read-only.sh")).toContain("authenticated-smoke-evidence.json");
    expect(source("test-origin-tls-local.sh")).toContain("listener-verification.mjs\" free 8443");
    expect(source("test-origin-tls-local.sh")).toContain("cleanup failed");
  });

  it("hard-stops skipped rollback and forward application evidence", () => {
    const performance = { os: "Ubuntu 22.04.5 LTS", node: "v22.22.2", cpuCount: 4, ramGiB: 7.7, skipped: false, beforeRuntimeManifestSha256: "a".repeat(64), afterRuntimeManifestSha256: "a".repeat(64), immutableMutationCount: 0, eaccesCount: 0, image5xx: 0, crashes: 0, ooms: 0, systemdRestarts: 0, authenticatedRevalidationPassed: true, operatorHeadroomApproved: true, revalidatePathPassed: true, revalidateTagPassed: true, unstableCachePassed: true, upstreamBehaviorApproved: true, latencyApproved: true, cpuHeadroomApproved: true, rssGrowthApproved: true, imageLoad: Object.fromEntries(["cold", "sequential", "burst", "sustained"].map((phase) => [phase, { requests: 1, concurrency: 1, successes: 1, errors: 0, p50Ms: 1, p95Ms: 1, applicationCpuPercent: 1, systemCpuPercent: 1, processRssBytes: 1, availableMemoryBytes: 1 }])) };
    const rollbackFiles = ["docs/bcn-phase-e3-rollback-immutable-runtime-cache.md", "next.config.ts", "src/config/rollback-immutable-runtime-cache.test.ts"];
    const rollback = { identity: { role: "rollback", applicationSha: rollbackSha, parentSha: HISTORICAL_PRODUCTION_SHA }, provenance: { schemaVersion: 1, fixtureFormatVersion: "phase-e3-historical-bcn-next-15.5.15-v1", historicalBaseSha: HISTORICAL_PRODUCTION_SHA, rollbackCandidateCommitSha: rollbackSha, rollbackCandidateParentSha: HISTORICAL_PRODUCTION_SHA, sourceMode: "committed-candidate", candidateCommitFileSet: rollbackFiles, candidateCommitDiffDigest: "b".repeat(64), rollbackPurpose: "historical-bcn-immutable-runtime-rollback", buildIdentity: "historical-bcn", reviewedFiles: rollbackFiles.map((path) => ({ path, sha256: "1".repeat(64) })), reviewedFilesAggregateSha256: "c".repeat(64), nextConfigSha256: "2".repeat(64), packageJsonSha256: "3".repeat(64), packageLockJsonSha256: "4".repeat(64), nextVersion: "15.5.15", buildId: "synthetic-build-id", artifactManifest: { algorithm: "sha256", digest: "5".repeat(64), fileCount: 1, entries: [{ path: ".next/BUILD_ID", sha256: "6".repeat(64), size: 18 }] }, syntheticBuild: true, productionAuthorityPresent: false, outboundNetworkPolicy: "linux-network-namespace-no-routes-with-local-next-font-mock-v1" }, nextStart: { skipped: false, applicationSha: rollbackSha, provenanceSha256: "d".repeat(64), testSourceSha256: "e".repeat(64), applicationIdentitySha256: "f".repeat(64), buildIdSha256: "0".repeat(64), realNextStartPassed: true, historicalHomepagePassed: true, loginRedirectPassed: true, invalidStripeSignaturePassed: true, imageSignaturesPassed: true, runtimeManifestUnchanged: true, publicManifestUnchanged: true, fetchCacheAbsent: true, imageCacheAbsent: true }, rehearsal: { ...performance, applicationSha: rollbackSha, historicalBehaviorPassed: true, sharedStoragePassed: true, privateStoragePermissionsPassed: true }, imageLoad: { skipped: false, applicationSha: rollbackSha, approved: true } };
    expect(validateReleaseEvidenceObjects("rollback", rollback)).toBe(true);
    expect(() => validateReleaseEvidenceObjects("rollback", { ...rollback, nextStart: { ...rollback.nextStart, skipped: true } })).toThrow(/skipped/u);
    const forward = { identity: { role: "forward", applicationSha, parentSha: FORWARD_PARENT_SHA, reviewBaseSha: FORWARD_REVIEW_BASE_SHA }, phaseE2: { skipped: false, applicationSha, isrFlushToDisk: false, cacheMaxMemorySize: 52_428_800, fetchCacheAbsent: true, imageCacheAbsent: true, immutableManifestPassed: true, authenticatedRevalidationPassed: true, insightRoutesPassed: true, repeatedImagesPassed: true, bcnThenCirclePassed: true, circleThenBcnPassed: true, brandIsolationPassed: true, cacheIsolationPassed: true }, rehearsal: { ...performance, applicationSha, dualBrandIsolationPassed: true, sessionIsolationPassed: true, ownerRouteIsolationPassed: true } };
    expect(validateReleaseEvidenceObjects("forward", forward)).toBe(true);
    expect(() => validateReleaseEvidenceObjects("forward", { ...forward, phaseE2: { ...forward.phaseE2, skipped: true } })).toThrow(/skipped/u);
  });

  it("records full immutable artifact hashes rather than relying on BUILD_ID", () => {
    const build = source("build-release.sh"), rollback = source("prepare-rollback-artifact.sh"), attach = source("attach-storage.sh");
    expect(build).toContain("runtime-bcn.manifest"); expect(build).toContain("runtime-circle-card.manifest"); expect(rollback).toContain("rollback-bcn.manifest");
    expect(build).toContain("rm -rf -- .next/cache");
    expect(attach).not.toMatch(/\/cache|cache\*/);
    expect(attach).toContain("Phase E2 disables all Next disk persistence");
  });

  it("removes build-user mutation authority before accepting rollback next-start evidence", () => {
    const fixture = source("prepare-rollback-fixture.sh");
    expect(fixture).toContain("rollback-application-identity.post-build.json");
    expect(fixture.indexOf("chown -hR root:root")).toBeLessThan(fixture.indexOf("PHASE_E3_PRODUCTION_FIXTURE_ROOT"));
    expect(source("rollback-proof.mjs")).toContain("rollbackPostBuildCommitEvidence");
  });

  it("rejects build, fetch and image caches from immutable runtime artifacts", () => {
    const runtime = temp();
    writeFileSync(join(runtime, "BUILD_ID"), "synthetic"); mkdirSync(join(runtime, "server")); mkdirSync(join(runtime, "static"));
    expect(() => assertRuntimeCacheExcluded(runtime)).not.toThrow();
    mkdirSync(join(runtime, "cache", "fetch-cache"), { recursive: true });
    expect(() => assertRuntimeCacheExcluded(runtime)).toThrow(/forbidden Next build\/cache/u);
  });

  it("records every deployment binding in each role-specific artifact identity", () => {
    const directory = temp();
    const files = Object.fromEntries(["buildId", "source", "content", "environment", "database", "storage", "systemd", "operationsPack"].map((name) => { const path = join(directory, name); writeFileSync(path, `${name}\n`); return [name, path]; }));
    const identity = createArtifactIdentity({ applicationRole: "rollback-bcn", applicationSha: rollbackSha, operationsIdentity, operationsPackIdentityPath: files.operationsPack, buildIdPath: files.buildId, sourceTreeIdentityPath: files.source, contentManifestPath: files.content, environmentReadinessPath: files.environment, databaseIdentityPath: files.database, storageManifestPath: files.storage, systemdUnitPath: files.systemd, rehearsalEvidenceIdentity: "9".repeat(64) });
    expect(identity).toMatchObject({ applicationRole: "rollback-bcn", applicationSha: rollbackSha, operationsIdentity, buildId: "buildId\n", rehearsalEvidenceIdentity: "9".repeat(64) });
    for (const key of ["sourceTreeIdentity", "artifactDigest", "environmentReadinessHash", "databaseIdentityHash", "storageManifestIdentity", "systemdUnitIdentity"]) expect(identity[key]).toMatch(/^[0-9a-f]{64}$/u);
    expect(identity.operationsPackIdentityHash).toBe(sha("operationsPack\n"));
    expect(() => createArtifactIdentity({ applicationRole: "rollback-bcn", applicationSha, operationsIdentity, operationsPackIdentityPath: files.operationsPack, buildIdPath: files.buildId, sourceTreeIdentityPath: files.source, contentManifestPath: files.content, environmentReadinessPath: files.environment, databaseIdentityPath: files.database, storageManifestPath: files.storage, systemdUnitPath: files.systemd, rehearsalEvidenceIdentity: "9".repeat(64) })).toThrow(/invalid/u);
  });

  it("keeps sample content free of credential-shaped values", () => {
    const candidates = [source("common.sh"), source("environment-groups.cjs"), source("nginx-dual-runtime.conf.example"), source("runtime-launcher.mjs")].join("\n");
    expect(candidates).not.toMatch(/\bre_[A-Za-z0-9]{20,}\b|\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/);
    expect(sha(candidates)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("builds a recursive Nginx dependency closure and rejects unresolved, linked or altered inputs", () => {
    const directory = temp(), external = join(directory, "external"), nested = join(external, "nested"); mkdirSync(nested, { recursive: true });
    const main = join(directory, "nginx.conf"), include = join(external, "site.conf"), nestedInclude = join(nested, "policy.conf"), mime = join(external, "mime.types"), cert = join(external, "origin.pem"), key = join(external, "origin.key"), dh = join(external, "dh.pem");
    writeFileSync(main, `include ${include};\n`); writeFileSync(include, `include ${nestedInclude};\ninclude ${mime};\nssl_certificate ${cert};\nssl_certificate_key ${key};\nssl_dhparam ${dh};\n`);
    writeFileSync(nestedInclude, "map $host $allowed { default 1; }\n"); writeFileSync(mime, "types { text/plain txt; }\n"); writeFileSync(cert, "synthetic certificate fixture\n"); writeFileSync(key, "synthetic private key fixture\n"); writeFileSync(dh, "synthetic dh fixture\n");
    const closure = discoverNginxDependencies(main, { prefix: directory });
    expect(closure.map((entry) => entry.path)).toEqual(expect.arrayContaining([resolve(main), resolve(include), resolve(nestedInclude), resolve(mime), resolve(cert), resolve(key), resolve(dh)]));
    writeFileSync(main, `include ${join(external, "missing-*.conf")};\n`);
    expect(() => discoverNginxDependencies(main, { prefix: directory })).toThrow(/Unresolved/u);
    writeFileSync(main, "include ../escape.conf;\n"); expect(() => discoverNginxDependencies(main, { prefix: directory })).toThrow(/traversal/u);
    if (process.platform !== "win32") { const linked = join(directory, "linked.conf"); symlinkSync(include, linked, "file"); writeFileSync(main, `include ${linked};\n`); expect(() => discoverNginxDependencies(main, { prefix: directory })).toThrow(/symlink/u); }
    const snapshot = join(directory, "snapshot"); mkdirSync(snapshot); const captured = join(snapshot, "captured.conf"); writeFileSync(captured, "safe\n");
    const evidence = { dependencies: [{ path: main, classification: "configuration" as const, sha256: sha("safe\n"), size: 5, mode: 0o400, ownership: "root:root", capturedPath: "captured.conf", capturedSha256: sha("safe\n") }] };
    expect(verifyCapturedNginxClosure(snapshot, evidence)).toBe(true);
    writeFileSync(captured, "altered\n"); expect(() => verifyCapturedNginxClosure(snapshot, evidence)).toThrow(/changed/u);
  });

  it("captures an external certificate/key closure, rewrites live paths and verifies fingerprints", () => {
    const directory = temp(), external = join(directory, "outside"), snapshot = join(directory, "snapshot"), evidencePath = join(directory, "closure.json"), modulePrefix = join(directory, "module-prefix"), moduleRoot = join(modulePrefix, "modules"); mkdirSync(external); mkdirSync(moduleRoot, { recursive: true });
    const key = join(external, "origin.key"), cert = join(external, "origin.pem"), dh = join(external, "dh.pem"), include = join(external, "tls.conf"), main = join(directory, "nginx.conf"), moduleFile = join(moduleRoot, "fixture.so"), moduleBytes = Buffer.from([0, 255, 254, 128, 65, 0, 195, 40]);
    const openssl = process.platform === "win32" ? "C:/Program Files/Git/usr/bin/openssl.exe" : "/usr/bin/openssl";
    execFileSync(openssl, ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-subj", "/CN=circlecard.co.uk", "-addext", "subjectAltName=DNS:circlecard.co.uk", "-days", "30", "-keyout", key, "-out", cert], { stdio: "ignore" });
    writeFileSync(moduleFile, moduleBytes); writeFileSync(dh, "synthetic fixture dh parameters\n"); writeFileSync(include, `ssl_certificate ${cert};\nssl_certificate_key ${key};\nssl_dhparam ${dh};\n`); writeFileSync(main, `load_module modules/fixture.so;\ninclude ${include};\n`);
    const evidence = captureNginxDependencyClosure(main, snapshot, evidencePath, { prefix: directory, modulePrefix, moduleRoots: [moduleRoot] });
    expect(evidence.certificateKeyPairingPassed).toBe(true); expect(verifyCapturedNginxClosure(snapshot, evidence)).toBe(true);
    for (const item of evidence.dependencies.filter((entry) => entry.classification === "configuration")) expect(readFileSync(join(snapshot, item.capturedPath!), "utf8")).not.toContain(external);
    const binary = evidence.dependencies.find((entry) => entry.classification === "immutable-binary-module")!; expect(readFileSync(join(snapshot, binary.capturedPath!))).toEqual(moduleBytes); expect(binary.capturedSha256).toBe(sha(moduleBytes)); expect(readFileSync(join(snapshot, evidence.entry), "utf8")).toContain(binary.capturedPath!);
      chmodSync(join(snapshot, binary.capturedPath!), 0o600); writeFileSync(join(snapshot, binary.capturedPath!), Buffer.from([1, 2, 3])); expect(() => verifyCapturedNginxClosure(snapshot, evidence)).toThrow(/changed/u); writeFileSync(join(snapshot, binary.capturedPath!), moduleBytes); chmodSync(join(snapshot, binary.capturedPath!), 0o400);
    const certificate = evidence.dependencies.find((entry) => entry.classification === "certificate")!; certificate.certificate!.fingerprintSha256 = "0".repeat(64);
    expect(() => verifyCapturedNginxClosure(snapshot, evidence)).toThrow(/fingerprint/u);
    writeFileSync(main, `load_module ${join(directory, "unapproved", "bad.so")};\ninclude ${include};\n`); expect(() => discoverNginxDependencyClosure(main, { prefix: directory, modulePrefix, moduleRoots: [moduleRoot] })).toThrow(/approved module root/u);
  }, 15_000);

  it("accepts only reviewed one-hop Nginx enabled-link topology", () => {
    const root = resolve("/fixture/etc/nginx"), policy = [{ linkRoot: join(root, "sites-enabled"), targetRoots: [join(root, "sites-available")] }, { linkRoot: join(root, "modules-enabled"), targetRoots: [resolve("/fixture/usr/share/nginx/modules-available")] }];
    const base = { path: join(root, "sites-enabled", "site"), linkText: "../sites-available/site", targetPath: join(root, "sites-available", "site"), chained: false, cyclic: false, targetIsFile: true, targetIsSymlink: false, targetNlink: 1, targetMode: 0o644, parentMode: 0o755 };
    expect(validateNginxSymlinkPolicyRecord(base, policy)).toBe(true);
    expect(validateNginxSymlinkPolicyRecord({ ...base, path: join(root, "modules-enabled", "module.conf"), linkText: "../../../usr/share/nginx/modules-available/module.conf", targetPath: resolve("/fixture/usr/share/nginx/modules-available/module.conf") }, policy)).toBe(true);
    for (const mutation of [{ targetPath: resolve("/tmp/escape") }, { chained: true }, { cyclic: true }, { targetNlink: 2 }, { targetMode: 0o666 }, { targetIsFile: false }, { linkText: "../../../../tmp/escape" }]) expect(() => validateNginxSymlinkPolicyRecord({ ...base, ...mutation }, policy)).toThrow();
  });

  it("strictly validates complete Cloudflare/TLS approval and file linkage", () => {
    const now = new Date("2026-07-22T12:00:00.000Z"), expected = { operationsIdentity, nginxIdentity: "a".repeat(64), tlsRehearsalIdentity: "b".repeat(64), originCertificateFingerprintSha256: "c".repeat(64) };
    const valid = { schemaVersion: 1, operationsIdentity, forwardApplicationSha: applicationSha, rollbackApplicationSha: rollbackSha, nginxIdentity: expected.nginxIdentity, tlsRehearsalIdentity: expected.tlsRehearsalIdentity, apexHostname: "circlecard.co.uk", originIpv4Target: "8.8.8.8", originIpv6Decision: "explicitly-no-aaaa", originIpv6: null, noAaaaReason: "Reviewed apex launch has no AAAA record", cloudflareProxyStatus: "proxied", sslMode: "Full (strict)", originCertificateSans: ["circlecard.co.uk"], originCertificateFingerprintSha256: "c".repeat(64), certificateExpiresAt: "2026-12-31T00:00:00.000Z", renewalMethod: "certbot reviewed renewal", certificateKeyPairingPassed: true, sniPassed: true, hostRoutingPassed: true, apexOnlyLaunchApproved: true, unsupportedWwwDecision: "unsupported", redirectRuleReviewPassed: true, realIpSourceType: "cloudflare-official-ip-ranges", officialRealIpSource: "https://www.cloudflare.com/ips/", realIpRangeSetSha256: "d".repeat(64), realIpSourceReviewedAt: "2026-07-20T00:00:00.000Z", httpMethodProtectionPassed: true, ownerRouteRejectionPassed: true, noStaleCachePassed: true, reviewer: "phase-f1-reviewer", reviewedAt: "2026-07-22T10:00:00.000Z" };
    expect(validateCloudflareTlsEvidence(valid, expected, { now })).toEqual(valid);
    for (const mutation of [{ sslMode: "Full" }, { ownerRouteRejectionPassed: false }, { operationsIdentity: "e".repeat(40) }, { forwardApplicationSha: rollbackSha }, { certificateExpiresAt: "2026-07-23T00:00:00.000Z" }, { reviewedAt: "2026-05-01T00:00:00.000Z" }, { originCertificateFingerprintSha256: "bad" }, { originIpv4Target: "999.999.999.999" }, { originIpv4Target: "1.2.3" }, { originIpv4Target: "0.0.0.0" }, { originIpv4Target: "239.1.1.1" }, { originIpv6Decision: "explicit-ipv6", originIpv6: ":", noAaaaReason: null }, { originIpv6Decision: "explicit-ipv6", originIpv6: "::", noAaaaReason: null }, { originIpv6Decision: "explicit-ipv6", originIpv6: "ff02::1", noAaaaReason: null }, { originIpv6Decision: "explicitly-no-aaaa", originIpv6: "2606:4700:4700::1111" }, { originIpv6Decision: "missing" }, { officialRealIpSource: "https://example.com/ips" }, { realIpSourceType: "blog" }, { realIpRangeSetSha256: "bad" }, { realIpSourceReviewedAt: "2026-01-01T00:00:00.000Z" }]) expect(() => validateCloudflareTlsEvidence({ ...valid, ...mutation }, expected, { now })).toThrow();
    expect(validateCloudflareTlsEvidence({ ...valid, originIpv6Decision: "explicit-ipv6", originIpv6: "2606:4700:4700::1111", noAaaaReason: null }, expected, { now })).toBeTruthy();
    expect(() => parseStrictJsonObject("{}")).not.toThrow(); expect(() => parseStrictJsonObject("")).toThrow(/malformed/u); expect(() => parseStrictJsonObject('{"schemaVersion":1,"schemaVersion":1}')).toThrow(/duplicate/u); expect(() => parseStrictJsonObject("{")).toThrow(/malformed/u);
    const directory = temp(), evidencePath = join(directory, "approval.json"); writeFileSync(evidencePath, `${JSON.stringify(valid)}\n`);
    expect(readCloudflareTlsEvidence(evidencePath, expected, { now }).record).toEqual(valid);
    const hardRoot = temp(); linkSync(evidencePath, join(hardRoot, "approval.link")); expect(() => readCloudflareTlsEvidence(evidencePath, expected, { now })).toThrow(/Unsafe/u);
    if (process.platform !== "win32") { const symlink = join(directory, "approval.symlink"); symlinkSync(evidencePath, symlink, "file"); expect(() => readCloudflareTlsEvidence(symlink, expected, { now })).toThrow(/Unsafe/u); }
  });

  it("calculates one canonical cross-platform candidate aggregate and rejects path-set changes", () => {
    const entries = [{ path: "ops/deploy/phase-f1/a.mjs", body: "a\n" }, { path: "docs/circle-card-phase-f1-server-deployment-pack.md", body: "doc\n" }, { path: "src/config/phase-f1-deployment-pack.test.ts", body: "test\n" }];
    expect(aggregateCandidateEntries(entries)).toEqual(aggregateCandidateEntries([...entries].reverse()));
    expect(aggregateCandidateEntries(entries).aggregateSha256).not.toBe(aggregateCandidateEntries(entries.map((entry, index) => index ? entry : { ...entry, body: "changed\n" })).aggregateSha256);
    expect(() => aggregateCandidateEntries([...entries, entries[0]])).toThrow(/duplicate/u);
    expect(() => aggregateCandidateEntries([...entries, { path: ".next/BUILD_ID", body: "x" }])).toThrow(/boundary|generated/u);
    expect(() => aggregateCandidateEntries(entries.slice(1), entries.map((entry) => entry.path))).toThrow(/missing/u);
    expect(() => aggregateCandidateEntries([{ path: "ops\\deploy\\phase-f1\\a.mjs", body: "x" }])).toThrow(/canonical/u);
    expect(aggregateCandidateWorkspace(root)).toEqual(aggregateCandidateCommit(root, "HEAD"));
  });
});
