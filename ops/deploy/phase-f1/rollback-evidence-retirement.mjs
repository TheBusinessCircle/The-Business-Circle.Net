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
  unlinkSync
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  APPLICATION_IDENTITIES,
  ROLLBACK_APPLICATION_SHA,
  verifyApplicationCommit
} from "./application-identities.mjs";
import { publishNoReplaceSet } from "./atomic-no-replace.mjs";
import { gitAsBuildUser } from "./build-user-git.mjs";
import { resolveProtectedAuthorityLineage } from "./environment-readiness.mjs";

export const STALE_ROLLBACK_EVIDENCE_RETIREMENT =
  "STALE_TRUSTED_ROLLBACK_EVIDENCE_RETIREMENT";
export const RETIREMENT_PLAN_SCHEMA =
  "phase-f1-stale-rollback-evidence-retirement-plan-v1";
export const RETIREMENT_REPORT_SCHEMA =
  "phase-f1-stale-rollback-evidence-retirement-report-v1";
export const SUPPORTED_RETIREMENT_EVIDENCE = Object.freeze([
  "rollback-application-identity",
  "rollback-build-attempt-v2"
]);

const STATE_ROOT = "/var/lib/thebusinesscircle/deployment-state";
const BUILD_ROOT = "/var/www/builds";
const APPLICATION_IDENTITY_NAME = "rollback-application-identity.json";
const BUILD_ATTEMPT_NAME = "rollback-build-attempt.json";
const BUILD_ATTEMPT_FORMAT = "phase-f1-build-attempt-v2";
const SELECTORS = ["/var/www/current-bcn", "/var/www/current-circle-card"];
const sha256 = value => createHash("sha256").update(value).digest("hex");

function exactKeys(value, expected, label) {
  if (!value || Array.isArray(value) || typeof value !== "object" ||
      JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...expected].sort())) {
    throw new Error(`${label} has unknown or missing fields.`);
  }
}

function validateCommit(value, label) {
  if (!/^[0-9a-f]{40}$/u.test(value || "")) throw new Error(`${label} is invalid.`);
}

function validateDigest(value, label) {
  if (!/^[0-9a-f]{64}$/u.test(value || "")) throw new Error(`${label} is invalid.`);
}

function fsyncDirectory(directory) {
  const fd = openSync(directory, "r");
  try { fsyncSync(fd); } finally { closeSync(fd); }
}

function protectedFile(path, label, operational) {
  const stats = lstatSync(path);
  if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1 ||
      realpathSync(path) !== path ||
      (operational && (stats.uid !== 0 || stats.gid !== 0 ||
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
    inode: { dev: stats.dev, ino: stats.ino }
  };
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
    if (row.path !== expected.files[index].path || !/^[0-9a-f]{64}$/u.test(row.sha256 || "")) {
      throw new Error("Rollback application file identity differs.");
    }
  }
  return record;
}

function validateBuildAttempt(record) {
  exactKeys(record, [
    "applicationSha", "attemptId", "format", "operationsCommit", "path", "role", "status"
  ], "Rollback build-attempt evidence");
  if (record.format !== BUILD_ATTEMPT_FORMAT || record.role !== "rollback" ||
      record.applicationSha !== ROLLBACK_APPLICATION_SHA ||
      !/^[0-9a-f]{24}$/u.test(record.attemptId || "") ||
      record.status !== "prepared" ||
      resolve(record.path || "") !== record.path ||
      basename(dirname(record.path)) !== "builds" ||
      !basename(record.path).startsWith(`rollback-${ROLLBACK_APPLICATION_SHA}-`)) {
    throw new Error("Rollback build-attempt evidence is unsupported or not safely retireable.");
  }
  validateCommit(record.operationsCommit, "Rollback build-attempt operations authority");
  return record;
}

function planPath(stateRoot, currentOperationsCommit) {
  return join(stateRoot, `rollback-evidence-retirement-plan-${currentOperationsCommit}.json`);
}

function reportPath(stateRoot, currentOperationsCommit) {
  return join(stateRoot, `rollback-evidence-retirement-${currentOperationsCommit}.json`);
}

