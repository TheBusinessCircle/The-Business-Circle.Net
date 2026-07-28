import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { publishNoReplaceSet } from "./atomic-no-replace.mjs";
import {
  groupId,
  readEnvironmentJson
} from "./environment-file.mjs";

const require = createRequire(import.meta.url);
const {
  BCN_ALLOWED_KEYS,
  BUILD_ENV_KEYS,
  CIRCLE_ALLOWED_KEYS
} = require("./environment-groups.cjs");
const { validatePreparedEnvironmentSet } = require("./environment-contract.cjs");

const [bcnSource, circleSource, buildSource, bcnTarget, circleTarget, buildTarget] =
  process.argv.slice(2);
if (
  !bcnSource ||
  !circleSource ||
  !buildSource ||
  !bcnTarget ||
  !circleTarget ||
  !buildTarget
) {
  throw new Error(
    "Usage: publish-environment-set.mjs <bcn-source> <circle-source> <build-source> <bcn-target> <circle-target> <build-target>"
  );
}

const definitions = [
  {
    source: resolve(bcnSource),
    target: resolve(bcnTarget),
    group: "bcn-app",
    allowedKeys: BCN_ALLOWED_KEYS
  },
  {
    source: resolve(circleSource),
    target: resolve(circleTarget),
    group: "circle-card-app",
    allowedKeys: CIRCLE_ALLOWED_KEYS
  },
  {
    source: resolve(buildSource),
    target: resolve(buildTarget),
    group: "phase-f1-build",
    allowedKeys: BUILD_ENV_KEYS
  }
];

const entries = definitions.map((definition) => ({
  target: definition.target,
  payload: readFileSync(definition.source),
  uid: 0,
  gid: groupId(definition.group),
  mode: 0o640,
  verify: (target) =>
    readEnvironmentJson(target, {
      allowedKeys: definition.allowedKeys,
      expectedGroup: definition.group,
      requiredKeys: []
    })
}));

publishNoReplaceSet(entries, {
  verifySet: () => {
    const [bcn, circleCard, build] = definitions.map((definition) =>
      readEnvironmentJson(definition.target, {
        allowedKeys: definition.allowedKeys,
        expectedGroup: definition.group,
        requiredKeys: []
      })
    );
    const issues = validatePreparedEnvironmentSet({ bcn, circleCard, build });
    if (issues.length) {
      throw new Error(
        `Published protected environment set failed schema gates: ${issues
          .flatMap((issue) => issue.names ?? [])
          .filter(Boolean)
          .sort()
          .join(", ") || "provider/isolation rule"}`
      );
    }
  }
});

process.stdout.write(
  "Protected environment JSON set published atomically without replacement.\n"
);
