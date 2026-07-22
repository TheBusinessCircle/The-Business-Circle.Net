import { randomBytes } from "node:crypto";
import { closeSync, existsSync, fsyncSync, lstatSync, openSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const units = new Map([
  ["the-business-circle-network-candidate.service", 3100],
  ["the-business-circle-network-rollback-probe.service", 3300],
  ["circle-card.service", 3200]
]);
const exactKeys = ["cleanupRequired", "format", "invocationId", "port", "preState", "unit"];

export function validateCandidateInvocation(record, unit, port) {
  if (JSON.stringify(Object.keys(record).sort()) !== JSON.stringify(exactKeys) || record.format !== "phase-f1-candidate-invocation-v1" || record.preState !== "inactive" || record.cleanupRequired !== true || record.unit !== unit || record.port !== Number(port) || units.get(unit) !== Number(port) || !/^[0-9a-f]{24}$/u.test(record.invocationId || "")) throw new Error("Candidate invocation ownership is invalid.");
  return record;
}

export function createCandidateInvocation(path, unit, port, { preState = "inactive", portWasFree = true, invocationId = randomBytes(12).toString("hex") } = {}) {
  if (existsSync(path) || preState !== "inactive" || !portWasFree) throw new Error("Candidate pre-state is not safe.");
  const record = validateCandidateInvocation({ format: "phase-f1-candidate-invocation-v1", unit, port: Number(port), preState, invocationId, cleanupRequired: true }, unit, port);
  const temporary = `${path}.${process.pid}.tmp`, fd = openSync(temporary, "wx", 0o600);
  try { writeFileSync(fd, `${JSON.stringify(record)}\n`); fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(temporary, path);
  return record;
}

export function readCandidateInvocation(path, unit, port, { operational = false } = {}) {
  const stats = lstatSync(path);
  if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1 || (operational && (stats.uid !== 0 || (stats.mode & 0o777) !== 0o600))) throw new Error("Unsafe candidate invocation ownership file.");
  return validateCandidateInvocation(JSON.parse(readFileSync(path, "utf8")), unit, port);
}

export function validateCandidateCleanupResult(result) {
  const keys = ["activeState", "journalPreserved", "mainPid", "ownershipVerified", "port", "portFree", "stopSucceeded", "unit"];
  if (JSON.stringify(Object.keys(result).sort()) !== JSON.stringify(keys) || result.ownershipVerified !== true || units.get(result.unit) !== result.port || result.stopSucceeded !== true || result.journalPreserved !== true || result.activeState !== "inactive" || result.mainPid !== 0 || result.portFree !== true) throw new Error("Candidate cleanup did not reach a proven terminal state.");
  return true;
}

const [command, path, unit, port, preState, portWasFree] = process.argv.slice(2);
if (command === "create") createCandidateInvocation(resolve(path), unit, Number(port), { preState, portWasFree: portWasFree === "true" });
else if (command === "verify") readCandidateInvocation(resolve(path), unit, Number(port), { operational: true });
else if (command === "cleanup-check") validateCandidateCleanupResult(JSON.parse(readFileSync(resolve(path), "utf8")));
else if (command) throw new Error("Usage: candidate-invocation.mjs <create|verify> <path> <unit> <port> [pre-state] [port-was-free]");
