/* eslint-disable @typescript-eslint/no-require-imports -- installed Node CommonJS helper */
const {
  BCN_ALLOWED_KEYS,
  BCN_ONLY_KEYS,
  BUILD_ENV_KEYS,
  CIRCLE_ALLOWED_KEYS,
  CIRCLE_CARD_ONLY_KEYS,
  DELIBERATELY_UNSUPPORTED_KEYS,
  LEGACY_SOURCE_CLASSIFICATIONS,
  REQUIRED_BCN_KEYS,
  REQUIRED_CIRCLE_KEYS,
  REQUIRED_SHARED_KEYS,
  RUNTIME_VALUES,
  SHARED_KEYS,
  TOOLING_ONLY_KEYS
} = require("./environment-groups.cjs");
const { buildEnvironment } = require("./environment-serialization.cjs");

const REDIS_PROVIDER_PAIRS = Object.freeze([
  Object.freeze([
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN"
  ]),
  Object.freeze([
    "KV_REST_API_URL",
    "KV_REST_API_TOKEN"
  ])
]);

const MIGRATION_ALLOWLIST = new Set([
  ...SHARED_KEYS,
  ...BCN_ONLY_KEYS,
  ...CIRCLE_CARD_ONLY_KEYS,
  ...BUILD_ENV_KEYS
]);

const RECOGNISED_NON_MIGRATING_NAMES = new Set([
  ...Object.keys(LEGACY_SOURCE_CLASSIFICATIONS),
  ...DELIBERATELY_UNSUPPORTED_KEYS,
  ...TOOLING_ONLY_KEYS,
  ...Object.values(RUNTIME_VALUES).flatMap((values) => Object.keys(values))
]);

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function nonEmpty(values, key) {
  return typeof values[key] === "string" && values[key].trim() !== "";
}

function assertKnownSanitizedNames(values) {
  const unknownNames = Object.keys(values)
    .filter(
      (key) =>
        !MIGRATION_ALLOWLIST.has(key) &&
        !RECOGNISED_NON_MIGRATING_NAMES.has(key)
    )
    .sort();
  if (unknownNames.length) {
    throw new Error(
      `Sanitised operator input contains unclassified names: ${unknownNames.join(", ")}`
    );
  }
}

function assertNoNonMigratingOutput(values, label) {
  const forbidden = Object.keys(values)
    .filter(
      (key) =>
        TOOLING_ONLY_KEYS.includes(key) ||
        DELIBERATELY_UNSUPPORTED_KEYS.includes(key) ||
        Object.hasOwn(LEGACY_SOURCE_CLASSIFICATIONS, key)
    )
    .sort();
  if (forbidden.length) {
    throw new Error(
      `${label} contains non-migrating names: ${forbidden.join(", ")}`
    );
  }
}

function sharedValueIssues(bcn, circleCard) {
  const issues = [];
  for (const key of SHARED_KEYS) {
    const bcnPresent = nonEmpty(bcn, key);
    const circlePresent = nonEmpty(circleCard, key);
    if (bcnPresent !== circlePresent) {
      issues.push({ code: "shared-presence-mismatch", names: [key] });
    } else if (bcnPresent && bcn[key] !== circleCard[key]) {
      issues.push({ code: "shared-value-mismatch", names: [key] });
    }
  }
  return issues;
}

function redisProviderIssues(values) {
  const states = REDIS_PROVIDER_PAIRS.map((names) => ({
    names,
    present: names.filter((key) => nonEmpty(values, key))
  }));
  const partial = states.filter(
    ({ present }) => present.length > 0 && present.length < 2
  );
  if (partial.length) {
    return partial.map(({ names, present }) => ({
      code: "redis-provider-partial",
      names: names.filter((key) => !present.includes(key))
    }));
  }
  const complete = states.filter(({ present }) => present.length === 2);
  if (complete.length === 0) {
    return [
      {
        code: "redis-provider-absent",
        alternatives: REDIS_PROVIDER_PAIRS.map((pair) => [...pair])
      }
    ];
  }
  if (complete.length > 1) {
    return [
      {
        code: "redis-provider-conflict",
        names: uniqueSorted(complete.flatMap(({ names }) => names))
      }
    ];
  }
  return [];
}

