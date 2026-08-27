import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  rmSync,
  unlinkSync
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  APPLICATION_IDENTITIES,
  FORWARD_APPLICATION_SHA,
  ROLLBACK_APPLICATION_SHA,
  verifyApplicationCommit
} from "./application-identities.mjs";
import { publishNoReplaceSet } from "./atomic-no-replace.mjs";
import { gitAsBuildUser } from "./build-user-git.mjs";
import { resolveProtectedAuthorityLineage } from "./environment-readiness.mjs";

export const FAILED_ROLLBACK_ATTEMPT_RECOVERY =
  "FAILED_CURRENT_AUTHORITY_ROLLBACK_BUILD_ATTEMPT_RECOVERY";
export const FAILED_ROLLBACK_CLASSIFICATION =
  "FAILED_BEFORE_IMMUTABLE_ARTIFACT_PUBLICATION";
export const RECOVERY_PLAN_SCHEMA =
  "phase-f1-failed-rollback-attempt-recovery-plan-v2";
export const RECOVERY_REPORT_SCHEMA =
  "phase-f1-failed-rollback-attempt-recovery-report-v2";
export const EMPTY_FIXTURE_RESIDUE = "EMPTY";
export const NONEMPTY_PARTIAL_FIXTURE_RESIDUE = "NONEMPTY_PARTIAL_BUILD";

const STATE_ROOT = "/var/lib/thebusinesscircle/deployment-state";
const BUILD_ROOT = "/var/www/builds";
const AUTHORITY_PATH = "/var/lib/thebusinesscircle/approved-phase-f1-pack.json";
const APPLICATION_NAME = "rollback-application-identity.json";
const ATTEMPT_NAME = "rollback-build-attempt.json";
const RECHECK_NAME = "rollback-application-identity.recheck.json";
const ATTEMPT_FORMAT = "phase-f1-build-attempt-v2";
const SELECTORS = [
  "/var/www/current-bcn",
  "/var/www/current-circle-card",
  "/var/www/current-bcn-rollback-probe"
];
const FORBIDDEN_OUTPUTS = [
  "rollback-application-identity.post-build.json",
  "rollback-production-fixture-provenance.json",
  "rollback-linux-next-start-evidence.json",
  "rollback-fixture.path",
  "rollback-build-only-artifact.json",
  "bcn-build-only-artifact.json",
  "circle-card-build-only-artifact.json"
];
const sha256 = value => createHash("sha256").update(value).digest("hex");
const FIXTURE_INVENTORY_FORMAT = "phase-f1-failed-fixture-residue-inventory-v1";

function exactKeys(value, expected, label) {
  if (!value || Array.isArray(value) || typeof value !== "object" ||
      JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...expected].sort())) {
    throw new Error(`${label} has unknown or missing fields.`);
  }
}

function digest(value, label) {
  if (!/^[0-9a-f]{64}$/u.test(value || "")) throw new Error(`${label} is invalid.`);
}

function commit(value, label) {
  if (!/^[0-9a-f]{40}$/u.test(value || "")) throw new Error(`${label} is invalid.`);
}

function protectedJson(path, label, enforceMetadata) {
  const stats = lstatSync(path);
  if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1 ||
      realpathSync(path) !== path ||
      (enforceMetadata && (stats.uid !== 0 || stats.gid !== 0 ||
        (stats.mode & 0o777) !== 0o600))) {
    throw new Error(`${label} metadata is unsafe.`);
  }
  const bytes = readFileSync(path);
  let record;
  try { record = JSON.parse(bytes.toString("utf8")); }
  catch { throw new Error(`${label} is not valid JSON.`); }
  return {
    path,
    bytes,
    record,
    identity: sha256(bytes),
    inode: `${stats.dev}:${stats.ino}`,
    stats
  };
}

