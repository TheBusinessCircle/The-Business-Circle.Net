import { createRequire } from "node:module";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const groups = require("./environment-groups.cjs");
const extensions = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx"]);
export function applicationEnvironmentNames(root) {
  const names = new Set();
  function visit(path) { for (const name of readdirSync(path)) { if (["node_modules", ".next", ".git"].includes(name)) continue; const item = join(path, name), stats = lstatSync(item); if (stats.isSymbolicLink()) throw new Error("Source symlink rejected during environment audit."); if (stats.isDirectory()) visit(item); else if (stats.isFile() && extensions.has(extname(name))) { const body = readFileSync(item, "utf8"); for (const match of body.matchAll(/process\.env(?:\.([A-Z][A-Z0-9_]*)|\[['\"]([A-Z][A-Z0-9_]*)['\"]\])/g)) names.add(match[1] || match[2]); } } }
  for (const path of [join(root, "src"), join(root, "scripts")]) visit(path);
  for (const name of ["next.config.ts"]) { const path = join(root, name); if (lstatSync(path).isFile()) { const body = readFileSync(path, "utf8"); for (const match of body.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) names.add(match[1]); } }
  return [...names].sort();
}
export function unclassifiedEnvironmentNames(root) {
  const classified = new Set([...groups.SHARED_KEYS, ...groups.BCN_ONLY_KEYS, ...groups.CIRCLE_CARD_ONLY_KEYS, ...groups.BUILD_ENV_KEYS, ...groups.TOOLING_ONLY_KEYS, ...groups.DELIBERATELY_UNSUPPORTED_KEYS, ...Object.values(groups.RUNTIME_VALUES).flatMap(Object.keys)]);
  return applicationEnvironmentNames(root).filter((name) => !classified.has(name));
}
if (fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const unknown = unclassifiedEnvironmentNames(resolve(process.argv[2]));
  if (unknown.length) { process.stderr.write(`Unclassified production-read names: ${unknown.join(", ")}\n`); process.exitCode = 1; }
  else process.stdout.write("All production-read environment names are explicitly classified.\n");
}