function historyNames(sourceOperationsCommit, attemptId) {
  return {
    application: `rollback-application-identity-preserved-${sourceOperationsCommit}-${attemptId}.json`,
    attempt: `rollback-build-attempt-preserved-${sourceOperationsCommit}-${attemptId}.json`
  };
}

function makePlan({ currentOperationsCommit, sourceOperationsCommit, applicationIdentity,
  buildAttemptIdentity, attemptId, workspaceBasename, history }) {
  return {
    schemaVersion: RETIREMENT_PLAN_SCHEMA,
    retirement: STALE_ROLLBACK_EVIDENCE_RETIREMENT,
    currentOperationsCommit,
    sourceOperationsCommit,
    applicationSha: ROLLBACK_APPLICATION_SHA,
    attemptId,
    workspaceBasename,
    applicationIdentitySha256: applicationIdentity,
    buildAttemptSha256: buildAttemptIdentity,
    applicationHistoryName: history.application,
    buildAttemptHistoryName: history.attempt,
    evidenceTypes: [...SUPPORTED_RETIREMENT_EVIDENCE],
    result: "PREPARED",
    valueMaterialRecorded: false
  };
}

function validatePlan(record, expected) {
  exactKeys(record, Object.keys(expected), "Rollback evidence retirement plan");
  if (JSON.stringify(record) !== JSON.stringify(expected)) {
    throw new Error("Rollback evidence retirement plan differs.");
  }
}

function makeReport(plan) {
  return {
    schemaVersion: RETIREMENT_REPORT_SCHEMA,
    retirement: plan.retirement,
    currentOperationsCommit: plan.currentOperationsCommit,
    sourceOperationsCommit: plan.sourceOperationsCommit,
    applicationSha: plan.applicationSha,
    attemptId: plan.attemptId,
    applicationIdentitySha256: plan.applicationIdentitySha256,
    buildAttemptSha256: plan.buildAttemptSha256,
    applicationHistoryName: plan.applicationHistoryName,
    buildAttemptHistoryName: plan.buildAttemptHistoryName,
    evidenceTypes: [...plan.evidenceTypes],
    canonicalApplicationIdentity: "ABSENT",
    canonicalBuildAttempt: "ABSENT",
    historicalPreservation: "VERIFIED",
    result: "RETIRED",
    valueMaterialRecorded: false
  };
}

function validateReport(record, expected) {
  exactKeys(record, Object.keys(expected), "Rollback evidence retirement report");
  if (JSON.stringify(record) !== JSON.stringify(expected)) {
    throw new Error("Rollback evidence retirement report differs.");
  }
}

function pathInside(path, root) {
  return path === root || path.startsWith(`${root}/`);
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
          if (pathInside(resolve(readlinkSync(join(process, "fd", descriptor))), target)) return true;
        } catch {}
      }
    } catch {}
  }
  return false;
}

function selectorReferences(target) {
  return SELECTORS.some((selector) => {
    try { return pathInside(realpathSync(selector), target); }
    catch { return false; }
  });
}

function commandPasses(command, arguments_) {
  try { execFileSync(command, arguments_, { stdio: "ignore" }); return true; }
  catch { return false; }
}

function numericIdentity(database, name) {
  const fields = execFileSync("/usr/bin/getent", [database, name], { encoding: "utf8" }).trim().split(":");
  if (fields.length < 3 || !/^\d+$/u.test(fields[2])) throw new Error("Build identity lookup failed.");
  return Number(fields[2]);
}

function verifyOperationalWorkspace(path, applicationRecord) {
  const canonical = realpathSync(path);
  const stats = lstatSync(canonical);
  if (canonical !== path || dirname(canonical) !== BUILD_ROOT || !stats.isDirectory() ||
      stats.isSymbolicLink() || stats.uid !== numericIdentity("passwd", "phase-f1-build") ||
      stats.gid !== numericIdentity("group", "phase-f1-build") ||
      (stats.mode & 0o777) !== 0o750 || existsSync(join(canonical, "node_modules")) ||
      existsSync(join(canonical, ".next")) || selectorReferences(canonical) ||
      hasActiveReference(canonical) ||
      commandPasses("/usr/bin/findmnt", ["--mountpoint", canonical])) {
    throw new Error("Stale rollback workspace is active or unsafe to retire.");
  }
  const verified = verifyApplicationCommit(
    canonical, "rollback", APPLICATION_IDENTITIES, gitAsBuildUser
  );
  if (JSON.stringify(verified) !== JSON.stringify(applicationRecord)) {
    throw new Error("Rollback evidence pair does not describe the same verified checkout.");
  }
}

