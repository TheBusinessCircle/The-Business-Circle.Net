import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { readEnvironmentJson } from "./environment-file.mjs";
const require = createRequire(import.meta.url);
const { APPROVED_SHA, BCN_ALLOWED_KEYS, CIRCLE_ALLOWED_KEYS, REQUIRED_BCN_KEYS, REQUIRED_CIRCLE_KEYS, REQUIRED_SHARED_KEYS, RUNTIME_VALUES } = require("./environment-groups.cjs");
const definitions = {
  bcn: { file: "/etc/thebusinesscircle/bcn/runtime.env.json", group: "bcn-app", allowed: BCN_ALLOWED_KEYS, required: [...REQUIRED_SHARED_KEYS, ...REQUIRED_BCN_KEYS] },
  "circle-card": { file: "/etc/thebusinesscircle/circle-card/runtime.env.json", group: "circle-card-app", allowed: CIRCLE_ALLOWED_KEYS, required: [...REQUIRED_SHARED_KEYS, ...REQUIRED_CIRCLE_KEYS] }
};
function load(mode) {
  const definition = definitions[mode];
  return readEnvironmentJson(definition.file, { allowedKeys: definition.allowed, requiredKeys: definition.required, expectedGroup: definition.group });
}
function policy(mode, values) {
  if ((values.CIRCLE_CARD_BILLING_ACCESS_MODE || "").trim().toLowerCase() !== "operator") throw new Error("Billing access must remain operator-only during this release.");
  if (mode === "circle-card") {
    const forbidden = ["STRIPE_WEBHOOK_SECRET", "RESEND_API_KEY", "CRON_SECRET", "RESEND_WEBHOOK_SECRET", "LIVEKIT_API_SECRET", "TURN_SHARED_SECRET"];
    if (forbidden.some((key) => Object.hasOwn(values, key))) throw new Error("Circle Card environment contains BCN authority.");
  }
}
const mode = process.argv[2];
if (mode === "schema") {
  for (const name of Object.keys(definitions)) policy(name, load(name));
  process.stdout.write("Protected environment schemas are exact and billing is operator-only.\n");
} else if (definitions[mode]) {
  const values = load(mode); policy(mode, values);
  const release = `/var/www/releases/${APPROVED_SHA}`;
  const validator = `${release}/scripts/validate-production-env.ts`, tsx = `${release}/node_modules/tsx/dist/cli.mjs`;
  if (!existsSync(validator) || !existsSync(tsx)) throw new Error("Approved runtime must exist before application validation.");
  const result = spawnSync("/usr/bin/node", [tsx, validator, "--env-file", "/dev/null"], { env: { HOME: "/root", PATH: "/usr/local/bin:/usr/bin:/bin", LANG: "C.UTF-8", TZ: "Europe/London", ...values, ...RUNTIME_VALUES[mode] }, stdio: "inherit" });
  if (result.error) throw result.error; if (result.status !== 0) process.exit(result.status ?? 1);
} else throw new Error("Validation mode must be schema, bcn, or circle-card.");
