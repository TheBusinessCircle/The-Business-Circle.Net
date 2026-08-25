import { lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FORWARD_APPLICATION_SHA, FORWARD_BUILD_ROLES } from "./build-role-contract.mjs";

const RELEASE_ROOT = `/var/www/releases/${FORWARD_APPLICATION_SHA}`;
const FORBIDDEN_NAMES = new Set([
  ".env", ".env.local", ".env.production", "operator-input.env", "runtime.env.json",
  "build.env.json", "id_ed25519", "id_rsa", ".npmrc"
]);
const SENSITIVE_KEY = /(?:SECRET|TOKEN|PASSWORD|PRIVATE|DATABASE_URL|RESEND_API_KEY|STRIPE_SECRET_KEY|CLOUDINARY_API_SECRET|UPSTASH|KV_REST)/u;
const PROTECTED_FILES = Object.freeze([
  "/etc/thebusinesscircle/build/build.env.json",
  "/etc/thebusinesscircle/bcn/runtime.env.json",
  "/etc/thebusinesscircle/circle-card/runtime.env.json",
  "/var/lib/thebusinesscircle/build/git-auth/github-deploy-key"
]);

function collectSensitiveValues(files = PROTECTED_FILES) {
  const values = [];
  for (const path of files) {
    const bytes = readFileSync(path);
    if (!path.endsWith(".json")) {
      if (bytes.length >= 8) values.push(bytes);
      continue;
    }
    const record = JSON.parse(bytes.toString("utf8"));
    for (const [key, value] of Object.entries(record)) {
      if (SENSITIVE_KEY.test(key) && typeof value === "string" && value.length >= 8) values.push(Buffer.from(value));
    }
  }
  return values;
}

export function verifyArtifactEnvironmentExclusion(role, root, options = {}) {
  const contract = role === "forward-release" ? { path: RELEASE_ROOT } : FORWARD_BUILD_ROLES[role];
  if (!contract) throw new Error("Artifact exclusion role must be forward-release, bcn, or circle-card.");
  const expected = role === "forward-release" ? RELEASE_ROOT : `${RELEASE_ROOT}/${contract.runtimeRelativePath}`;
  const requested = resolve(root);
  const operational = options.operational === true;
  if (operational && requested !== expected) throw new Error("Artifact exclusion root is outside the fixed release contract.");
  if (realpathSync(requested) !== requested || lstatSync(requested).isSymbolicLink()) {
    throw new Error("Artifact exclusion root is unsafe or noncanonical.");
  }
  const protectedValues = options.protectedValues ?? (operational ? collectSensitiveValues() : []);
  let filesScanned = 0;
  const visit = directory => {
    for (const name of readdirSync(directory)) {
      const path = join(directory, name);
      const stats = lstatSync(path);
      const relativePath = relative(requested, path).replaceAll("\\", "/");
      if (FORBIDDEN_NAMES.has(name) || name.startsWith(".env.")) {
        throw new Error(`Artifact contains prohibited environment or credential material: ${relativePath}`);
      }
      if (stats.isDirectory()) visit(path);
      else if (stats.isFile()) {
        filesScanned += 1;
        const bytes = readFileSync(path);
        if (protectedValues.some(value => value.length >= 8 && bytes.includes(value))) {
          throw new Error(`Artifact contains protected value material: ${relativePath}`);
        }
      }
    }
  };
  visit(requested);
  return { role, root: requested, filesScanned, prohibitedMaterial: false, valueMaterialRecorded: false };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, role, ...extras] = process.argv.slice(2);
  if (command !== "verify" || extras.length || !role) {
    throw new Error("Usage: artifact-environment-exclusion.mjs verify <forward-release|bcn|circle-card>");
  }
  const contract = role === "forward-release" ? { runtimeRelativePath: "" } : FORWARD_BUILD_ROLES[role];
  if (!contract) throw new Error("Unknown artifact exclusion role.");
  const root = role === "forward-release" ? RELEASE_ROOT : `${RELEASE_ROOT}/${contract.runtimeRelativePath}`;
  const result = verifyArtifactEnvironmentExclusion(role, root, { operational: true });
  process.stdout.write(`ARTIFACT_ENVIRONMENT_EXCLUSION_PASS role=${role} files=${result.filesScanned} values-recorded=false\n`);
}