function protectedJsonIfPresent(path, label, enforceMetadata) {
  try { return protectedJson(path, label, enforceMetadata); }
  catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function validateApplicationIdentity(record) {
  exactKeys(record, [
    "applicationSha", "candidateFileSet", "candidateRawDiffSha256",
    "fileHashes", "parentSha", "reviewBaseSha", "role"
  ], "Rollback application identity evidence");
  const expected = APPLICATION_IDENTITIES.rollback;
  if (record.role !== "rollback" || record.applicationSha !== ROLLBACK_APPLICATION_SHA ||
      record.parentSha !== expected.parentSha ||
      record.reviewBaseSha !== (expected.reviewBaseSha ?? expected.parentSha) ||
      JSON.stringify(record.candidateFileSet) !==
        JSON.stringify(expected.files.map(({ path }) => path)) ||
      !/^[0-9a-f]{64}$/u.test(record.candidateRawDiffSha256 || "") ||
      !Array.isArray(record.fileHashes) ||
      record.fileHashes.length !== expected.files.length) {
    throw new Error("Rollback application identity evidence is unsupported.");
  }
  for (const [index, row] of record.fileHashes.entries()) {
    exactKeys(row, ["path", "sha256"], "Rollback application file identity");
    if (row.path !== expected.files[index].path ||
        !/^[0-9a-f]{64}$/u.test(row.sha256 || "")) {
      throw new Error("Rollback application file identity differs.");
    }
  }
  return record;
}

function validateFailedAttempt(record, sourceOperationsCommit, buildRoot = BUILD_ROOT) {
  exactKeys(record, [
    "applicationSha", "attemptId", "format", "operationsCommit", "path", "role", "status"
  ], "Failed rollback build attempt");
  if (record.format !== ATTEMPT_FORMAT || record.role !== "rollback" ||
      record.applicationSha !== ROLLBACK_APPLICATION_SHA ||
      record.operationsCommit !== sourceOperationsCommit || record.status !== "failed" ||
      !/^[0-9a-f]{24}$/u.test(record.attemptId || "") ||
      resolve(record.path || "") !== record.path ||
      dirname(record.path) !== buildRoot ||
      !new RegExp(
        `^rollback-${ROLLBACK_APPLICATION_SHA}-\\d{8}T\\d{6}\\.\\d{9}Z-[0-9a-f]{16}$`, "u"
      ).test(basename(record.path))) {
    throw new Error("Rollback build attempt is not the supported current-authority FAILED state.");
  }
  return record;
}

function pathInside(path, root) {
  return path === root || path.startsWith(`${root}/`);
}

function pathAtOrInside(path, root) {
  const rel = relative(root, path);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

function mountPath(value) {
  return value.replace(/\\([0-7]{3})/gu, (_, octal) =>
    String.fromCodePoint(Number.parseInt(octal, 8)));
}

function mountAtOrBelow(target, mountInfoPath = "/proc/self/mountinfo") {
  const canonical = resolve(target);
  return readFileSync(mountInfoPath, "utf8").split("\n").some((line) => {
    if (!line) return false;
    const fields = line.split(" ");
    return fields.length > 5 && pathAtOrInside(mountPath(fields[4]), canonical);
  });
}

function safeFixtureName(name) {
  return name && name !== "." && name !== ".." && !/[\u0000-\u001f\u007f]/u.test(name);
}

function inventoryRow(hash, row) {
  hash.update(`${JSON.stringify(row)}\n`);
}

export function inspectFailedFixtureResidue(
  residue, { expectedUid, expectedGid, expectedDev } = {}
) {
  const root = resolve(residue);
  const rootStats = lstatSync(root);
  if (!rootStats.isDirectory() || rootStats.isSymbolicLink() || realpathSync(root) !== root) {
    throw new Error("Failed rollback fixture residue root is unsafe.");
  }
  const uid = expectedUid ?? rootStats.uid;
  const gid = expectedGid ?? rootStats.gid;
  const dev = expectedDev ?? rootStats.dev;
  if (rootStats.uid !== uid || rootStats.gid !== gid || rootStats.dev !== dev) {
    throw new Error("Failed rollback fixture residue root metadata is unsafe.");
  }
  const top = readdirSync(root).sort((left, right) => Buffer.from(left).compare(Buffer.from(right)));
  const hash = createHash("sha256");
  hash.update(`${FIXTURE_INVENTORY_FORMAT}\n`);
  if (top.length === 0) {
    return {
      state: EMPTY_FIXTURE_RESIDUE,
      entryCount: 0,
      inventorySha256: hash.digest("hex")
    };
  }
  if (top.length !== 1 || top[0] !== "fixture") {
    throw new Error("Nonempty failed fixture residue has an unsupported top-level shape.");
  }

  let entryCount = 0;
  const visit = (directory) => {
    const names = readdirSync(directory)
      .sort((left, right) => Buffer.from(left).compare(Buffer.from(right)));
    for (const name of names) {
      if (!safeFixtureName(name)) {
        throw new Error("Failed fixture residue contains an unsafe path name.");
      }
      const path = join(directory, name);
      const stats = lstatSync(path);
      const rel = relative(root, path).split(sep).join("/");
      if (!pathAtOrInside(path, root) || stats.dev !== dev || stats.uid !== uid || stats.gid !== gid ||
          (stats.mode & 0o6000) !== 0) {
        throw new Error("Failed fixture residue entry metadata is unsafe.");
      }
      let type;
      let payload;
      if (stats.isDirectory() && !stats.isSymbolicLink()) {
        type = "directory";
        payload = null;
      } else if (stats.isFile() && !stats.isSymbolicLink() && stats.nlink === 1) {
        type = "file";
        payload = sha256(readFileSync(path));
      } else if (stats.isSymbolicLink() && stats.nlink === 1) {
        type = "symlink";
        payload = readlinkSync(path);
        if (isAbsolute(payload) || /[\u0000-\u001f\u007f]/u.test(payload) ||
            !pathAtOrInside(resolve(dirname(path), payload), root)) {
          throw new Error("Failed fixture residue symlink is unsafe.");
        }
      } else {
        throw new Error("Failed fixture residue contains an unsupported file type or hard link.");
      }
      entryCount += 1;
      inventoryRow(hash, {
        path: rel,
        type,
        mode: stats.mode & 0o7777,
        uid: stats.uid,
        gid: stats.gid,
        nlink: stats.nlink,
        size: stats.size,
        dev: `${stats.dev}`,
        ino: `${stats.ino}`,
        payload
      });
      if (type === "directory") visit(path);
    }
  };
  visit(root);
  if (existsSync(join(root, "fixture", ".phase-e3-production-fixture.json"))) {
    throw new Error("Completed fixture provenance cannot be recovered as partial residue.");
  }
  return {
    state: NONEMPTY_PARTIAL_FIXTURE_RESIDUE,
    entryCount,
    inventorySha256: hash.digest("hex")
  };
}

function hasActiveReference(target, processRoot = "/proc") {
  for (const entry of readdirSync(processRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^\d+$/u.test(entry.name)) continue;
    const process = join(processRoot, entry.name);
    for (const name of ["cwd", "root", "exe"]) {
      try { if (pathInside(resolve(readlinkSync(join(process, name))), target)) return true; }
      catch {}
    }
    try {
      for (const descriptor of readdirSync(join(process, "fd"))) {
        try {
          if (pathInside(resolve(readlinkSync(join(process, "fd", descriptor))), target)) {
            return true;
          }
        } catch {}
      }
    } catch {}
  }
  return false;
}

function selectorReferences(target, selectors = SELECTORS) {
  return selectors.some((selector) => {
    try { return pathInside(realpathSync(selector), target); }
    catch { return false; }
  });
}

function commandPasses(command, arguments_) {
  try { execFileSync(command, arguments_, { stdio: "ignore" }); return true; }
  catch { return false; }
}

function numericIdentity(database, name) {
  const fields = execFileSync("/usr/bin/getent", [database, name], { encoding: "utf8" })
    .trim().split(":");
  if (fields.length < 3 || !/^\d+$/u.test(fields[2])) {
    throw new Error("Build identity lookup failed.");
  }
  return Number(fields[2]);
}

function candidatePortsBound() {
  const output = execFileSync("/usr/bin/ss", ["-H", "-ltn"], { encoding: "utf8" });
  return output.split("\n").some((line) => /:(3100|3200|3300)\s/u.test(line));
}

function artifactStatePresent(stateRoot) {
  if (FORBIDDEN_OUTPUTS.some((name) => existsSync(join(stateRoot, name)))) return true;
  const artifactRoot = `/var/lib/thebusinesscircle/artifacts/${FORWARD_APPLICATION_SHA}-${ROLLBACK_APPLICATION_SHA}`;
  return existsSync(`/var/www/rollbacks/${ROLLBACK_APPLICATION_SHA}`) || existsSync(artifactRoot);
}

function fixtureResidue(buildRoot, workspaceBasename) {
  const fixed = `rollback-fixture-${ROLLBACK_APPLICATION_SHA}-${workspaceBasename}`;
  const legacy = new RegExp(`^rollback-fixture-${ROLLBACK_APPLICATION_SHA}-[0-9a-f]{16}$`, "u");
  const matches = readdirSync(buildRoot, { withFileTypes: true })
    .filter((entry) => entry.name === fixed || legacy.test(entry.name))
    .map((entry) => join(buildRoot, entry.name));
  if (matches.length !== 1) {
    throw new Error("Failed rollback fixture residue is absent or ambiguous.");
  }
  return matches[0];
}

export function validateFailedRollbackRecoveryFacts(facts, { enforceMetadata = true } = {}) {
  commit(facts.operationsCommit, "Recovery operations authority");
  digest(facts.attemptIdentity, "Failed attempt identity");
  digest(facts.fixtureResidueInventorySha256, "Failed fixture residue inventory");
  const fixtureStateValid =
    (facts.fixtureResidueState === EMPTY_FIXTURE_RESIDUE && facts.fixtureEmpty === true &&
      facts.fixtureResidueEntryCount === 0) ||
    (facts.fixtureResidueState === NONEMPTY_PARTIAL_FIXTURE_RESIDUE &&
      facts.fixtureEmpty === false && Number.isSafeInteger(facts.fixtureResidueEntryCount) &&
      facts.fixtureResidueEntryCount > 0);
  if (facts.status !== "failed" || facts.applicationSha !== ROLLBACK_APPLICATION_SHA ||
      facts.role !== "rollback" || facts.workspaceCanonical !== true ||
      facts.workspaceParentExact !== true || facts.workspaceDirectory !== true ||
      facts.workspaceSymlink !== false || facts.workspaceSameFilesystem !== true ||
      facts.workspaceMountpoint !== false || facts.workspaceActiveReference !== false ||
      facts.workspaceSelectorReference !== false || facts.workspaceTrackedIdentity !== true ||
      facts.nodeModulesDirectory !== true || facts.nodeModulesSymlink !== false ||
      facts.nextOutputAbsent !== true || facts.fixtureCanonical !== true ||
      facts.fixtureParentExact !== true || facts.fixtureDirectory !== true ||
      facts.fixtureSymlink !== false || facts.fixtureSameFilesystem !== true ||
      facts.fixtureMountpoint !== false || facts.fixtureActiveReference !== false ||
      facts.fixtureNestedMount !== false || facts.fixtureSelectorReference !== false ||
      facts.fixtureTreeSafe !== true || !fixtureStateValid ||
      facts.artifactStatePresent !== false || facts.candidatePortsBound !== false ||
      (enforceMetadata && (
        facts.workspaceUid !== facts.expectedUid || facts.workspaceGid !== facts.expectedGid ||
        facts.workspaceMode !== 0o750 || facts.fixtureUid !== facts.expectedUid ||
        facts.fixtureGid !== facts.expectedGid || facts.fixtureMode !== 0o750
      ))) {
    throw new Error("Failed rollback attempt is not an exact protected recovery target.");
  }
  return FAILED_ROLLBACK_CLASSIFICATION;
}

function operationalFacts(attempt, application, attemptIdentity, options, dependencies) {
  const buildRoot = realpathSync(options.buildRoot);
  const requestedWorkspace = resolve(attempt.path);
  const workspace = realpathSync(requestedWorkspace);
  const workspaceStats = lstatSync(workspace);
  const buildStats = lstatSync(buildRoot);
  const residue = fixtureResidue(buildRoot, basename(workspace));
  const canonicalResidue = realpathSync(residue);
  const residueStats = lstatSync(canonicalResidue);
  const expectedUid = options.expectedUid ?? (options.enforceMetadata ?
    numericIdentity("passwd", "phase-f1-build") : workspaceStats.uid);
  const expectedGid = options.expectedGid ?? (options.enforceMetadata ?
    numericIdentity("group", "phase-f1-build") : workspaceStats.gid);
  const verifyWorkspace = dependencies.verifyWorkspace ?? ((path, expected) => {
    const verified = verifyApplicationCommit(
      path, "rollback", APPLICATION_IDENTITIES, gitAsBuildUser
    );
    if (JSON.stringify(verified) !== JSON.stringify(expected)) {
      throw new Error("Failed rollback workspace application identity differs.");
    }
  });
  verifyWorkspace(workspace, application);
  const residueMountpoint = dependencies.fixtureMountpoint ??
    commandPasses("/usr/bin/findmnt", ["--mountpoint", canonicalResidue]);
  const residueNestedMount = dependencies.fixtureNestedMount ??
    mountAtOrBelow(canonicalResidue, options.mountInfoPath);
  if (residueMountpoint || residueNestedMount) {
    throw new Error("Failed rollback fixture residue contains a mount boundary.");
  }
  const residueInventory = (dependencies.inspectFixtureResidue ?? inspectFailedFixtureResidue)(
    canonicalResidue,
    { expectedUid, expectedGid, expectedDev: buildStats.dev }
  );
  const facts = {
    operationsCommit: attempt.operationsCommit,
    attemptIdentity,
    status: attempt.status,
    applicationSha: attempt.applicationSha,
    role: attempt.role,
    workspaceCanonical: workspace === requestedWorkspace,
    workspaceParentExact: dirname(workspace) === buildRoot,
    workspaceDirectory: workspaceStats.isDirectory(),
    workspaceSymlink: workspaceStats.isSymbolicLink(),
    workspaceUid: workspaceStats.uid,
    workspaceGid: workspaceStats.gid,
    workspaceMode: workspaceStats.mode & 0o777,
    expectedUid,
    expectedGid,
    workspaceSameFilesystem: workspaceStats.dev === buildStats.dev,
    workspaceMountpoint: dependencies.workspaceMountpoint ??
      commandPasses("/usr/bin/findmnt", ["--mountpoint", workspace]),
    workspaceActiveReference: dependencies.workspaceActiveReference ??
      hasActiveReference(workspace, options.processRoot),
    workspaceSelectorReference: dependencies.workspaceSelectorReference ??
      selectorReferences(workspace, options.selectors),
    workspaceTrackedIdentity: true,
    nodeModulesDirectory: existsSync(join(workspace, "node_modules")) &&
      lstatSync(join(workspace, "node_modules")).isDirectory(),
    nodeModulesSymlink: existsSync(join(workspace, "node_modules")) &&
      lstatSync(join(workspace, "node_modules")).isSymbolicLink(),
    nextOutputAbsent: !existsSync(join(workspace, ".next")),
    fixtureCanonical: canonicalResidue === residue,
    fixtureParentExact: dirname(canonicalResidue) === buildRoot,
    fixtureDirectory: residueStats.isDirectory(),
    fixtureSymlink: residueStats.isSymbolicLink(),
    fixtureUid: residueStats.uid,
    fixtureGid: residueStats.gid,
    fixtureMode: residueStats.mode & 0o777,
    fixtureSameFilesystem: residueStats.dev === buildStats.dev,
    fixtureMountpoint: residueMountpoint,
    fixtureNestedMount: residueNestedMount,
    fixtureActiveReference: dependencies.fixtureActiveReference ??
      hasActiveReference(canonicalResidue, options.processRoot),
    fixtureSelectorReference: dependencies.fixtureSelectorReference ??
      selectorReferences(canonicalResidue, options.selectors),
    fixtureEmpty: residueInventory.entryCount === 0,
    fixtureTreeSafe: true,
    fixtureResidueState: residueInventory.state,
    fixtureResidueEntryCount: residueInventory.entryCount,
    fixtureResidueInventorySha256: residueInventory.inventorySha256,
    artifactStatePresent: dependencies.artifactStatePresent ??
      artifactStatePresent(options.stateRoot),
    candidatePortsBound: dependencies.candidatePortsBound ?? candidatePortsBound(),
    workspace,
    workspaceStats,
    residue: canonicalResidue,
    residueStats,
    buildRoot
  };
  validateFailedRollbackRecoveryFacts(facts, options);
  return facts;
}

function historyNames(sourceOperationsCommit, attemptId) {
  return {
    application: `rollback-application-identity-failed-preserved-${sourceOperationsCommit}-${attemptId}.json`,
    attempt: `rollback-build-attempt-failed-preserved-${sourceOperationsCommit}-${attemptId}.json`,
    recheck: `rollback-application-identity-recheck-failed-preserved-${sourceOperationsCommit}-${attemptId}.json`
  };
}

function planPath(stateRoot, operationsCommit, attemptIdentity) {
  return join(stateRoot, `rollback-failed-attempt-recovery-plan-${operationsCommit}-${attemptIdentity}.json`);
}

function reportPath(stateRoot, operationsCommit, attemptIdentity) {
  return join(stateRoot, `rollback-failed-attempt-recovery-${operationsCommit}-${attemptIdentity}.json`);
}

function makePlan({ operationsCommit, attempt, application, recheck, facts, history }) {
  return {
    schemaVersion: RECOVERY_PLAN_SCHEMA,
    recovery: FAILED_ROLLBACK_ATTEMPT_RECOVERY,
    classification: FAILED_ROLLBACK_CLASSIFICATION,
    operationsCommit,
    sourceOperationsCommit: attempt.record.operationsCommit,
    applicationSha: ROLLBACK_APPLICATION_SHA,
    attemptId: attempt.record.attemptId,
    applicationIdentitySha256: application.identity,
    buildAttemptSha256: attempt.identity,
    recheckIdentitySha256: recheck.identity,
    workspaceBasename: basename(facts.workspace),
    workspaceInode: `${facts.workspaceStats.dev}:${facts.workspaceStats.ino}`,
    fixtureResidueBasename: basename(facts.residue),
    fixtureResidueInode: `${facts.residueStats.dev}:${facts.residueStats.ino}`,
    fixtureResidueUid: facts.fixtureUid,
    fixtureResidueGid: facts.fixtureGid,
    fixtureResidueMode: facts.fixtureMode,
    fixtureResidueState: facts.fixtureResidueState,
    fixtureResidueEntryCount: facts.fixtureResidueEntryCount,
    fixtureResidueInventorySha256: facts.fixtureResidueInventorySha256,
    applicationHistoryName: history.application,
    buildAttemptHistoryName: history.attempt,
    recheckHistoryName: history.recheck,
    canonicalRetryState: "BLOCKED",
    result: "PREPARED",
    valueMaterialRecorded: false
  };
}

function validatePlan(plan, expected) {
  exactKeys(plan, Object.keys(expected), "Failed rollback recovery plan");
  if (JSON.stringify(plan) !== JSON.stringify(expected)) {
    throw new Error("Failed rollback recovery plan differs from the approved attempt.");
  }
}

function makeReport(plan) {
  return {
    schemaVersion: RECOVERY_REPORT_SCHEMA,
    recovery: plan.recovery,
    classification: plan.classification,
    operationsCommit: plan.operationsCommit,
    sourceOperationsCommit: plan.sourceOperationsCommit,
    applicationSha: plan.applicationSha,
    attemptId: plan.attemptId,
    applicationIdentitySha256: plan.applicationIdentitySha256,
    buildAttemptSha256: plan.buildAttemptSha256,
    recheckIdentitySha256: plan.recheckIdentitySha256,
    workspaceBasename: plan.workspaceBasename,
    fixtureResidueBasename: plan.fixtureResidueBasename,
    fixtureResidueState: plan.fixtureResidueState,
    fixtureResidueEntryCount: plan.fixtureResidueEntryCount,
    fixtureResidueInventorySha256: plan.fixtureResidueInventorySha256,
    applicationHistoryName: plan.applicationHistoryName,
    buildAttemptHistoryName: plan.buildAttemptHistoryName,
    recheckHistoryName: plan.recheckHistoryName,
    workspace: "REMOVED",
    fixtureResidue: "REMOVED",
    canonicalEvidence: "ABSENT",
    auditPreservation: "VERIFIED",
    canonicalRetryState: "READY",
    result: "RECOVERED",
    valueMaterialRecorded: false
  };
}

function fsyncDirectory(path) {
  const fd = openSync(path, "r");
  try { fsyncSync(fd); } finally { closeSync(fd); }
}

function publishEntry(path, bytes, enforceMetadata, publish) {
  publish([{
    target: path,
    payload: bytes,
    mode: 0o600,
    ...(enforceMetadata ? { uid: 0, gid: 0 } : {})
  }], { enforceMetadata, fsyncDirectories: enforceMetadata });
}

function assertStateRoot(path, operational, enforceMetadata) {
  const root = resolve(path);
  if (operational && root !== STATE_ROOT) throw new Error("Exact recovery state root required.");
  const stats = lstatSync(root);
  if (!stats.isDirectory() || stats.isSymbolicLink() || realpathSync(root) !== root ||
      (enforceMetadata && (stats.uid !== 0 || stats.gid !== 0 || (stats.mode & 0o022)))) {
    throw new Error("Failed rollback recovery state root is unsafe.");
  }
  return root;
}

function assertProductionContext(operationsCommit) {
  if (process.getuid?.() !== 0) throw new Error("Failed rollback recovery requires Linux root.");
  const expected = `/opt/thebusinesscircle/deployment-packs/${operationsCommit}/failed-rollback-attempt-recovery.mjs`;
  if (fileURLToPath(import.meta.url) !== expected || realpathSync(expected) !== expected) {
    throw new Error("Failed rollback recovery must run from the authoritative installed pack.");
  }
  const authority = protectedJson(AUTHORITY_PATH, "Operations authority", true);
  if (authority.record.operationsCommit !== operationsCommit) {
    throw new Error("Failed rollback recovery authority is stale.");
  }
}

function unlinkExact(evidence, enforceMetadata, unlink, sync) {
  const current = protectedJson(evidence.path, "Canonical recovery evidence", enforceMetadata);
  if (current.identity !== evidence.identity || current.inode !== evidence.inode) {
    throw new Error("Canonical recovery evidence changed before retirement.");
  }
  unlink(evidence.path);
  sync(dirname(evidence.path));
}

function globalBoundariesSafe(stateRoot, dependencies) {
  const artifacts = dependencies.artifactStatePresent ?? artifactStatePresent(stateRoot);
  const ports = dependencies.candidatePortsBound ?? candidatePortsBound();
  if (artifacts || ports) {
    throw new Error("Failed rollback recovery runtime or artifact boundary is not clean.");
  }
}

export function recoverFailedRollbackAttempt(options, dependencies = {}) {
  const operational = options.operational ?? false;
  const enforceMetadata = options.enforceMetadata ?? operational;
  commit(options.operationsCommit, "Current recovery authority");
  digest(options.buildAttemptSha256, "Approved failed attempt identity");
  if (options.recovery !== FAILED_ROLLBACK_ATTEMPT_RECOVERY) {
    throw new Error("Failed rollback recovery identifier is unsupported.");
  }
  if (operational) (dependencies.assertProductionContext ?? assertProductionContext)(options.operationsCommit);
  const stateRoot = assertStateRoot(options.stateRoot ?? STATE_ROOT, operational, enforceMetadata);
  const buildRoot = resolve(options.buildRoot ?? BUILD_ROOT);
  if (operational && buildRoot !== BUILD_ROOT) throw new Error("Exact recovery build root required.");
  const paths = {
    application: join(stateRoot, APPLICATION_NAME),
    attempt: join(stateRoot, ATTEMPT_NAME),
    recheck: join(stateRoot, RECHECK_NAME)
  };
  const intentPath = planPath(stateRoot, options.operationsCommit, options.buildAttemptSha256);
  const finalPath = reportPath(stateRoot, options.operationsCommit, options.buildAttemptSha256);
  const existingPlan = protectedJsonIfPresent(intentPath, "Failed rollback recovery plan", enforceMetadata);
  let application = protectedJsonIfPresent(paths.application, "Rollback application identity", enforceMetadata);
  let attempt = protectedJsonIfPresent(paths.attempt, "Failed rollback build attempt", enforceMetadata);
  let recheck = protectedJsonIfPresent(paths.recheck, "Rollback application recheck", enforceMetadata);
  let plan;
  let history;

  if (!existingPlan) {
    if (!application || !attempt || !recheck) {
      throw new Error("Failed rollback recovery evidence set is incomplete.");
    }
    validateApplicationIdentity(application.record);
    validateApplicationIdentity(recheck.record);
    commit(attempt.record.operationsCommit, "Failed rollback attempt source authority");
    const resolveLineage = dependencies.resolveLineage ?? resolveProtectedAuthorityLineage;
    const lineage = resolveLineage(options.operationsCommit);
    if (!Array.isArray(lineage) || new Set(lineage).size !== lineage.length ||
        lineage.at(-1) !== options.operationsCommit ||
        !lineage.includes(attempt.record.operationsCommit)) {
      throw new Error("Failed rollback attempt source authority is not on the protected lineage.");
    }
    validateFailedAttempt(attempt.record, attempt.record.operationsCommit, buildRoot);
    if (attempt.identity !== options.buildAttemptSha256 ||
        !application.bytes.equals(recheck.bytes)) {
      throw new Error("Failed rollback recovery evidence identity differs.");
    }
    const facts = operationalFacts(
      attempt.record, application.record, attempt.identity,
      {
        buildRoot,
        stateRoot,
        enforceMetadata,
        expectedUid: options.expectedUid,
        expectedGid: options.expectedGid,
        processRoot: options.processRoot,
        selectors: options.selectors,
        mountInfoPath: options.mountInfoPath
      },
      dependencies
    );
    history = historyNames(attempt.record.operationsCommit, attempt.record.attemptId);
    plan = makePlan({ operationsCommit: options.operationsCommit, attempt, application, recheck, facts, history });
    (dependencies.publish ?? publishNoReplaceSet)([{
      target: intentPath,
      payload: `${JSON.stringify(plan, null, 2)}\n`,
      mode: 0o600,
      ...(enforceMetadata ? { uid: 0, gid: 0 } : {})
    }], { enforceMetadata, fsyncDirectories: enforceMetadata });
  } else {
    plan = existingPlan.record;
    history = {
      application: plan.applicationHistoryName,
      attempt: plan.buildAttemptHistoryName,
      recheck: plan.recheckHistoryName
    };
  }

  commit(plan.sourceOperationsCommit, "Planned failed rollback source authority");
  const expectedHistory = historyNames(plan.sourceOperationsCommit, plan.attemptId);
  const expectedPlan = {
    ...plan,
    schemaVersion: RECOVERY_PLAN_SCHEMA,
    recovery: FAILED_ROLLBACK_ATTEMPT_RECOVERY,
    classification: FAILED_ROLLBACK_CLASSIFICATION,
    operationsCommit: options.operationsCommit,
    sourceOperationsCommit: plan.sourceOperationsCommit,
    applicationSha: ROLLBACK_APPLICATION_SHA,
    buildAttemptSha256: options.buildAttemptSha256,
    applicationHistoryName: expectedHistory.application,
    buildAttemptHistoryName: expectedHistory.attempt,
    recheckHistoryName: expectedHistory.recheck,
    canonicalRetryState: "BLOCKED",
    result: "PREPARED",
    valueMaterialRecorded: false
  };
  validatePlan(plan, expectedPlan);
  for (const [value, label] of [
    [plan.applicationIdentitySha256, "Planned application identity"],
    [plan.buildAttemptSha256, "Planned build attempt identity"],
    [plan.recheckIdentitySha256, "Planned recheck identity"],
    [plan.fixtureResidueInventorySha256, "Planned fixture residue inventory"]
  ]) digest(value, label);
  if (!/^[0-9a-f]{24}$/u.test(plan.attemptId || "") ||
      !/^\d+:\d+$/u.test(plan.workspaceInode || "") ||
      !/^\d+:\d+$/u.test(plan.fixtureResidueInode || "") ||
      !Number.isSafeInteger(plan.fixtureResidueUid) || plan.fixtureResidueUid < 0 ||
      !Number.isSafeInteger(plan.fixtureResidueGid) || plan.fixtureResidueGid < 0 ||
      !Number.isSafeInteger(plan.fixtureResidueMode) || plan.fixtureResidueMode < 0 ||
        plan.fixtureResidueMode > 0o777 ||
      !Number.isSafeInteger(plan.fixtureResidueEntryCount) || plan.fixtureResidueEntryCount < 0 ||
      ![EMPTY_FIXTURE_RESIDUE, NONEMPTY_PARTIAL_FIXTURE_RESIDUE]
        .includes(plan.fixtureResidueState) ||
      (plan.fixtureResidueState === EMPTY_FIXTURE_RESIDUE &&
        plan.fixtureResidueEntryCount !== 0) ||
      (plan.fixtureResidueState === NONEMPTY_PARTIAL_FIXTURE_RESIDUE &&
        plan.fixtureResidueEntryCount === 0) ||
      basename(plan.workspaceBasename || "") !== plan.workspaceBasename ||
      basename(plan.fixtureResidueBasename || "") !== plan.fixtureResidueBasename) {
    throw new Error("Failed rollback recovery plan path identity is unsafe.");
  }

  const historyPaths = {
    application: join(stateRoot, expectedHistory.application),
    attempt: join(stateRoot, expectedHistory.attempt),
    recheck: join(stateRoot, expectedHistory.recheck)
  };
  let historicalApplication = protectedJsonIfPresent(historyPaths.application,
    "Failed rollback application history", enforceMetadata);
  let historicalAttempt = protectedJsonIfPresent(historyPaths.attempt,
    "Failed rollback attempt history", enforceMetadata);
  let historicalRecheck = protectedJsonIfPresent(historyPaths.recheck,
    "Failed rollback recheck history", enforceMetadata);
  application ??= historicalApplication;
  attempt ??= historicalAttempt;
  recheck ??= historicalRecheck;
  if (!application || !attempt || !recheck ||
      application.identity !== plan.applicationIdentitySha256 ||
      attempt.identity !== plan.buildAttemptSha256 ||
      recheck.identity !== plan.recheckIdentitySha256 ||
      !application.bytes.equals(recheck.bytes)) {
    throw new Error("Failed rollback recovery source evidence is absent or changed.");
  }
  validateApplicationIdentity(application.record);
  validateApplicationIdentity(recheck.record);
  validateFailedAttempt(attempt.record, plan.sourceOperationsCommit, buildRoot);
  if (attempt.record.attemptId !== plan.attemptId ||
      basename(attempt.record.path) !== plan.workspaceBasename) {
    throw new Error("Failed rollback recovery evidence no longer matches its plan.");
  }

  const publish = dependencies.publish ?? publishNoReplaceSet;
  if (!historicalApplication) {
    publishEntry(historyPaths.application, application.bytes, enforceMetadata, publish);
    historicalApplication = protectedJson(historyPaths.application,
      "Failed rollback application history", enforceMetadata);
  }
  if (!historicalAttempt) {
    publishEntry(historyPaths.attempt, attempt.bytes, enforceMetadata, publish);
    historicalAttempt = protectedJson(historyPaths.attempt,
      "Failed rollback attempt history", enforceMetadata);
  }
  if (!historicalRecheck) {
    publishEntry(historyPaths.recheck, recheck.bytes, enforceMetadata, publish);
    historicalRecheck = protectedJson(historyPaths.recheck,
      "Failed rollback recheck history", enforceMetadata);
  }
  if (!historicalApplication.bytes.equals(application.bytes) ||
      !historicalAttempt.bytes.equals(attempt.bytes) ||
      !historicalRecheck.bytes.equals(recheck.bytes)) {
    throw new Error("Failed rollback audit history is not byte-identical.");
  }

  globalBoundariesSafe(stateRoot, dependencies);
  const remove = dependencies.remove ?? ((path) => rmSync(path, {
    recursive: true, force: false, maxRetries: 0
  }));
  const sync = dependencies.fsyncDirectory ?? fsyncDirectory;
  const workspace = join(buildRoot, plan.workspaceBasename);
  const residue = join(buildRoot, plan.fixtureResidueBasename);
  for (const [target, inode, label, isResidue] of [
    [workspace, plan.workspaceInode, "failed workspace", false],
    [residue, plan.fixtureResidueInode, "failed fixture residue", true]
  ]) {
    if (!existsSync(target)) continue;
    const canonical = realpathSync(target);
    const stats = lstatSync(canonical);
    if (canonical !== target || dirname(canonical) !== buildRoot ||
        !stats.isDirectory() || stats.isSymbolicLink() || `${stats.dev}:${stats.ino}` !== inode ||
        commandPasses("/usr/bin/findmnt", ["--mountpoint", canonical]) ||
        (isResidue && (dependencies.fixtureNestedMount ??
          mountAtOrBelow(canonical, options.mountInfoPath))) ||
        (dependencies.activeReference ?? hasActiveReference)(canonical, options.processRoot) ||
        selectorReferences(canonical, options.selectors)) {
      throw new Error(`Protected ${label} changed before cleanup.`);
    }
    if (isResidue) {
      if (stats.uid !== plan.fixtureResidueUid || stats.gid !== plan.fixtureResidueGid ||
          (stats.mode & 0o777) !== plan.fixtureResidueMode) {
        throw new Error("Protected failed fixture residue metadata changed before cleanup.");
      }
      const inventory = (dependencies.inspectFixtureResidue ?? inspectFailedFixtureResidue)(
        canonical,
        {
          expectedUid: plan.fixtureResidueUid,
          expectedGid: plan.fixtureResidueGid,
          expectedDev: stats.dev
        }
      );
      if (inventory.state !== plan.fixtureResidueState ||
          inventory.entryCount !== plan.fixtureResidueEntryCount ||
          inventory.inventorySha256 !== plan.fixtureResidueInventorySha256) {
        throw new Error("Protected failed fixture residue changed before cleanup.");
      }
    }
    globalBoundariesSafe(stateRoot, dependencies);
    remove(canonical);
    if (existsSync(canonical)) throw new Error(`Protected ${label} cleanup was incomplete.`);
    sync(buildRoot);
  }

  const unlink = dependencies.unlink ?? unlinkSync;
  for (const evidence of [
    protectedJsonIfPresent(paths.application, "Canonical rollback application", enforceMetadata),
    protectedJsonIfPresent(paths.attempt, "Canonical failed rollback attempt", enforceMetadata),
    protectedJsonIfPresent(paths.recheck, "Canonical rollback recheck", enforceMetadata)
  ].filter(Boolean)) {
    const expected = evidence.path === paths.application ? plan.applicationIdentitySha256 :
      evidence.path === paths.attempt ? plan.buildAttemptSha256 : plan.recheckIdentitySha256;
    if (evidence.identity !== expected) throw new Error("Canonical recovery evidence differs.");
    unlinkExact(evidence, enforceMetadata, unlink, sync);
  }
  if (Object.values(paths).some((path) => existsSync(path))) {
    throw new Error("Failed rollback canonical retry slots remain occupied.");
  }

  const expectedReport = makeReport(plan);
  let report = protectedJsonIfPresent(finalPath, "Failed rollback recovery report", enforceMetadata);
  if (!report) {
    publishEntry(finalPath, Buffer.from(`${JSON.stringify(expectedReport, null, 2)}\n`),
      enforceMetadata, publish);
    report = protectedJson(finalPath, "Failed rollback recovery report", enforceMetadata);
  }
  exactKeys(report.record, Object.keys(expectedReport), "Failed rollback recovery report");
  if (JSON.stringify(report.record) !== JSON.stringify(expectedReport) ||
      existsSync(workspace) || existsSync(residue) ||
      Object.values(paths).some((path) => existsSync(path))) {
    throw new Error("Failed rollback recovery final verification failed.");
  }
  return {
    reportIdentity: report.identity,
    attemptIdentity: plan.buildAttemptSha256,
    canonicalRetryState: "READY",
    auditPreservation: "VERIFIED",
    historyPaths
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, buildAttemptSha256, operationsCommit, recovery, ...extras] =
    process.argv.slice(2);
  if (command !== "recover" || extras.length || !buildAttemptSha256 ||
      !operationsCommit || !recovery) {
    throw new Error("Usage: failed-rollback-attempt-recovery.mjs recover <failed-attempt-sha256> <operations-commit> <recovery>");
  }
  const result = recoverFailedRollbackAttempt({
    stateRoot: STATE_ROOT,
    buildRoot: BUILD_ROOT,
    buildAttemptSha256,
    operationsCommit,
    recovery,
    operational: true
  });
  process.stdout.write(
    `FAILED_ROLLBACK_ATTEMPT_RECOVERED attempt=${result.attemptIdentity} report=${result.reportIdentity} retry-state=${result.canonicalRetryState} audit-preservation=${result.auditPreservation} values-recorded=false\n`
  );
}