function assertStateRoot(stateRoot, operational, enforceMetadata) {
  const root = resolve(stateRoot);
  if (operational && root !== STATE_ROOT) throw new Error("Exact rollback evidence state root required.");
  const stats = lstatSync(root);
  if (!stats.isDirectory() || stats.isSymbolicLink() || realpathSync(root) !== root ||
      (enforceMetadata && (stats.uid !== 0 || stats.gid !== 0 || (stats.mode & 0o022) !== 0))) {
    throw new Error("Rollback evidence state root is unsafe.");
  }
  return root;
}

function assertProductionContext(currentOperationsCommit) {
  if (process.getuid?.() !== 0) throw new Error("Rollback evidence retirement requires Linux root.");
  const expected = `/opt/thebusinesscircle/deployment-packs/${currentOperationsCommit}/rollback-evidence-retirement.mjs`;
  if (fileURLToPath(import.meta.url) !== expected || realpathSync(expected) !== expected) {
    throw new Error("Rollback evidence retirement must run from the authoritative installed pack.");
  }
}

function readJsonIfPresent(path, label, operational) {
  return existsSync(path) ? protectedFile(path, label, operational) : null;
}

function publishEntry(path, bytes, enforceMetadata, publish) {
  publish([{ target: path, payload: bytes, mode: 0o600,
    ...(enforceMetadata ? { uid: 0, gid: 0 } : {}) }], {
    enforceMetadata,
    fsyncDirectories: enforceMetadata
  });
}

function unlinkExact(evidence, enforceMetadata, unlink = unlinkSync, sync = fsyncDirectory) {
  if (!existsSync(evidence.path)) return;
  const current = protectedFile(evidence.path, "Canonical rollback evidence", enforceMetadata);
  if (current.identity !== evidence.identity || current.inode.dev !== evidence.inode.dev ||
      current.inode.ino !== evidence.inode.ino) {
    throw new Error("Canonical rollback evidence changed before retirement.");
  }
  unlink(evidence.path);
  if (existsSync(evidence.path)) throw new Error("Canonical rollback evidence retirement failed.");
  sync(dirname(evidence.path));
}

