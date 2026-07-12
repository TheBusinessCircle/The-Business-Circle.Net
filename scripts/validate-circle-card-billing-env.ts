import {
  parseCircleCardBillingEnabled,
  validateCircleCardBillingEnvironment
} from "./circle-card-billing-config";
import { loadLocalEnv } from "./load-env";

const envFileIndex = process.argv.indexOf("--env-file");
const envFile = envFileIndex >= 0 ? process.argv[envFileIndex + 1] : ".env.production";

loadLocalEnv({ files: envFile ? [envFile] : [] });

const issues = validateCircleCardBillingEnvironment();

if (issues.length) {
  for (const issue of issues) {
    console.error(`[ERROR] ${issue.message}`);
  }

  process.exit(1);
}

console.info(
  parseCircleCardBillingEnabled()
    ? "Circle Card billing environment validation passed for enabled billing."
    : "Circle Card billing is disabled; optional Circle Card Stripe configuration was not required."
);
