import { createHash } from "node:crypto";
import { closeSync, existsSync, fsyncSync, lstatSync, openSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateReleaseEvidence } from "./validate-release-gates.mjs";

const sha = (value) => createHash("sha256").update(value).digest("hex");
function safeFile(path, operational) {
  const stats = lstatSync(path);
  if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1 || (operational && (stats.uid !== 0 || (stats.mode & 0o077)))) throw new Error(`Unsafe release-binding input: ${path}`);
  return readFileSync(path);
}
const combined = (paths, operational) => sha(Buffer.concat(paths.sort().map((path) => safeFile(path, operational))));

export function createReleaseBindings(stateRoot, artifactRoot, operationsIdentity, activeBcnSelector, circleCardTrafficStatus, { operational = false } = {}) {
  if (!/^[0-9a-f]{40}$/u.test(operationsIdentity || "")) throw new Error("Operations identity is invalid.");
  const state = resolve(stateRoot), artifacts = resolve(artifactRoot);
  const forwardRehearsalEvidence = validateReleaseEvidence(state, "forward", { operational });
  const rollbackRehearsalEvidence = validateReleaseEvidence(state, "rollback", { operational });
  const storagePath = join(state, "storage-manifest-index.sha256");
  const artifactIdentity = (role, fallback) => {
    const sealed = join(artifacts, `${role}.artifact.json`);
    return sha(safeFile(existsSync(sealed) ? sealed : join(artifacts, fallback), operational));
  };
  return {
    forwardBcnArtifactDigest: artifactIdentity("forward-bcn", "runtime-bcn.manifest"),
    forwardCircleCardArtifactDigest: artifactIdentity("forward-circle-card", "runtime-circle-card.manifest"),
    rollbackBcnArtifactDigest: artifactIdentity("rollback-bcn", "rollback-release.manifest"),
    forwardRehearsalEvidence,
    rollbackRehearsalEvidence,
    databaseIdentity: sha(safeFile(join(state, "database-backup.evidence.json"), operational)),
    storageConvergenceIdentity: existsSync(storagePath) ? sha(safeFile(storagePath, operational)) : "pending",
    systemdUnitIdentity: sha(safeFile(join(state, "systemd-unit-manifest.sha256"), operational)),
    activeBcnSelector,
    circleCardTrafficStatus
  };
}

export function writeReleaseBindings(path, bindings) {
  const target = resolve(path), temporary = `${target}.${process.pid}.tmp`;
  const fd = openSync(temporary, "wx", 0o600);
  try { writeFileSync(fd, `${JSON.stringify(bindings, null, 2)}\n`); fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(temporary, target);
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [stateRoot, artifactRoot, operationsIdentity, activeBcnSelector, circleCardTrafficStatus] = process.argv.slice(2);
  if (!stateRoot || !artifactRoot) throw new Error("Usage: release-bindings.mjs <state-root> <artifact-root> <operations-commit> <legacy|rollback|forward> <disabled|private|public>");
  const bindings = createReleaseBindings(stateRoot, artifactRoot, operationsIdentity, activeBcnSelector, circleCardTrafficStatus, { operational: true });
  writeReleaseBindings(join(resolve(stateRoot), "release-bindings.json"), bindings);
  process.stdout.write(combined([join(resolve(stateRoot), "release-bindings.json")], true));
}
