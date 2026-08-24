import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { afterEach, describe, it } from "node:test";
import { publishNoReplaceSet } from "./atomic-no-replace.mjs";
import {
  PROTECTED_ENVIRONMENT_DEFINITIONS,
  evaluateProtectedReadiness
} from "./report-protected-readiness.mjs";
import {
  analyseEnvironmentSources,
  renderLegacyReportText
} from "./report-environment.mjs";

const require = createRequire(import.meta.url);
const packRoot = fileURLToPath(new URL(".", import.meta.url));
const groups = require("./environment-groups.cjs");
const {
  prepareSanitizedEnvironment,
  redisProviderIssues,
  sharedValueIssues,
  validatePreparedEnvironmentSet
} = require("./environment-contract.cjs");

const roots = [];
const temporaryRoot = () => {
  const root = mkdtempSync(join(tmpdir(), "phase-f1-machine-readiness-"));
  roots.push(root);
  return root;
};
afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

const LEGACY_CLASSIFICATIONS = Object.freeze({
  COMPOSE_APP_ENV_FILE: "legacy-infrastructure-metadata",
  LIVEKIT_PORT: "legacy-infrastructure-metadata",
  LIVEKIT_RTC_PORT_END: "legacy-infrastructure-metadata",
  LIVEKIT_RTC_PORT_START: "legacy-infrastructure-metadata",
  LIVEKIT_TCP_PORT: "legacy-infrastructure-metadata",
  LIVEKIT_USE_EXTERNAL_IP: "legacy-infrastructure-metadata",
  NEXT_PUBLIC_LIVEKIT_URL: "legacy-deliberately-excluded",
  NEXT_PUBLIC_SITE_URL: "legacy-deliberately-excluded",
  POSTGRES_DB: "legacy-tooling-only",
  POSTGRES_USER: "legacy-tooling-only",
  TURN_MAX_PORT: "legacy-infrastructure-metadata",
  TURN_MIN_PORT: "legacy-infrastructure-metadata",
  TURN_TLS_CA_FILE: "legacy-infrastructure-metadata",
  TURN_TLS_CIPHER_LIST: "legacy-infrastructure-metadata"
});

function publicationEntries(root) {
  return ["bcn", "circle-card", "build"].map((name) => {
    const directory = join(root, name);
    mkdirSync(directory);
    return {
      target: join(directory, "runtime.env.json"),
      payload: Buffer.from(`{"FIXTURE_SCOPE":"${name}"}\n`),
      mode: 0o640
    };
  });
}

const publicationOptions = {
  enforceMetadata: process.platform !== "win32",
  fsyncDirectories: process.platform !== "win32"
};

