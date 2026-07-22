import { createHash } from "node:crypto";
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FORWARD_APPLICATION_SHA, HISTORICAL_PRODUCTION_SHA, ROLLBACK_APPLICATION_SHA } from "./application-identities.mjs";

const ORDER = {
  none: ["prepared"],
  prepared: ["candidates-verified"],
  "candidates-verified": ["freezing"],
  freezing: ["writers-frozen"],
  "writers-frozen": ["storage-converged"],
  "storage-converged": ["rollback-boot-ready"],
  "rollback-boot-ready": ["rollback-live"],
  "rollback-live": ["forward-bcn-switch-pending"],
  "forward-bcn-switch-pending": ["forward-bcn-starting", "rollback-live"],
  "forward-bcn-starting": ["forward-bcn-live", "rollback-live"],
  "forward-bcn-live": ["forward-live", "rollback-live"],
  "forward-live": ["traffic-switched", "circle-traffic-removed"],
  "traffic-switched": ["finalized", "circle-traffic-removed"],
  finalized: ["circle-traffic-removed"],
  "circle-traffic-removed": ["rollback-switch-pending"],
  "rollback-switch-pending": ["rollback-starting", "circle-traffic-removed"],
  "rollback-starting": ["rollback-live", "circle-traffic-removed"],
  "rolled-back": []
};
const hash = (value) => createHash("sha256").update(value).digest("hex");
const canonicalize = (value) => Array.isArray(value) ? value.map(canonicalize) :
  value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])])) : value;
const stable = (value) => JSON.stringify(canonicalize(value));
const digestKeys = [
  "forwardBcnArtifactDigest", "forwardCircleCardArtifactDigest", "rollbackBcnArtifactDigest",
  "forwardRehearsalEvidence", "rollbackRehearsalEvidence", "databaseIdentity",
  "storageConvergenceIdentity", "systemdUnitIdentity"
];

function validateIdentities(identities) {
  if (identities.forwardApplicationSha !== FORWARD_APPLICATION_SHA ||
      identities.rollbackApplicationSha !== ROLLBACK_APPLICATION_SHA ||
      identities.historicalProductionSha !== HISTORICAL_PRODUCTION_SHA ||
      !/^[0-9a-f]{40}$/u.test(identities.operationsIdentity || "") ||
      new Set(Object.values(identities)).size !== 4) {
    throw new Error("Deployment identities are missing, substituted, or conflated.");
  }
}

function validateBindings(bindings, next) {
  for (const key of digestKeys.filter((key) => key !== "storageConvergenceIdentity")) if (!/^[0-9a-f]{64}$/u.test(bindings?.[key] || "")) throw new Error(`Release binding is absent: ${key}`);
  if (bindings.storageConvergenceIdentity !== "pending" && !/^[0-9a-f]{64}$/u.test(bindings.storageConvergenceIdentity || "")) throw new Error("Storage convergence binding is invalid.");
  if (!new Set(["legacy", "rollback", "forward"]).has(bindings.activeBcnSelector)) throw new Error("Active BCN selector binding is invalid.");
  if (!new Set(["disabled", "private", "public"]).has(bindings.circleCardTrafficStatus)) throw new Error("Circle Card traffic binding is invalid.");
  if (["rollback-boot-ready", "rollback-live", "rollback-starting", "forward-bcn-switch-pending"].includes(next) && bindings.activeBcnSelector !== "rollback") throw new Error("Rollback-owned stage requires the rollback selector.");
  if (["rollback-switch-pending", "circle-traffic-removed"].includes(next) && bindings.activeBcnSelector !== "forward") throw new Error("Rollback switch intent requires the still-active forward selector.");
  if (["forward-bcn-starting", "forward-bcn-live", "forward-live", "traffic-switched", "finalized", "circle-traffic-removed"].includes(next) && bindings.activeBcnSelector !== "forward") throw new Error("Forward stage requires the forward selector.");
  if (["storage-converged", "rollback-boot-ready", "rollback-live", "rollback-switch-pending", "rollback-starting", "forward-bcn-switch-pending", "forward-bcn-starting", "forward-bcn-live", "forward-live", "traffic-switched", "finalized", "circle-traffic-removed"].includes(next) && !/^[0-9a-f]{64}$/u.test(bindings.storageConvergenceIdentity)) throw new Error("Converged stages require final storage identity.");
  if (!["traffic-switched", "finalized"].includes(next) && bindings.circleCardTrafficStatus === "public") throw new Error("Circle Card public traffic is premature.");
  if (next === "circle-traffic-removed" && bindings.circleCardTrafficStatus !== "disabled") throw new Error("Circle traffic-removal state requires disabled routing.");
}

