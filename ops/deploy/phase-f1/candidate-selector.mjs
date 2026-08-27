import { closeSync, existsSync, fsyncSync, lstatSync, linkSync, openSync, readlinkSync, realpathSync, symlinkSync, unlinkSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyBuildOnlyArtifactEvidence } from "./build-only-artifact.mjs";

const FORWARD_SHA = "b43a1e4e708bc9f02ef83bd63dab1db1f366b32e";
const ROLLBACK_SHA = "8db8236c16ebb5a02ec5b90f7e5308008cff7086";
const CONTRACTS = Object.freeze({
  "rollback-probe": Object.freeze({ role: "rollback-reference", selector: "/var/www/current-bcn-rollback-probe", target: `/var/www/rollbacks/${ROLLBACK_SHA}`, evidencePath: `/var/www/rollbacks/${ROLLBACK_SHA}` }),
  "circle-card": Object.freeze({ role: "circle-card", selector: "/var/www/current-circle-card", target: `/var/www/releases/${FORWARD_SHA}`, evidencePath: `/var/www/releases/${FORWARD_SHA}/.runtime/circle-card` })
});

export function validateSelectorPublication(role, operationsCommit, evidence) {
  const contract = CONTRACTS[role];
  if (!contract || !/^[0-9a-f]{40}$/u.test(operationsCommit || "")) {
    throw new Error("Candidate selector role or operations commit is invalid.");
  }
  if (evidence.buildRole !== contract.role || evidence.operationsCommit !== operationsCommit ||
      evidence.artifactPath !== contract.evidencePath || evidence.releaseIntegrity !== "PASS" ||
      evidence.selectorsPublished !== false) {
    throw new Error("Candidate selector requires exact current build-only artifact evidence.");
  }
  return contract;
}

function fsyncDirectory(path) {
  const fd = openSync(path, "r");
  try { fsyncSync(fd); } finally { closeSync(fd); }
}

export function publishCandidateSelector(role, operationsCommit, options = {}) {
  if (options.operational !== false && process.getuid?.() !== 0) throw new Error("Root selector publication is required.");
  const evidence = verifyBuildOnlyArtifactEvidence(CONTRACTS[role]?.role, operationsCommit, {
    stateRoot: options.stateRoot,
    operational: options.operational !== false
  });
  const contract = validateSelectorPublication(role, operationsCommit, evidence);
  const selector = resolve(options.selector ?? contract.selector);
  const target = resolve(options.target ?? contract.target);
  if (selector !== contract.selector || target !== contract.target || existsSync(selector) ||
      realpathSync(target) !== target || !lstatSync(target).isDirectory() || lstatSync(target).isSymbolicLink()) {
    throw new Error("Candidate selector source or destination is unsafe, occupied, or unapproved.");
  }
  const parent = dirname(selector);
  if (realpathSync(parent) !== parent) throw new Error("Candidate selector parent is not canonical.");
  const temporary = join(parent, `.${basename(selector)}.${process.pid}.build-only.tmp`);
  let published = false;
  try {
    symlinkSync(target, temporary);
    linkSync(temporary, selector);
    published = true;
    unlinkSync(temporary);
    fsyncDirectory(parent);
    const stats = lstatSync(selector);
    if (!stats.isSymbolicLink() || stats.nlink !== 1 || readlinkSync(selector) !== target || realpathSync(selector) !== target) {
      throw new Error("Candidate selector publication verification failed.");
    }
    return { role, selector, target };
  } catch (error) {
    if (existsSync(temporary) && lstatSync(temporary).isSymbolicLink() && readlinkSync(temporary) === target) unlinkSync(temporary);
    if (published && existsSync(selector) && lstatSync(selector).isSymbolicLink() && readlinkSync(selector) === target) unlinkSync(selector);
    fsyncDirectory(parent);
    throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, role, operationsCommit, ...extras] = process.argv.slice(2);
  if (command !== "publish" || extras.length || !role || !operationsCommit) {
    throw new Error("Usage: candidate-selector.mjs publish <rollback-probe|circle-card> <operations-commit>");
  }
  const result = publishCandidateSelector(role, operationsCommit, { operational: true });
  process.stdout.write(`CANDIDATE_SELECTOR_PUBLISHED role=${result.role} values-recorded=false\n`);
}
