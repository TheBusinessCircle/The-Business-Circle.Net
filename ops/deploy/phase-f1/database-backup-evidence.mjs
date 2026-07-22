import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { FORWARD_APPLICATION_SHA, HISTORICAL_PRODUCTION_SHA, ROLLBACK_APPLICATION_SHA } from "./application-identities.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const keys = ["applicationIdentities", "archiveName", "archiveSha256", "archiveSizeBytes", "databaseIdentitySha256", "databaseSizeBytes", "restoreListSha256", "schemaVersion", "setName"];

export function validateDatabaseBackupEvidence(record) {
  if (JSON.stringify(Object.keys(record).sort()) !== JSON.stringify(keys)) throw new Error("Database backup evidence has unknown or missing fields.");
  const identities = record.applicationIdentities;
  if (JSON.stringify(Object.keys(identities || {}).sort()) !== JSON.stringify(["forward", "historical", "rollback"]) || record.schemaVersion !== 1 || identities?.forward !== FORWARD_APPLICATION_SHA || identities?.rollback !== ROLLBACK_APPLICATION_SHA || identities?.historical !== HISTORICAL_PRODUCTION_SHA) throw new Error("Database backup application identities are invalid.");
  for (const name of ["archiveSha256", "databaseIdentitySha256", "restoreListSha256"]) if (!/^[0-9a-f]{64}$/u.test(record[name] || "")) throw new Error(`Database backup digest is invalid: ${name}`);
  if (record.archiveName !== "database.dump" || !/^production-\d{8}T\d{6}\.[0-9]+Z$/u.test(record.setName || "")) throw new Error("Database backup publication name is invalid.");
  if (!Number.isSafeInteger(record.archiveSizeBytes) || record.archiveSizeBytes <= 0 || !Number.isSafeInteger(record.databaseSizeBytes) || record.databaseSizeBytes < 0) throw new Error("Database backup sizes are invalid.");
  return record;
}

export function validatePublishedBackupSet(root, { operational = false } = {}) {
  const directory = resolve(root), expected = new Set(["database.dump", "database.dump.sha256", "evidence.json"]);
  const directoryStats = lstatSync(directory);
  if (!directoryStats.isDirectory() || directoryStats.isSymbolicLink() || (operational && (directoryStats.uid !== 0 || (directoryStats.mode & 0o777) !== 0o700))) throw new Error("Unsafe database backup publication directory.");
  const names = readdirSync(directory);
  if (names.length !== expected.size || names.some((name) => !expected.has(name))) throw new Error("Database backup publication set is partial or contains extras.");
  for (const name of names) {
    const stats = lstatSync(`${directory}/${name}`);
    if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1 || (operational && (stats.uid !== 0 || (stats.mode & 0o777) !== 0o600))) throw new Error("Unsafe database backup publication object.");
  }
  const evidence = validateDatabaseBackupEvidence(JSON.parse(readFileSync(`${directory}/evidence.json`, "utf8")));
  const archive = readFileSync(`${directory}/database.dump`);
  if (sha256(archive) !== evidence.archiveSha256 || archive.length !== evidence.archiveSizeBytes) throw new Error("Database archive and evidence mismatch.");
  const expectedChecksum = `${evidence.archiveSha256}  database.dump\n`;
  if (readFileSync(`${directory}/database.dump.sha256`, "utf8") !== expectedChecksum) throw new Error("Database checksum publication mismatch.");
  return evidence;
}

if (process.argv[2] === "validate-evidence") validateDatabaseBackupEvidence(JSON.parse(readFileSync(resolve(process.argv[3]), "utf8")));
else if (process.argv[2] === "validate-set") validatePublishedBackupSet(resolve(process.argv[3]), { operational: true });
else if (process.argv[2]) throw new Error("Usage: database-backup-evidence.mjs <validate-evidence|validate-set> <path>");
