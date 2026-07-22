import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { verifyInstalledPack } from "./pack-layout.mjs";
const FORWARD_SHA = "2c83694de301b0244c5586c1598aceb10fa2214b";
const ROLLBACK_SHA = "5d1f81bb05a01b08e1134785c2f86b77c8969fe3";
const HISTORICAL_SHA = "5fa2bbf6ac7d39aa14636882bbae2d2713faf11a";
const sha = (value) => createHash("sha256").update(value).digest("hex");
function protectedFile(path) { const s = lstatSync(path); if (!s.isFile() || s.isSymbolicLink() || s.nlink !== 1 || s.uid !== 0 || (s.mode & 0o022)) throw new Error("Unsafe protected identity file."); }
const identityPath = resolve(process.argv[2] || ""); protectedFile(identityPath);
const identity = JSON.parse(readFileSync(identityPath, "utf8"));
if (identity.forwardApplicationSha !== FORWARD_SHA || identity.rollbackApplicationSha !== ROLLBACK_SHA || identity.historicalProductionSha !== HISTORICAL_SHA || !/^[0-9a-f]{40}$/.test(identity.operationsCommit) || new Set([FORWARD_SHA, ROLLBACK_SHA, HISTORICAL_SHA, identity.operationsCommit]).size !== 4 || !/^[0-9a-f]{64}$/.test(identity.archiveSha256) || !/^[0-9a-f]{64}$/.test(identity.manifestSha256) || identity.candidateAggregate?.schemaVersion !== "phase-f1-candidate-aggregate-v1" || !Number.isSafeInteger(identity.candidateAggregate.fileCount) || identity.candidateAggregate.fileCount < 1 || !/^[0-9a-f]{64}$/.test(identity.candidateAggregate.aggregateSha256 || "")) throw new Error("Invalid external identity.");
const pack = realpathSync(identity.installedPath); if (pack !== identity.installedPath) throw new Error("Installed pack path is not canonical.");
let current = "/"; for (const part of pack.split("/").filter(Boolean)) { current = join(current, part); const s = lstatSync(current); if (!s.isDirectory() || s.isSymbolicLink() || s.uid !== 0 || (s.mode & 0o022)) throw new Error("Unsafe pack path component."); }
const manifestPath = join(pack, ".installed-pack.manifest"); protectedFile(manifestPath);
const manifest = readFileSync(manifestPath, "utf8"); if (sha(manifest) !== identity.manifestSha256) throw new Error("External manifest identity mismatch.");
verifyInstalledPack(pack, manifest, { operational: true });
process.stdout.write([identity.operationsCommit, identity.archiveSha256, identity.manifestSha256, identity.installedPath].join("\t"));
