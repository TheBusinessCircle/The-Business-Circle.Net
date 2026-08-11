import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readEnvironmentJson } from "./environment-file.mjs";
const require = createRequire(import.meta.url);
const { APPROVED_SHA, BCN_ALLOWED_KEYS, BUILD_ENV_KEYS, CIRCLE_ALLOWED_KEYS, REQUIRED_BCN_KEYS, REQUIRED_CIRCLE_KEYS, REQUIRED_SHARED_KEYS, RUNTIME_VALUES } = require("./environment-groups.cjs");
const { validatePreparedEnvironmentSet } = require("./environment-contract.cjs");
const definitions = {
  bcn: { file: "/etc/thebusinesscircle/bcn/runtime.env.json", group: "bcn-app", allowed: BCN_ALLOWED_KEYS, required: [...REQUIRED_SHARED_KEYS, ...REQUIRED_BCN_KEYS] },
  "circle-card": { file: "/etc/thebusinesscircle/circle-card/runtime.env.json", group: "circle-card-app", allowed: CIRCLE_ALLOWED_KEYS, required: [...REQUIRED_SHARED_KEYS, ...REQUIRED_CIRCLE_KEYS] },
  build: { file: "/etc/thebusinesscircle/build/build.env.json", group: "phase-f1-build", allowed: BUILD_ENV_KEYS, required: [] }
};
const expectedRuntimeValues = {
  bcn: {
    NODE_ENV: "production", APP_BRAND: "bcn",
    APP_URL: "https://thebusinesscircle.net", AUTH_URL: "https://thebusinesscircle.net",
    NEXTAUTH_URL: "https://thebusinesscircle.net", NEXT_RUNTIME_DIST_DIR: ".runtime/bcn",
    PORT: "3000", HOSTNAME: "127.0.0.1"
  },
  "circle-card": {
    NODE_ENV: "production", APP_BRAND: "circle-card",
    APP_URL: "https://circlecard.co.uk", AUTH_URL: "https://circlecard.co.uk",
    NEXTAUTH_URL: "https://circlecard.co.uk", NEXT_RUNTIME_DIST_DIR: ".runtime/circle-card",
    PORT: "3200", HOSTNAME: "127.0.0.1", BCN_COMMUNITY_AUTOMATION_ENABLED: "false"
  }
};
export function loadProtectedEnvironment(mode) {
  const definition = definitions[mode];
  return readEnvironmentJson(definition.file, { allowedKeys: definition.allowed, requiredKeys: definition.required, expectedGroup: definition.group });
}
export function validateEnvironmentPolicy(mode, values) {
  if ((values.CIRCLE_CARD_BILLING_ACCESS_MODE || "").trim().toLowerCase() !== "operator") throw new Error("Billing access must remain operator-only during this release.");
  if (mode === "circle-card") {
    const forbidden = ["STRIPE_WEBHOOK_SECRET", "RESEND_API_KEY", "CRON_SECRET", "RESEND_WEBHOOK_SECRET", "LIVEKIT_API_SECRET", "TURN_SHARED_SECRET"];
    if (forbidden.some((key) => Object.hasOwn(values, key))) throw new Error("Circle Card environment contains BCN authority.");
  }
}
export function validateRuntimeIdentityPolicy(runtimeValues = RUNTIME_VALUES) {
  if (JSON.stringify(runtimeValues) !== JSON.stringify(expectedRuntimeValues)) {
    throw new Error("Fixed runtime identity policy differs from the approved Phase F1 contract.");
  }
  return true;
}
export function validateProtectedEnvironmentSchema(load = loadProtectedEnvironment) {
  const bcn = load("bcn");
  const circleCard = load("circle-card");
  const build = load("build");
  validateEnvironmentPolicy("bcn", bcn);
  validateEnvironmentPolicy("circle-card", circleCard);
  validateRuntimeIdentityPolicy();
  const issues = validatePreparedEnvironmentSet({ bcn, circleCard, build });
  if (issues.length) {
    const names = issues.flatMap((issue) => issue.names ?? []).sort();
    throw new Error(`Protected environment contract failed: ${names.join(", ") || "provider/isolation rule"}`);
  }
  return { bcn, circleCard, build };
}

export function validateApplicationRuntime(mode) {
  const values = loadProtectedEnvironment(mode); validateEnvironmentPolicy(mode, values);
  const release = `/var/www/releases/${APPROVED_SHA}`;
  const validator = `${release}/scripts/validate-production-env.ts`, tsx = `${release}/node_modules/tsx/dist/cli.mjs`;
  if (!existsSync(validator) || !existsSync(tsx)) throw new Error("Approved runtime must exist before application validation.");
  const result = spawnSync("/usr/bin/node", [tsx, validator, "--context", "runtime", "--env-file", "/dev/null"], { env: { HOME: "/root", PATH: "/usr/local/bin:/usr/bin:/bin", LANG: "C.UTF-8", TZ: "Europe/London", ...values, ...RUNTIME_VALUES[mode] }, stdio: "inherit" });
  if (result.error) throw result.error; if (result.status !== 0) process.exit(result.status ?? 1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const mode = process.argv[2];
  if (mode === "schema") {
    validateProtectedEnvironmentSchema();
    process.stdout.write("Protected environment schemas are exact and billing is operator-only.\n");
  } else if (mode === "bcn" || mode === "circle-card") {
    validateApplicationRuntime(mode);
  } else throw new Error("Validation mode must be schema, bcn, or circle-card.");
}