function validateRoot(root, operational, create = false) {
  const canonical = resolve(root);
  if (!existsSync(canonical)) {
    if (!create) throw new Error("Deployment-state root is absent.");
    mkdirSync(canonical, { recursive: false, mode: 0o700 });
  }
  const stats = lstatSync(canonical);
  if (!stats.isDirectory() || stats.isSymbolicLink() || (operational && (stats.mode & 0o777) !== 0o700)) throw new Error("Unsafe deployment-state root.");
  if (operational && (stats.uid !== 0 || stats.gid !== 0)) throw new Error("Deployment-state root must be root-owned.");
  return canonical;
}

export function readState(root, { operational = false } = {}) {
  const canonical = validateRoot(root, operational);
  const path = join(canonical, "state.json");
  if (!existsSync(path)) return { stage: "none", sequence: 0 };
  const stats = lstatSync(path);
  if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1 || (operational && stats.uid !== 0)) throw new Error("Unsafe state file.");
  const envelope = JSON.parse(readFileSync(path, "utf8"));
  if (hash(stable(envelope.payload)) !== envelope.sha256) throw new Error("Deployment state checksum mismatch.");
  return envelope.payload;
}

export function transition(root, expected, next, identities, evidence = {}, bindings = {}, { operational = false } = {}) {
  validateIdentities(identities);
  validateBindings(bindings, next);
  const canonical = validateRoot(root, operational, true);
  const previous = readState(canonical, { operational });
  if (previous.stage !== expected || !ORDER[expected]?.includes(next)) throw new Error(`Illegal deployment transition ${previous.stage} -> ${next}.`);
  if (previous.sequence > 0 && stable(previous.identities) !== stable(identities)) throw new Error("Deployment identities changed during the state machine.");
  if (previous.sequence > 0) {
    for (const key of digestKeys.filter((name) => name !== "storageConvergenceIdentity")) {
      if (previous.bindings?.[key] !== bindings[key]) throw new Error(`Immutable release binding changed during the state machine: ${key}`);
    }
    if (/^[0-9a-f]{64}$/u.test(previous.bindings?.storageConvergenceIdentity || "") && previous.bindings.storageConvergenceIdentity !== bindings.storageConvergenceIdentity) {
      throw new Error("Final storage convergence identity changed during the state machine.");
    }
  }
  const payload = { stage: next, sequence: previous.sequence + 1, identities, bindings, evidence, previousSha256: hash(stable(previous)) };
  const body = JSON.stringify({ payload, sha256: hash(stable(payload)) }, null, 2) + "\n";
  const temporary = join(canonical, `.state.${process.pid}.${Date.now()}.tmp`);
  const fd = openSync(temporary, "wx", 0o600);
  try { writeFileSync(fd, body); fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(temporary, join(canonical, "state.json"));
  if (operational) {
    const directoryFd = openSync(canonical, "r");
    try { fsyncSync(directoryFd); } finally { closeSync(directoryFd); }
  }
  return payload;
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [command, root, expected, next, forwardApplicationSha, rollbackApplicationSha, historicalProductionSha, operationsIdentity, evidencePath, bindingsPath] = process.argv.slice(2);
  if (command === "read") process.stdout.write(JSON.stringify(readState(root, { operational: true })));
  else if (command === "transition") {
    let evidence = {};
    if (evidencePath) {
      const stats = lstatSync(evidencePath);
      if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1) throw new Error("Evidence path must be a single-link regular file.");
      evidence = { path: evidencePath, sha256: hash(readFileSync(evidencePath)) };
    }
    if (!bindingsPath) throw new Error("Protected release bindings are required.");
    const bindingStats = lstatSync(bindingsPath);
    if (!bindingStats.isFile() || bindingStats.isSymbolicLink() || bindingStats.nlink !== 1 || bindingStats.uid !== 0 || (bindingStats.mode & 0o077)) throw new Error("Unsafe release bindings.");
    const bindings = JSON.parse(readFileSync(bindingsPath, "utf8"));
    process.stdout.write(JSON.stringify(transition(root, expected, next, {
      forwardApplicationSha, rollbackApplicationSha, historicalProductionSha, operationsIdentity
    }, evidence, bindings, { operational: true })));
  } else throw new Error("Usage: deployment-state.mjs <read|transition> ...");
}
