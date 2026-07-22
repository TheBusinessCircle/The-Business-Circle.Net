import { createHash } from "node:crypto";
import { closeSync, lstatSync, openSync, readSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hashFile(path, expected) {
  const digest = createHash("sha256");
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  const descriptor = openSync(path, "r");
  try {
    for (;;) {
      const bytes = readSync(descriptor, buffer, 0, buffer.length, null);
      if (!bytes) break;
      digest.update(buffer.subarray(0, bytes));
    }
  } finally {
    closeSync(descriptor);
  }
  const after = lstatSync(path);
  if (!after.isFile() || after.size !== expected.size || after.mtimeMs !== expected.mtimeMs ||
      after.ctimeMs !== expected.ctimeMs || after.ino !== expected.ino) {
    throw new Error(`Storage file changed while it was being inventoried: ${path}`);
  }
  return digest.digest("hex");
}

export function storageInventory(root) {
  const stats = lstatSync(root);
  if (!stats.isDirectory() || stats.isSymbolicLink() || realpathSync(root) !== root) {
    throw new Error(`Storage root must be a canonical non-symlink directory: ${root}`);
  }
  const rows = [];
  function visit(directory) {
    for (const name of readdirSync(directory).sort()) {
      if (/[\r\n\0]/.test(name)) throw new Error("Storage filename contains an unsupported control character.");
      const absolute = join(directory, name);
      const path = relative(root, absolute).split(sep).join("/");
      const entry = lstatSync(absolute);
      if (entry.isSymbolicLink()) throw new Error(`Storage symlink rejected: ${path}`);
      if (entry.isDirectory()) {
        rows.push(`D - 0 ${path}`);
        visit(absolute);
      } else if (entry.isFile()) {
        rows.push(`F ${hashFile(absolute, entry)} ${entry.size} ${path}`);
      } else {
        throw new Error(`Storage special file rejected: ${path}`);
      }
    }
  }
  visit(root);
  return rows;
}

export function assertSourceSubset(source, destination) {
  const sourceRows = storageInventory(source);
  const destinationRows = new Set(storageInventory(destination));
  const missing = sourceRows.filter((row) => !destinationRows.has(row));
  if (missing.length) throw new Error("Shared storage does not contain an exact source subset.");
  return { sourceRows, destinationRows: [...destinationRows].sort() };
}

export function compareStorage(source, destination) {
  const sourceRows = storageInventory(source);
  const destinationRows = storageInventory(destination);
  const byPath = (rows) => new Map(rows.map((row) => [row.split(" ").slice(3).join(" "), row]));
  const sourceMap = byPath(sourceRows);
  const destinationMap = byPath(destinationRows);
  const changed = [];
  const destinationOnly = [];
  for (const [path, row] of sourceMap) {
    if (destinationMap.has(path) && destinationMap.get(path) !== row) changed.push(path);
  }
  for (const path of destinationMap.keys()) if (!sourceMap.has(path)) destinationOnly.push(path);
  return { sourceRows, destinationRows, changed: changed.sort(), destinationOnly: destinationOnly.sort() };
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [command, source, destination, manifest] = process.argv.slice(2);
  if (command === "audit") {
    const rows = storageInventory(source);
    writeFileSync(destination, rows.join("\n") + "\n", { mode: 0o600, flag: "wx" });
    process.stdout.write(JSON.stringify({ files: rows.filter((row) => row.startsWith("F ")).length, manifestSha256: hash(Buffer.from(rows.join("\n") + "\n")) }));
  } else if (command === "subset") {
    const result = assertSourceSubset(source, destination);
    if (manifest) writeFileSync(manifest, result.destinationRows.join("\n") + "\n", { mode: 0o600, flag: "wx" });
    process.stdout.write(JSON.stringify({
      sourceFiles: result.sourceRows.filter((row) => row.startsWith("F ")).length,
      destinationFiles: result.destinationRows.filter((row) => row.startsWith("F ")).length
    }));
  } else if (command === "compare") {
    const result = compareStorage(source, destination);
    if (manifest) writeFileSync(manifest, JSON.stringify({ changed: result.changed, destinationOnly: result.destinationOnly }, null, 2) + "\n", { mode: 0o600, flag: "wx" });
    process.stdout.write(JSON.stringify({ changed: result.changed.length, destinationOnly: result.destinationOnly.length }));
  } else {
    throw new Error("Usage: storage-manifest.mjs <audit|subset|compare> <source> <destination> [manifest]");
  }
}
