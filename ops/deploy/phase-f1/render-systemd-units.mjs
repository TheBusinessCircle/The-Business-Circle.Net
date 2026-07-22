import { createHash } from "node:crypto";
import { closeSync, fsyncSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PACK_TOKEN = "@@PHASE_F1_PACK_DIR@@";
const COMMIT_TOKEN = "@@PHASE_F1_OPERATIONS_COMMIT@@";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function renderSystemdUnit(template, operationsCommit) {
  if (!/^[0-9a-f]{40}$/u.test(operationsCommit || "")) throw new Error("Exact operations commit is required for unit rendering.");
  const packPath = `/opt/thebusinesscircle/deployment-packs/${operationsCommit}`;
  if (!template.includes(PACK_TOKEN)) throw new Error("Systemd template lacks the immutable pack token.");
  const rendered = template.replaceAll(PACK_TOKEN, packPath).replaceAll(COMMIT_TOKEN, operationsCommit);
  if (rendered.includes(PACK_TOKEN) || rendered.includes(COMMIT_TOKEN) || rendered.includes("deployment-packs/current") || /deployment-packs\/(?:agent|main|master)(?:\/|\b)/u.test(rendered)) throw new Error("Mutable or unresolved operations identity in rendered unit.");
  for (const line of rendered.split("\n").filter((value) => /^(?:ExecStart|ExecCondition)=/u.test(value))) {
    if (!line.includes(packPath)) throw new Error("Systemd executable path is not bound to the operations commit.");
  }
  return { rendered, packPath, sha256: sha256(rendered) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [templatePath, operationsCommit, outputPath] = process.argv.slice(2);
  if (!templatePath || !outputPath) throw new Error("Usage: render-systemd-units.mjs <template> <operations-commit> <new-output>");
  const { rendered, sha256: digest } = renderSystemdUnit(readFileSync(resolve(templatePath), "utf8"), operationsCommit);
  const fd = openSync(resolve(outputPath), "wx", 0o600);
  try { writeFileSync(fd, rendered); fsyncSync(fd); } finally { closeSync(fd); }
  process.stdout.write(`${basename(outputPath)}\t${digest}`);
}