function validatePreparedEnvironmentSet({ bcn, circleCard, build }) {
  const issues = [];
  const bcnAllowed = new Set(BCN_ALLOWED_KEYS);
  const circleAllowed = new Set(CIRCLE_ALLOWED_KEYS);
  const buildAllowed = new Set(BUILD_ENV_KEYS);

  for (const [label, values, allowed] of [
    ["bcn", bcn, bcnAllowed],
    ["circle-card", circleCard, circleAllowed],
    ["build", build, buildAllowed]
  ]) {
    const extras = Object.keys(values)
      .filter((key) => !allowed.has(key))
      .sort();
    if (extras.length) {
      issues.push({ code: "unapproved-output-name", scope: label, names: extras });
    }
    try {
      assertNoNonMigratingOutput(values, label);
    } catch {
      issues.push({
        code: "non-migrating-output-name",
        scope: label,
        names: Object.keys(values)
          .filter(
            (key) =>
              TOOLING_ONLY_KEYS.includes(key) ||
              DELIBERATELY_UNSUPPORTED_KEYS.includes(key) ||
              Object.hasOwn(LEGACY_SOURCE_CLASSIFICATIONS, key)
          )
          .sort()
      });
    }
  }

  for (const [scope, values, required] of [
    ["bcn", bcn, [...REQUIRED_SHARED_KEYS, ...REQUIRED_BCN_KEYS]],
    [
      "circle-card",
      circleCard,
      [...REQUIRED_SHARED_KEYS, ...REQUIRED_CIRCLE_KEYS]
    ]
  ]) {
    const missing = required.filter((key) => !nonEmpty(values, key)).sort();
    if (missing.length) {
      issues.push({ code: "missing-required-names", scope, names: missing });
    }
  }

  issues.push(...sharedValueIssues(bcn, circleCard));
  issues.push(...redisProviderIssues(bcn));
  issues.push(
    ...redisProviderIssues(circleCard).map((issue) => ({
      ...issue,
      scope: "circle-card"
    }))
  );

  if (
    nonEmpty(bcn, "RESEND_API_KEY") &&
    nonEmpty(circleCard, "CIRCLE_CARD_RESEND_API_KEY") &&
    bcn.RESEND_API_KEY === circleCard.CIRCLE_CARD_RESEND_API_KEY
  ) {
    issues.push({
      code: "circle-card-resend-identity-reused",
      names: ["RESEND_API_KEY", "CIRCLE_CARD_RESEND_API_KEY"]
    });
  }

  if (Object.hasOwn(circleCard, "BCN_COMMUNITY_AUTOMATION_ENABLED")) {
    issues.push({
      code: "bcn-setting-in-circle-card-output",
      scope: "circle-card",
      names: ["BCN_COMMUNITY_AUTOMATION_ENABLED"]
    });
  }
  if (
    RUNTIME_VALUES["circle-card"].BCN_COMMUNITY_AUTOMATION_ENABLED !== "false"
  ) {
    issues.push({
      code: "circle-card-automation-fixed-value-invalid",
      names: ["BCN_COMMUNITY_AUTOMATION_ENABLED"]
    });
  }

  return issues;
}

function prepareSanitizedEnvironment(values) {
  assertKnownSanitizedNames(values);
  const sources = [values];
  const bcnBuild = buildEnvironment(
    BCN_ALLOWED_KEYS,
    [...REQUIRED_SHARED_KEYS, ...REQUIRED_BCN_KEYS],
    sources
  );
  const circleBuild = buildEnvironment(
    CIRCLE_ALLOWED_KEYS,
    [...REQUIRED_SHARED_KEYS, ...REQUIRED_CIRCLE_KEYS],
    sources
  );
  const build = buildEnvironment(BUILD_ENV_KEYS, [], sources).result;
  const excludedInputNames = Object.keys(values)
    .filter((key) => !MIGRATION_ALLOWLIST.has(key))
    .sort();
  const prepared = {
    bcn: bcnBuild.result,
    circleCard: circleBuild.result,
    build
  };
  return {
    ...prepared,
    excludedInputNames,
    issues: validatePreparedEnvironmentSet(prepared)
  };
}

module.exports = {
  MIGRATION_ALLOWLIST,
  REDIS_PROVIDER_PAIRS,
  assertKnownSanitizedNames,
  assertNoNonMigratingOutput,
  prepareSanitizedEnvironment,
  redisProviderIssues,
  sharedValueIssues,
  validatePreparedEnvironmentSet
};
