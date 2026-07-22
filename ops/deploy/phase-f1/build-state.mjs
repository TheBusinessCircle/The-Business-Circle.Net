import { randomBytes } from "node:crypto";
import { closeSync, existsSync, fsyncSync, lstatSync, openSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const FORMAT = "phase-f1-build-attempt-v1";
function validate(record) {
  const keys = ["applicationSha", "attemptId", "format", "path", "role", "status"];
  if (JSON.stringify(Object.keys(record).sort()) !== JSON.stringify(keys) || record.format !== FORMAT || !/^[0-9a-f]{40}$/u.test(record.applicationSha) || !/^[0-9a-f]{24}$/u.test(record.attemptId) || !new Set(["forward", "rollback"]).has(record.role) || !new Set(["prepared", "consumed", "failed", "complete"]).has(record.status)) throw new Error("Invalid build-attempt state.");
  return record;
}
function writeAtomic(path, record, replace = false) {
  if (!replace && existsSync(path)) throw new Error("Build-attempt state already exists.");
  const temporary = `${path}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`, fd = openSync(temporary, "wx", 0o600);
  try { writeFileSync(fd, `${JSON.stringify(record, null, 2)}\n`); fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(temporary, path);
}
export function createBuildAttempt(path, { role, applicationSha, workspace, attemptId = randomBytes(12).toString("hex") }) {
  const record = validate({ format: FORMAT, role, applicationSha, path: resolve(workspace), attemptId, status: "prepared" });
  writeAtomic(path, record); return record;
}
export function consumeBuildAttempt(path, { role, applicationSha }) {
  const stats = lstatSync(path);
  if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1) throw new Error("Unsafe build-attempt evidence.");
  const record = validate(JSON.parse(readFileSync(path, "utf8")));
  if (record.status !== "prepared" || record.role !== role || record.applicationSha !== applicationSha) throw new Error("Build attempt is stale, reused, or for another identity.");
  const consumed = { ...record, status: "consumed" }; writeAtomic(path, consumed, true); return consumed;
}
export function finishBuildAttempt(path, status) {
  if (!new Set(["failed", "complete"]).has(status)) throw new Error("Invalid terminal build status.");
  const record = validate(JSON.parse(readFileSync(path, "utf8")));
  if (record.status !== "consumed") throw new Error("Only a consumed build attempt can finish.");
  const finished = { ...record, status }; writeAtomic(path, finished, true); return finished;
}
const [command, path, role, applicationSha, workspace] = process.argv.slice(2);
if (command === "create") createBuildAttempt(resolve(path), { role, applicationSha, workspace });
else if (command === "consume") process.stdout.write(consumeBuildAttempt(resolve(path), { role, applicationSha }).path);
else if (command === "finish") finishBuildAttempt(resolve(path), role);
else if (command) throw new Error("Usage: build-state.mjs <create|consume|finish> ...");
