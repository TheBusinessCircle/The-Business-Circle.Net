import { randomBytes } from "node:crypto";
import { closeSync, existsSync, fsyncSync, lstatSync, openSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

const FORMAT = "phase-f1-build-attempt-v2";
function validate(record) {
  const keys = ["applicationSha", "attemptId", "format", "operationsCommit", "path", "role", "status"];
  if (
    JSON.stringify(Object.keys(record).sort()) !== JSON.stringify(keys) ||
    record.format !== FORMAT ||
    !/^[0-9a-f]{40}$/u.test(record.applicationSha) ||
    !/^[0-9a-f]{40}$/u.test(record.operationsCommit) ||
    !/^[0-9a-f]{24}$/u.test(record.attemptId) ||
    !new Set(["forward", "rollback"]).has(record.role) ||
    !new Set(["prepared", "consumed", "failed", "complete"]).has(record.status) ||
    typeof record.path !== "string" ||
    resolve(record.path) !== record.path ||
    basename(dirname(record.path)) !== "builds" ||
    !basename(record.path).startsWith(`${record.role}-${record.applicationSha}-`)
  ) throw new Error("Invalid build-attempt state.");
  return record;
}
function writeAtomic(path, record, replace = false) {
  if (!replace && existsSync(path)) throw new Error("Build-attempt state already exists.");
  const temporary = `${path}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`, fd = openSync(temporary, "wx", 0o600);
  try { writeFileSync(fd, `${JSON.stringify(record, null, 2)}\n`); fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(temporary, path);
}
function readProtectedAttempt(path) {
  const stats = lstatSync(path);
  if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1) throw new Error("Unsafe build-attempt evidence.");
  return validate(JSON.parse(readFileSync(path, "utf8")));
}
function requireIdentity(record, { role, applicationSha, operationsCommit }) {
  if (
    record.role !== role ||
    record.applicationSha !== applicationSha ||
    record.operationsCommit !== operationsCommit
  ) throw new Error("Build attempt is stale, reused, or for another identity.");
}
export function createBuildAttempt(path, { role, applicationSha, operationsCommit, workspace, attemptId = randomBytes(12).toString("hex") }) {
  const record = validate({ format: FORMAT, role, applicationSha, operationsCommit, path: resolve(workspace), attemptId, status: "prepared" });
  writeAtomic(path, record); return record;
}
export function inspectBuildAttempt(path, identity) {
  const record = readProtectedAttempt(path);
  requireIdentity(record, identity);
  if (record.status !== "prepared") throw new Error("Build attempt is stale, reused, or for another identity.");
  return record;
}
export function consumeBuildAttempt(path, identity) {
  const record = inspectBuildAttempt(path, identity);
  const consumed = { ...record, status: "consumed" }; writeAtomic(path, consumed, true); return consumed;
}
export function finishBuildAttempt(path, status, operationsCommit) {
  if (!new Set(["failed", "complete"]).has(status)) throw new Error("Invalid terminal build status.");
  const record = readProtectedAttempt(path);
  if (record.status !== "consumed" || record.operationsCommit !== operationsCommit) throw new Error("Only a current-authority consumed build attempt can finish.");
  const finished = { ...record, status }; writeAtomic(path, finished, true); return finished;
}
const [command, path, role, applicationSha, operationsCommit, workspace] = process.argv.slice(2);
if (command === "create") createBuildAttempt(resolve(path), { role, applicationSha, operationsCommit, workspace });
else if (command === "inspect") process.stdout.write(inspectBuildAttempt(resolve(path), { role, applicationSha, operationsCommit }).path);
else if (command === "consume") process.stdout.write(consumeBuildAttempt(resolve(path), { role, applicationSha, operationsCommit }).path);
else if (command === "finish") finishBuildAttempt(resolve(path), role, applicationSha);
else if (command) throw new Error("Usage: build-state.mjs <create|inspect|consume|finish> ...");