describe("Phase F1 sanitised environment contract", () => {
  it("classifies all 14 legacy names and excludes them from every output", () => {
    assert.deepEqual(groups.LEGACY_SOURCE_CLASSIFICATIONS, LEGACY_CLASSIFICATIONS);
    const marker = "LOCAL_ONLY_NON_PRODUCTION_FIXTURE_VALUE";
    const prepared = prepareSanitizedEnvironment(
      Object.fromEntries(
        Object.keys(LEGACY_CLASSIFICATIONS).map((name) => [name, marker])
      )
    );
    assert.deepEqual(prepared.excludedInputNames, Object.keys(LEGACY_CLASSIFICATIONS).sort());
    for (const values of [prepared.bcn, prepared.circleCard, prepared.build]) {
      for (const name of Object.keys(LEGACY_CLASSIFICATIONS)) {
        assert.equal(Object.hasOwn(values, name), false);
      }
    }
  });

  it("never migrates tooling-only or unsupported names", () => {
    const prepared = prepareSanitizedEnvironment({
      POSTGRES_PASSWORD: "LOCAL_ONLY_TOOLING_FIXTURE",
      ADMIN_PASSWORD: "LOCAL_ONLY_TOOLING_FIXTURE",
      SEED_MODE: "production",
      DEMO_MEMBER_PASSWORD: "LOCAL_ONLY_UNSUPPORTED_FIXTURE",
      RESEND_TEST_TO: "fixture@example.invalid"
    });
    for (const values of [prepared.bcn, prepared.circleCard, prepared.build]) {
      for (const name of [
        "POSTGRES_PASSWORD",
        "ADMIN_PASSWORD",
        "SEED_MODE",
        "DEMO_MEMBER_PASSWORD",
        "RESEND_TEST_TO"
      ]) {
        assert.equal(Object.hasOwn(values, name), false);
      }
    }
  });

  it("reports missing names without including fixture values", () => {
    const marker = "LOCAL_ONLY_VALUE_MUST_NOT_APPEAR";
    const report = evaluateProtectedReadiness({
      bcn: { DATABASE_URL: marker },
      circleCard: { DATABASE_URL: marker },
      build: {}
    });
    assert.equal(report.ready, false);
    assert.ok(
      report.issues.some(({ code }) => code === "missing-required-names")
    );
    assert.equal(JSON.stringify(report).includes(marker), false);
  });

  it("blocks conflicting shared values and accepts identical shared values", () => {
    assert.deepEqual(
      sharedValueIssues(
        { DATABASE_URL: "LOCAL_ONLY_DATABASE_A" },
        { DATABASE_URL: "LOCAL_ONLY_DATABASE_B" }
      ),
      [{ code: "shared-value-mismatch", names: ["DATABASE_URL"] }]
    );
    assert.deepEqual(
      sharedValueIssues(
        { DATABASE_URL: "LOCAL_ONLY_DATABASE_A" },
        { DATABASE_URL: "LOCAL_ONLY_DATABASE_A" }
      ),
      []
    );
  });

  it("requires exactly one complete Redis provider pair", () => {
    assert.equal(redisProviderIssues({}).at(0)?.code, "redis-provider-absent");
    assert.deepEqual(redisProviderIssues({
      UPSTASH_REDIS_REST_URL: "https://redis.invalid"
    }), [{
      code: "redis-provider-partial",
      names: ["UPSTASH_REDIS_REST_TOKEN"]
    }]);
    assert.deepEqual(redisProviderIssues({
      UPSTASH_REDIS_REST_URL: "https://redis.invalid",
      UPSTASH_REDIS_REST_TOKEN: "LOCAL_ONLY_REDIS_FIXTURE"
    }), []);
    assert.equal(redisProviderIssues({
      UPSTASH_REDIS_REST_URL: "https://redis.invalid",
      UPSTASH_REDIS_REST_TOKEN: "LOCAL_ONLY_REDIS_FIXTURE",
      KV_REST_API_URL: "https://redis-alias.invalid",
      KV_REST_API_TOKEN: "LOCAL_ONLY_REDIS_ALIAS_FIXTURE"
    }).at(0)?.code, "redis-provider-conflict");
  });

  it("keeps BCN authority and automation out of Circle Card", () => {
    const issues = validatePreparedEnvironmentSet({
      bcn: {},
      circleCard: {
        STRIPE_WEBHOOK_SECRET: "LOCAL_ONLY_WEBHOOK_FIXTURE",
        BCN_COMMUNITY_AUTOMATION_ENABLED: "true"
      },
      build: {}
    });
    assert.ok(issues.some(({ code }) => code === "unapproved-output-name"));
    assert.ok(
      issues.some(({ code }) => code === "bcn-setting-in-circle-card-output")
    );
    assert.equal(
      groups.RUNTIME_VALUES["circle-card"].BCN_COMMUNITY_AUTOMATION_ENABLED,
      "false"
    );
  });

  it("requires a separate Circle Card Resend identity", () => {
    const issues = validatePreparedEnvironmentSet({
      bcn: { RESEND_API_KEY: "LOCAL_ONLY_SHARED_RESEND_FIXTURE" },
      circleCard: {
        CIRCLE_CARD_RESEND_API_KEY: "LOCAL_ONLY_SHARED_RESEND_FIXTURE"
      },
      build: {}
    });
    assert.ok(
      issues.some(({ code }) => code === "circle-card-resend-identity-reused")
    );
  });

  it("keeps protected JSON authoritative and group readability isolated", () => {
    assert.deepEqual(
      Object.fromEntries(
        Object.entries(PROTECTED_ENVIRONMENT_DEFINITIONS).map(
          ([scope, definition]) => [
            scope,
            [definition.file, definition.group]
          ]
        )
      ),
      {
        bcn: [
          "/etc/thebusinesscircle/bcn/runtime.env.json",
          "bcn-app"
        ],
        circleCard: [
          "/etc/thebusinesscircle/circle-card/runtime.env.json",
          "circle-card-app"
        ],
        build: [
          "/etc/thebusinesscircle/build/build.env.json",
          "phase-f1-build"
        ]
      }
    );
    assert.notEqual(
      PROTECTED_ENVIRONMENT_DEFINITIONS.bcn.group,
      PROTECTED_ENVIRONMENT_DEFINITIONS.circleCard.group
    );
  });

  it("labels historical scanning as non-authoritative and never prints values", () => {
    const marker = "LOCAL_ONLY_VALUE_MUST_NOT_APPEAR";
    const output = renderLegacyReportText(
      analyseEnvironmentSources([
        {
          sourceId: "HISTORICAL_DOTENV",
          source:
            Object.keys(LEGACY_CLASSIFICATIONS)
              .map((name) => `${name}=${marker}`)
              .join("\n") + "\n"
        }
      ])
    );
    assert.match(output, /Legacy source report/);
    assert.match(output, /LEGACY_SOURCE_REPORT/);
    assert.doesNotMatch(output, /MACHINE_READINESS/);
    assert.equal(output.includes(marker), false);

    const preflight = readFileSync(
      join(packRoot, "preflight-read-only.sh"),
      "utf8"
    );
    assert.ok(
      preflight.indexOf("report-protected-readiness.mjs") <
        preflight.indexOf("report-environment.mjs")
    );
  });

  it("uses explicit sanitized input and explicit runtime validation context", () => {
    const preparation = readFileSync(
      join(packRoot, "prepare-environment.sh"),
      "utf8"
    );
    const validation = readFileSync(
      join(packRoot, "validate-environment.mjs"),
      "utf8"
    );
    assert.match(preparation, /sanitised operator input path is required/);
    assert.doesNotMatch(preparation, /SOURCE_ENV|SOURCE_PRODUCTION_ENV|OVERRIDE_FILE/);
    assert.doesNotMatch(
      preparation,
      /install -m 0640|cp .*runtime\.env\.json|mv .*runtime\.env\.json/
    );
    assert.match(preparation, /publish-environment-set\.mjs/);
    assert.match(
      preparation,
      /readonly OPERATOR_INPUT_PATH=\$\{2:-\}/
    );
    assert.equal(
      preparation.includes('OPERATOR_INPUT="${OPERATOR_INPUT_PATH}" \\\n'),
      true
    );
    assert.doesNotMatch(preparation, /readonly OPERATOR_INPUT=/);
    assert.doesNotMatch(
      preparation,
      /OPERATOR_INPUT="\$\{OPERATOR_INPUT\}"/
    );
    assert.match(validation, /"--context", "runtime"/);
    for (const name of ["POSTGRES_PASSWORD", "ADMIN_PASSWORD", "SEED_MODE"]) {
      assert.equal(groups.BCN_ALLOWED_KEYS.includes(name), false);
      assert.equal(groups.CIRCLE_ALLOWED_KEYS.includes(name), false);
      assert.equal(groups.TOOLING_ONLY_KEYS.includes(name), true);
    }
  });

  it("PREPARE_ENVIRONMENT_READONLY_OPERATOR_INPUT_BINDING_FIXED", () => {
    const preparation = readFileSync(
      join(packRoot, "prepare-environment.sh"),
      "utf8"
    );
    for (const check of [
      "[[ -n ${OPERATOR_INPUT_PATH} ]]",
      "[[ -f ${OPERATOR_INPUT_PATH} && ! -L ${OPERATOR_INPUT_PATH} ]]",
      '[[ $(realpath -e "${OPERATOR_INPUT_PATH}") == "${OPERATOR_INPUT_PATH}" ]]',
      '[[ $(stat -c \'%U:%G:%a:%h\' "${OPERATOR_INPUT_PATH}") == "root:root:600:1" ]]'
    ]) {
      assert.equal(preparation.includes(check), true);
    }
    assert.equal(
      preparation.includes('OPERATOR_INPUT="${OPERATOR_INPUT_PATH}" \\\n'),
      true
    );
    assert.equal(preparation.includes("OPERATOR_INPUT: readonly variable"), false);
  });

  it(
    "passes an immutable validated path through the OPERATOR_INPUT child binding",
    { skip: process.platform === "win32" },
    () => {
      const output = execFileSync(
        "/usr/bin/bash",
        [
          "-c",
          [
            "set -Eeuo pipefail",
            "readonly OPERATOR_INPUT_PATH=/run/synthetic-operator-input.env",
            "OPERATOR_INPUT=\"${OPERATOR_INPUT_PATH}\" /usr/bin/node -e " +
              "'if (process.env.OPERATOR_INPUT !== \"/run/synthetic-operator-input.env\") process.exit(1)'",
            "printf 'PREPARE_ENVIRONMENT_READONLY_OPERATOR_INPUT_BINDING_FIXED\\n'"
          ].join("\n")
        ],
        { encoding: "utf8" }
      );
      assert.equal(
        output,
        "PREPARE_ENVIRONMENT_READONLY_OPERATOR_INPUT_BINDING_FIXED\n"
      );
    }
  );

  it("PREPARE_ENVIRONMENT_READONLY_PAYLOAD_BINDING_FIXED", () => {
    const preparation = readFileSync(
      join(packRoot, "prepare-environment.sh"),
      "utf8"
    );
    assert.match(
      preparation,
      /readonly BCN_PAYLOAD_PATH CIRCLE_PAYLOAD_PATH BUILD_PAYLOAD_PATH/
    );
    for (const [childName, trustedName] of [
      ["BCN_PAYLOAD", "BCN_PAYLOAD_PATH"],
      ["CIRCLE_PAYLOAD", "CIRCLE_PAYLOAD_PATH"],
      ["BUILD_PAYLOAD", "BUILD_PAYLOAD_PATH"]
    ]) {
      assert.equal(
        preparation.includes(`${childName}="\${${trustedName}}" \\\n`),
        true
      );
      assert.doesNotMatch(
        preparation,
        new RegExp(`readonly(?: [A-Z_]+)* ${childName}(?: |$)`, "mu")
      );
    }
    assert.equal(preparation.includes("BCN_PAYLOAD: readonly variable"), false);
    assert.equal(preparation.includes("CIRCLE_PAYLOAD: readonly variable"), false);
    assert.equal(preparation.includes("BUILD_PAYLOAD: readonly variable"), false);
  });

  it(
    "maps all immutable trusted payload paths into child-only bindings",
    { skip: process.platform === "win32" },
    () => {
      const output = execFileSync(
        "/usr/bin/bash",
        [
          "-c",
          [
            "set -Eeuo pipefail",
            "readonly BCN_PAYLOAD_PATH=/trusted/bcn.payload",
            "readonly CIRCLE_PAYLOAD_PATH=/trusted/circle-card.payload",
            "readonly BUILD_PAYLOAD_PATH=/trusted/build.payload",
            "BCN_PAYLOAD=\"${BCN_PAYLOAD_PATH}\" CIRCLE_PAYLOAD=\"${CIRCLE_PAYLOAD_PATH}\" BUILD_PAYLOAD=\"${BUILD_PAYLOAD_PATH}\" /usr/bin/node -e " +
              "'const expected={BCN_PAYLOAD:\"/trusted/bcn.payload\",CIRCLE_PAYLOAD:\"/trusted/circle-card.payload\",BUILD_PAYLOAD:\"/trusted/build.payload\"}; for(const [name,value] of Object.entries(expected)){if(process.env[name]!==value)process.exit(1)}'",
            "printf 'PREPARE_ENVIRONMENT_READONLY_PAYLOAD_BINDING_FIXED\\n'"
          ].join("\n")
        ],
        {
          encoding: "utf8",
          env: {
            ...process.env,
            BCN_PAYLOAD: "/caller/override-bcn",
            CIRCLE_PAYLOAD: "/caller/override-circle",
            BUILD_PAYLOAD: "/caller/override-build"
          }
        }
      );
      assert.equal(
        output,
        "PREPARE_ENVIRONMENT_READONLY_PAYLOAD_BINDING_FIXED\n"
      );
    }
  );

  it("uses one operations-bound rollback build-attempt JSON handoff", () => {
    const checkout = readFileSync(join(packRoot, "prepare-checkout.sh"), "utf8");
    const fixture = readFileSync(join(packRoot, "prepare-rollback-fixture.sh"), "utf8");
    const state = readFileSync(join(packRoot, "build-state.mjs"), "utf8");
    assert.match(checkout, /\$\{ROLE\}-build-attempt\.json/u);
    assert.match(checkout, /"\$\{PHASE_F1_PACK_COMMIT\}" "\$\{attempt\}"/u);
    assert.match(fixture, /rollback-build-attempt\.json/u);
    assert.doesNotMatch(fixture, /rollback-build-attempt\.path/u);
    assert.ok(fixture.indexOf('build-state.mjs" inspect') < fixture.indexOf('build-state.mjs" consume'));
    assert.match(state, /phase-f1-build-attempt-v2/u);
    assert.match(state, /operationsCommit/u);
  });

  it("retires only the protected stale rollback evidence pair", () => {
    const retirement = readFileSync(join(packRoot, "rollback-evidence-retirement.mjs"), "utf8");
    const wrapper = readFileSync(join(packRoot, "retire-stale-rollback-evidence.sh"), "utf8");
    assert.match(retirement, /STALE_TRUSTED_ROLLBACK_EVIDENCE_RETIREMENT/u);
    assert.match(retirement, /rollback-application-identity\.json/u);
    assert.match(retirement, /rollback-build-attempt\.json/u);
    assert.match(retirement, /resolveProtectedAuthorityLineage/u);
    assert.match(retirement, /publishNoReplaceSet/u);
    assert.match(retirement, /Historical rollback evidence byte identity differs/u);
    assert.match(retirement, /canonicalSlots: "ABSENT"/u);
    assert.doesNotMatch(wrapper, /\b(?:mv|cp|rm)\b/u);
    assert.match(wrapper, /require_pack_integrity/u);
    assert.match(wrapper, /STALE_TRUSTED_ROLLBACK_EVIDENCE_RETIREMENT/u);
    assert.doesNotMatch(wrapper, /source-path|destination|history-path/u);
  });

  it("pins build-user GitHub SSH trust and guards failed-checkout cleanup", () => {
    const checkout = readFileSync(join(packRoot, "prepare-checkout.sh"), "utf8");
    const trust = readFileSync(join(packRoot, "git-transport-trust.mjs"), "utf8");
    const knownHosts = readFileSync(join(packRoot, "github.com.known_hosts"), "utf8");
    const cleanup = readFileSync(join(packRoot, "failed-checkout-cleanup.mjs"), "utf8");
    assert.equal(knownHosts.split("\n").filter(Boolean).length, 1);
    assert.match(knownHosts, /^github\.com ssh-ed25519 /u);
    assert.match(trust, /StrictHostKeyChecking=yes/u);
    assert.match(trust, /UserKnownHostsFile=/u);
    assert.match(trust, /GlobalKnownHostsFile=\/dev\/null/u);
    assert.match(trust, /HostKeyAlgorithms=\$\{APPROVED_GIT_HOST_KEY_ALGORITHM\}/u);
    assert.match(trust, /IdentityAgent=none/u);
    assert.doesNotMatch(trust, /StrictHostKeyChecking=(?:no|accept-new)/u);
    assert.match(checkout, /git-transport-trust\.mjs" verify/u);
    assert.match(checkout, /GIT_SSH_COMMAND=\$\{git_ssh_command\}/u);
    assert.match(checkout, /git-authentication\.mjs" verify-ready/u);
    assert.match(checkout, /sudo -u phase-f1-build env -i/u);
    assert.match(checkout, /failed-checkout-cleanup\.mjs" cleanup/u);
    assert.match(cleanup, /PARTIAL_UNTRUSTED/u);
    assert.match(cleanup, /activeReference/u);
    assert.match(cleanup, /selectorReference/u);
    assert.match(cleanup, /mountpoint/u);
  });

  it("inspects build-user-owned checkouts in the same scrubbed security context", () => {
    const common = readFileSync(join(packRoot, "common.sh"), "utf8");
    const checkout = readFileSync(join(packRoot, "prepare-checkout.sh"), "utf8");
    const preparation = readFileSync(join(packRoot, "prepare-offline-npm-cache.sh"), "utf8");
    const release = readFileSync(join(packRoot, "build-release.sh"), "utf8");
    const identities = readFileSync(join(packRoot, "application-identities.mjs"), "utf8");
    const manifests = readFileSync(join(packRoot, "artifact-manifest.mjs"), "utf8");
    const cache = readFileSync(join(packRoot, "offline-npm-cache.mjs"), "utf8");
    const cleanup = readFileSync(join(packRoot, "failed-checkout-cleanup.mjs"), "utf8");
    assert.match(common, /git_read_as_phase_f1_build_user/u);
    assert.match(common, /sudo -u phase-f1-build -- \/usr\/bin\/env -i/u);
    assert.match(checkout, /git_read_as_phase_f1_build_user -C "\$\{attempt\}" rev-parse HEAD/u);
    assert.match(preparation, /git_read_as_phase_f1_build_user -C "\$\{workspace\}" rev-parse HEAD/u);
    assert.match(release, /git_read_as_phase_f1_build_user -C "\$\{workspace\}" rev-parse HEAD/u);
    assert.match(identities, /gitAsBuildUser/u);
    assert.match(manifests, /gitAsBuildUser/u);
    assert.match(cache, /gitAsBuildUser/u);
    assert.doesNotMatch([common, checkout, preparation, release, identities, manifests, cache, cleanup].join("\n"), /safe\.directory/u);
    assert.doesNotMatch(cleanup, /execFileSync\("\/usr\/bin\/git"/u);
  });

  it("keeps deploy-key generation OpenSSH-compatible and recovery narrowly bounded", () => {
    const authentication = readFileSync(join(packRoot, "git-authentication.mjs"), "utf8");
    const preparation = readFileSync(join(packRoot, "prepare-git-auth-material.sh"), "utf8");
    const recovery = readFileSync(join(packRoot, "recover-git-auth-material.sh"), "utf8");
    assert.match(preparation, /chown phase-f1-build:phase-f1-build "\$\{PRIVATE_KEY\}"/u);
    assert.match(preparation, /chmod 0400 "\$\{PRIVATE_KEY\}"/u);
    assert.doesNotMatch(preparation, /chmod 0?(?:440|600) "\$\{PRIVATE_KEY\}"/u);
    assert.match(authentication, /privateUid !== contract\.buildUid/u);
    assert.match(authentication, /privateMode !== 0o400/u);
    assert.match(authentication, /"phase-f1-build"[\s\S]+"\/usr\/bin\/ssh-keygen", "-y", "-f", PRIVATE_KEY/u);
    assert.match(authentication, /contract\.privateUid !== 0[\s\S]+contract\.privateMode !== 0o440/u);
    assert.match(authentication, /entries !== "github-deploy-key,github-deploy-key\.pub"/u);
    assert.match(authentication, /readinessAbsent !== true/u);
    assert.match(authentication, /buildsEmpty !== true/u);
    assert.match(authentication, /keyUnused !== true/u);
    assert.match(authentication, /Private-key byte identity changed during metadata recovery/u);
    assert.match(authentication, /Public-key byte identity changed during metadata recovery/u);
    assert.match(recovery, /require_pack_integrity/u);
    assert.match(recovery, /git-authentication\.mjs" recover-partial/u);
  });

  it("keeps offline npm cache authority fixed, sealed and separately prepared", () => {
    const common = readFileSync(join(packRoot, "common.sh"), "utf8");
    const fixture = readFileSync(join(packRoot, "prepare-rollback-fixture.sh"), "utf8");
    const preparation = readFileSync(join(packRoot, "prepare-offline-npm-cache.sh"), "utf8");
    const recovery = readFileSync(join(packRoot, "reverify-sealed-offline-npm-cache.sh"), "utf8");
    const cache = readFileSync(join(packRoot, "offline-npm-cache.mjs"), "utf8");
    assert.match(common, /PHASE_F1_OFFLINE_NPM_CACHE_ROOT="\/var\/cache\/thebusinesscircle\/phase-f1\/npm-offline-v1"/u);
    assert.match(common, /PHASE_F1_NPM_USER_CONFIG="\$\{PHASE_F1_NPM_CONFIG_ROOT\}\/user\.npmrc"/u);
    assert.match(common, /PHASE_F1_NPM_GLOBAL_CONFIG="\$\{PHASE_F1_NPM_CONFIG_ROOT\}\/global\.npmrc"/u);
    assert.match(common, /npm-configuration\.mjs" verify/u);
    assert.doesNotMatch(fixture, /readonly OFFLINE_CACHE=\$\{PHASE_E3_OFFLINE_NPM_CACHE_ROOT/u);
    assert.match(fixture, /offline-npm-cache\.mjs" verify/u);
    assert.match(fixture, /NPM_CONFIG_OFFLINE=true/u);
    assert.match(preparation, /build-state\.mjs" inspect/u);
    assert.doesNotMatch(preparation, /build-state\.mjs" consume/u);
    assert.match(preparation, /NPM_CONFIG_REGISTRY=https:\/\/registry\.npmjs\.org\//u);
    assert.match(preparation, /chmod 0550/u);
    assert.match(preparation, /chmod 0440/u);
    assert.match(preparation, /sudo -u phase-f1-build test -r/u);
    assert.match(preparation, /sudo -u bcn-app test ! -w/u);
    assert.match(preparation, /sudo -u circle-card-app test ! -w/u);
    assert.match(preparation, /npm --prefix "\$\{workspace\}" ci --offline/u);
    assert.ok(preparation.indexOf("ci --offline") < preparation.indexOf("publish-after-offline-verification"));
    assert.match(cache, /phase-f1-offline-npm-cache-readiness-v2/u);
    assert.match(cache, /APPROVED_TARGET_PLATFORM/u);
    assert.match(cache, /optionalInapplicableIntegrityCount/u);
    assert.match(cache, /missingRequiredTargetIntegrityCount/u);
    assert.match(cache, /Offline npm cache is missing a required target-platform integrity/u);
    assert.match(recovery, /classify-recovery/u);
    assert.match(recovery, /SEALED_NOT_READY_REVERIFY_APPROVED/u);
    assert.match(recovery, /NPM_CONFIG_OFFLINE=true/u);
    assert.match(recovery, /publish-after-offline-verification/u);
    assert.match(recovery, /pgrep -u phase-f1-build/u);
    assert.match(recovery, /\.npm-offline-v1\.promotion\./u);
    assert.match(recovery, /git_read_as_phase_f1_build_user/u);
    assert.doesNotMatch(recovery, /\$\{2|cache-root|readiness-path|alternate/u);
  });
});

describe("Phase F1 atomic no-replace publication", () => {
  it("publishes all three files and refuses every existing target", () => {
    const successRoot = temporaryRoot();
    const successEntries = publicationEntries(successRoot);
    publishNoReplaceSet(successEntries, publicationOptions);
    for (const entry of successEntries) {
      const stats = lstatSync(entry.target);
      assert.equal(stats.isFile(), true);
      assert.equal(stats.nlink, 1);
      assert.deepEqual(readFileSync(entry.target), entry.payload);
      if (process.platform !== "win32") {
        assert.equal(stats.mode & 0o777, 0o640);
      }
    }

    for (const index of [0, 1, 2]) {
      const root = temporaryRoot();
      const entries = publicationEntries(root);
      writeFileSync(entries[index].target, "EXISTING_FIXTURE\n", { flag: "wx" });
      assert.throws(
        () => publishNoReplaceSet(entries, publicationOptions),
        (error) => error?.code === "EEXIST"
      );
      assert.equal(readFileSync(entries[index].target, "utf8"), "EXISTING_FIXTURE\n");
      for (const [candidateIndex, entry] of entries.entries()) {
        if (candidateIndex !== index) assert.equal(existsSync(entry.target), false);
      }
    }
  });

  it("cleans a partial set without deleting the pre-existing collision", () => {
    const root = temporaryRoot();
    const entries = publicationEntries(root);
    writeFileSync(entries[1].target, "EXISTING_FIXTURE\n", { flag: "wx" });
    assert.throws(
      () => publishNoReplaceSet(entries, publicationOptions),
      (error) => error?.code === "EEXIST"
    );
    assert.equal(existsSync(entries[0].target), false);
    assert.equal(readFileSync(entries[1].target, "utf8"), "EXISTING_FIXTURE\n");
    assert.equal(existsSync(entries[2].target), false);
  });
});
