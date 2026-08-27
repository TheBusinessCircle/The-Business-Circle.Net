import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderPackManifest } from "./pack-layout.mjs";
import {
  OPERATIONS_BASE_SHA,
  aggregateCandidateCommit
} from "./candidate-aggregate.mjs";
import { parsePackTreeRows, renderPackTar } from "./pack-tree.mjs";
import {
  renderPublicationSummary,
  verifyPublicationDirectory
} from "./publication-summary.mjs";
const FORWARD_APPLICATION_SHA = "b43a1e4e708bc9f02ef83bd63dab1db1f366b32e";
const ROLLBACK_APPLICATION_SHA = "8db8236c16ebb5a02ec5b90f7e5308008cff7086";
const HISTORICAL_PRODUCTION_SHA = "5fa2bbf6ac7d39aa14636882bbae2d2713faf11a";
const PACK_ROOT = "ops/deploy/phase-f1";
const allowed = [`${PACK_ROOT}/`, "docs/circle-card-phase-f1-server-deployment-pack.md", "src/config/phase-f1-deployment-pack.test.ts"];
const git = (args, options = {}) => execFileSync("git", args, { cwd: process.cwd(), maxBuffer: 256 * 1024 * 1024, ...options });
const sha = (value) => createHash("sha256").update(value).digest("hex");
const [operationsCommit, outputArg] = process.argv.slice(2);
if (!/^[0-9a-f]{40}$/.test(operationsCommit || "") || !outputArg) throw new Error("Usage: create-pack-artifact.mjs <operations-commit> <new-output-directory>");
if ([FORWARD_APPLICATION_SHA, ROLLBACK_APPLICATION_SHA, HISTORICAL_PRODUCTION_SHA, OPERATIONS_BASE_SHA].includes(operationsCommit)) throw new Error("Application, historical, operations-base and pack identities must remain distinct.");
if (git(["status", "--porcelain", "--untracked-files=all"], { encoding: "utf8" }).trim()) throw new Error("Pack creation requires a clean committed tree.");
if (git(["rev-parse", "--verify", `${operationsCommit}^{commit}`], { encoding: "utf8" }).trim() !== operationsCommit) throw new Error("Exact operations commit required.");
const changed = git(["diff", "--name-only", `${OPERATIONS_BASE_SHA}..${operationsCommit}`], { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
if (changed.some((path) => !allowed.some((entry) => entry.endsWith("/") ? path.startsWith(entry) : path === entry))) throw new Error("Operations commit contains ordinary application changes.");
if (!allowed.slice(1).every((path) => changed.includes(path)) || !changed.some((path) => path.startsWith(`${PACK_ROOT}/`))) throw new Error("Operations commit is missing an approved boundary file.");
const output = resolve(outputArg); if (existsSync(output)) throw new Error("Output directory must not exist."); mkdirSync(output, { mode: 0o700 }); if (realpathSync(output) !== output) throw new Error("Canonical output required.");
const treeRows = git(["ls-tree", "-r", "-t", operationsCommit, "--", PACK_ROOT], { encoding: "utf8" });
const entries = parsePackTreeRows(treeRows, ({ objectId }) => git(["cat-file", "blob", objectId]));
const manifest = renderPackManifest(entries);
const archive = renderPackTar(entries);
const bootstrap = git(["show", `${operationsCommit}:${PACK_ROOT}/bootstrap-install.sh`]);
const archiveSha256 = sha(archive), manifestSha256 = sha(manifest), bootstrapSha256 = sha(bootstrap);
const candidateAggregate = aggregateCandidateCommit(process.cwd(), operationsCommit, {
  baseCommit: OPERATIONS_BASE_SHA
});
const installedPath = `/opt/thebusinesscircle/deployment-packs/${operationsCommit}`;
const identity = JSON.stringify({ forwardApplicationSha: FORWARD_APPLICATION_SHA, rollbackApplicationSha: ROLLBACK_APPLICATION_SHA, historicalProductionSha: HISTORICAL_PRODUCTION_SHA, operationsCommit, archiveSha256, manifestSha256, bootstrapSha256, candidateAggregate, installedPath }, null, 2) + "\n";
writeFileSync(resolve(output, "phase-f1-pack.tar"), archive, { flag: "wx", mode: 0o600 });
writeFileSync(resolve(output, "installed-pack.manifest"), manifest, { flag: "wx", mode: 0o600 });
writeFileSync(resolve(output, "bootstrap-install.sh"), bootstrap, { flag: "wx", mode: 0o500 });
writeFileSync(resolve(output, "approved-pack-identity.json"), identity, { flag: "wx", mode: 0o600 });
writeFileSync(resolve(output, "EXTERNAL-SHA256SUMS"), `${archiveSha256}  phase-f1-pack.tar\n${manifestSha256}  installed-pack.manifest\n${bootstrapSha256}  bootstrap-install.sh\n${sha(identity)}  approved-pack-identity.json\n`, { flag: "wx", mode: 0o600 });
const summaryName = `PUBLICATION-SUMMARY-${operationsCommit}.txt`;
writeFileSync(resolve(output, summaryName), renderPublicationSummary(output, operationsCommit), {
  flag: "wx",
  mode: 0o600
});
verifyPublicationDirectory(output, operationsCommit);
process.stdout.write("Created deterministic six-file operations publication.\n");