export function retireStaleRollbackEvidence(options, dependencies = {}) {
  exactKeys(options, [
    "applicationIdentitySha256", "buildAttemptSha256", "currentOperationsCommit",
    "retirement", "stateRoot"
  ], "Rollback evidence retirement options");
  validateCommit(options.currentOperationsCommit, "Current operations authority");
  validateDigest(options.applicationIdentitySha256, "Expected rollback application identity");
  validateDigest(options.buildAttemptSha256, "Expected rollback build-attempt identity");
  if (options.retirement !== STALE_ROLLBACK_EVIDENCE_RETIREMENT) {
    throw new Error("Unsupported rollback evidence retirement identifier.");
  }
  const operational = dependencies.operational ?? false;
  const enforceMetadata = dependencies.enforceMetadata ?? operational;
  if (operational) (dependencies.assertProductionContext ?? assertProductionContext)(options.currentOperationsCommit);
  const root = assertStateRoot(options.stateRoot, operational, enforceMetadata);
  const canonicalPaths = {
    application: join(root, APPLICATION_IDENTITY_NAME),
    attempt: join(root, BUILD_ATTEMPT_NAME)
  };
  const intentPath = planPath(root, options.currentOperationsCommit);
  const finalPath = reportPath(root, options.currentOperationsCommit);
  const existingPlan = readJsonIfPresent(intentPath, "Rollback evidence retirement plan", enforceMetadata);

  let application = readJsonIfPresent(
    canonicalPaths.application, "Canonical rollback application identity", enforceMetadata
  );
  let attempt = readJsonIfPresent(
    canonicalPaths.attempt, "Canonical rollback build attempt", enforceMetadata
  );
  if (!existingPlan && (!application || !attempt)) {
    throw new Error("Rollback evidence pair is incomplete and has no protected retirement plan.");
  }

  let plan;
  let history;
  if (existingPlan) {
    plan = existingPlan.record;
    validateDigest(plan.applicationIdentitySha256, "Planned rollback application identity");
    validateDigest(plan.buildAttemptSha256, "Planned rollback build-attempt identity");
    history = {
      application: plan.applicationHistoryName,
      attempt: plan.buildAttemptHistoryName
    };
  } else {
    validateApplicationIdentity(application.record);
    validateBuildAttempt(attempt.record);
    history = historyNames(attempt.record.operationsCommit, attempt.record.attemptId);
    plan = makePlan({
      currentOperationsCommit: options.currentOperationsCommit,
      sourceOperationsCommit: attempt.record.operationsCommit,
      applicationIdentity: application.identity,
      buildAttemptIdentity: attempt.identity,
      attemptId: attempt.record.attemptId,
      workspaceBasename: basename(attempt.record.path),
      history
    });
  }
  validateCommit(plan.sourceOperationsCommit, "Planned rollback evidence source authority");
  validateCommit(plan.currentOperationsCommit, "Planned rollback evidence current authority");
  validateDigest(plan.applicationIdentitySha256, "Planned rollback application identity");
  validateDigest(plan.buildAttemptSha256, "Planned rollback build-attempt identity");
  if (!/^[0-9a-f]{24}$/u.test(plan.attemptId || "") ||
      !new RegExp(`^rollback-${ROLLBACK_APPLICATION_SHA}-[A-Za-z0-9._-]+$`, "u")
        .test(plan.workspaceBasename || "") ||
      plan.workspaceBasename.includes("..")) {
    throw new Error("Rollback evidence retirement plan identifiers are unsafe.");
  }
  const expectedHistory = historyNames(plan.sourceOperationsCommit, plan.attemptId);
  if (history.application !== expectedHistory.application || history.attempt !== expectedHistory.attempt) {
    throw new Error("Rollback evidence history destination is not canonical.");
  }
  validatePlan(plan, makePlan({
    currentOperationsCommit: options.currentOperationsCommit,
    sourceOperationsCommit: plan.sourceOperationsCommit,
    applicationIdentity: options.applicationIdentitySha256,
    buildAttemptIdentity: options.buildAttemptSha256,
    attemptId: plan.attemptId,
    workspaceBasename: plan.workspaceBasename,
    history: expectedHistory
  }));

  const historyPaths = {
    application: join(root, expectedHistory.application),
    attempt: join(root, expectedHistory.attempt)
  };
  let historicalApplication = readJsonIfPresent(
    historyPaths.application, "Historical rollback application identity", enforceMetadata
  );
  let historicalAttempt = readJsonIfPresent(
    historyPaths.attempt, "Historical rollback build attempt", enforceMetadata
  );
  if (!existingPlan && (historicalApplication || historicalAttempt)) {
    throw new Error("Rollback evidence history exists without its protected retirement plan.");
  }
  application ??= historicalApplication;
  attempt ??= historicalAttempt;
  if (!application || !attempt || application.identity !== options.applicationIdentitySha256 ||
      attempt.identity !== options.buildAttemptSha256) {
    throw new Error("Rollback evidence identity differs from the approved retirement pair.");
  }
  validateApplicationIdentity(application.record);
  validateBuildAttempt(attempt.record);
  if (attempt.record.operationsCommit !== plan.sourceOperationsCommit ||
      attempt.record.attemptId !== plan.attemptId ||
      basename(attempt.record.path) !== plan.workspaceBasename) {
    throw new Error("Rollback evidence retirement pair or lineage differs.");
  }

  const resolveLineage = dependencies.resolveLineage ?? resolveProtectedAuthorityLineage;
  const lineage = resolveLineage(options.currentOperationsCommit);
  if (!Array.isArray(lineage) || new Set(lineage).size !== lineage.length ||
      lineage.at(-1) !== options.currentOperationsCommit ||
      !lineage.includes(plan.sourceOperationsCommit) ||
      plan.sourceOperationsCommit === options.currentOperationsCommit) {
    throw new Error("Rollback evidence source authority is not a trusted predecessor.");
  }
  (dependencies.verifyWorkspace ?? verifyOperationalWorkspace)(attempt.record.path, application.record);

  const expectedReport = makeReport(plan);
  const existingReport = readJsonIfPresent(finalPath, "Rollback evidence retirement report", enforceMetadata);
  if (existingReport) {
    validateReport(existingReport.record, expectedReport);
    if (existsSync(canonicalPaths.application) || existsSync(canonicalPaths.attempt)) {
      throw new Error("Completed rollback evidence retirement retains a canonical source.");
    }
  }

  const publish = dependencies.publish ?? publishNoReplaceSet;
  if (!existingPlan) {
    publishEntry(intentPath, Buffer.from(`${JSON.stringify(plan, null, 2)}\n`), enforceMetadata, publish);
  }
  if (!historicalApplication) {
    publishEntry(historyPaths.application, application.bytes, enforceMetadata, publish);
    historicalApplication = protectedFile(
      historyPaths.application, "Historical rollback application identity", enforceMetadata
    );
  }
  if (!historicalAttempt) {
    publishEntry(historyPaths.attempt, attempt.bytes, enforceMetadata, publish);
    historicalAttempt = protectedFile(
      historyPaths.attempt, "Historical rollback build attempt", enforceMetadata
    );
  }
  if (historicalApplication.identity !== application.identity ||
      historicalAttempt.identity !== attempt.identity ||
      !historicalApplication.bytes.equals(application.bytes) ||
      !historicalAttempt.bytes.equals(attempt.bytes)) {
    throw new Error("Historical rollback evidence byte identity differs.");
  }

  if (!existingReport) {
    const unlink = dependencies.unlink ?? unlinkSync;
    const sync = dependencies.fsyncDirectory ?? fsyncDirectory;
    const canonicalApplication = readJsonIfPresent(canonicalPaths.application,
      "Canonical rollback application identity", enforceMetadata);
    const canonicalAttempt = readJsonIfPresent(canonicalPaths.attempt,
      "Canonical rollback build attempt", enforceMetadata);
    if (canonicalApplication) unlinkExact(canonicalApplication, enforceMetadata, unlink, sync);
    if (canonicalAttempt) unlinkExact(canonicalAttempt, enforceMetadata, unlink, sync);
    if (existsSync(canonicalPaths.application) || existsSync(canonicalPaths.attempt)) {
      throw new Error("Rollback evidence canonical slots remain occupied.");
    }
    publishEntry(finalPath, Buffer.from(`${JSON.stringify(expectedReport, null, 2)}\n`), enforceMetadata, publish);
  }

  const finalReport = protectedFile(finalPath, "Rollback evidence retirement report", enforceMetadata);
  validateReport(finalReport.record, expectedReport);
  if (existsSync(canonicalPaths.application) || existsSync(canonicalPaths.attempt)) {
    throw new Error("Rollback evidence canonical-slot absence verification failed.");
  }
  return {
    applicationIdentity: application.identity,
    buildAttemptIdentity: attempt.identity,
    sourceOperationsCommit: plan.sourceOperationsCommit,
    currentOperationsCommit: options.currentOperationsCommit,
    reportIdentity: finalReport.identity,
    historyPaths,
    reportPath: finalPath,
    canonicalSlots: "ABSENT",
    historicalPreservation: "VERIFIED"
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, applicationIdentitySha256, buildAttemptSha256,
    currentOperationsCommit, retirement, ...extras] = process.argv.slice(2);
  if (command !== "retire" || extras.length || !applicationIdentitySha256 ||
      !buildAttemptSha256 || !currentOperationsCommit || !retirement) {
    throw new Error("Usage: rollback-evidence-retirement.mjs retire <application-identity-sha256> <build-attempt-sha256> <current-operations-commit> <retirement>");
  }
  const result = retireStaleRollbackEvidence({
    stateRoot: STATE_ROOT,
    applicationIdentitySha256,
    buildAttemptSha256,
    currentOperationsCommit,
    retirement
  }, { operational: true });
  process.stdout.write(
    `STALE_ROLLBACK_EVIDENCE_RETIRED application=${result.applicationIdentity} attempt=${result.buildAttemptIdentity} report=${result.reportIdentity} values-recorded=false\n`
  );
}
