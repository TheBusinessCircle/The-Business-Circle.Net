#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

require_root
require_application_sha forward "${1:-}"
readonly OVERRIDE_FILE=${2:-}
if [[ -n ${OVERRIDE_FILE} ]]; then
  [[ -f ${OVERRIDE_FILE} && ! -L ${OVERRIDE_FILE} ]] || die "the optional override file is not a regular non-symlink file"
  [[ $(realpath -e "${OVERRIDE_FILE}") == "${OVERRIDE_FILE}" ]] || die "the optional override file path is not canonical"
  [[ $(stat -c '%U:%G:%a' "${OVERRIDE_FILE}") == "root:root:600" ]] ||
    die "the optional override file must be root:root mode 600"
fi
start_write_log "prepare-environment"

readonly SOURCE_ENV="${PHASE_F1_LIVE_DIR}/.env"
readonly SOURCE_PRODUCTION_ENV="${PHASE_F1_LIVE_DIR}/.env.production"
[[ -f ${SOURCE_ENV} && -f ${SOURCE_PRODUCTION_ENV} ]] ||
  die "both current source environment files must exist"
for source_file in "${SOURCE_ENV}" "${SOURCE_PRODUCTION_ENV}"; do
  [[ ! -L ${source_file} && $(realpath -e "${source_file}") == "${source_file}" ]] ||
    die "source environment path is symlinked or non-canonical"
done

assert_no_symlink_components /etc/thebusinesscircle
install -d -m 0755 -o root -g root /etc/thebusinesscircle
install -d -m 0750 -o root -g bcn-app /etc/thebusinesscircle/bcn
install -d -m 0750 -o root -g circle-card-app /etc/thebusinesscircle/circle-card
install -d -m 0750 -o root -g phase-f1-build /etc/thebusinesscircle/build
for target in "${PHASE_F1_BCN_ENV}" "${PHASE_F1_CIRCLE_ENV}" "${PHASE_F1_BUILD_ENV}"; do
  [[ ! -e ${target} && ! -L ${target} ]] ||
    die "refusing to replace an existing or symlinked protected environment path: ${target}"
done

BCN_TEMP=$(mktemp /etc/thebusinesscircle/bcn/.bcn.env.XXXXXX)
CIRCLE_TEMP=$(mktemp /etc/thebusinesscircle/circle-card/.circle-card.env.XXXXXX)
BUILD_TEMP=$(mktemp /etc/thebusinesscircle/build/.build.env.XXXXXX)
READINESS_TEMP=$(mktemp /etc/thebusinesscircle/.readiness.XXXXXX)
readonly BCN_TEMP CIRCLE_TEMP BUILD_TEMP READINESS_TEMP
cleanup() {
  rm -f "${BCN_TEMP}" "${CIRCLE_TEMP}" "${BUILD_TEMP}" "${READINESS_TEMP}"
}
trap cleanup EXIT

SOURCE_ENV="${SOURCE_ENV}" \
SOURCE_PRODUCTION_ENV="${SOURCE_PRODUCTION_ENV}" \
OVERRIDE_FILE="${OVERRIDE_FILE}" \
BCN_TEMP="${BCN_TEMP}" \
CIRCLE_TEMP="${CIRCLE_TEMP}" \
BUILD_TEMP="${BUILD_TEMP}" \
READINESS_TEMP="${READINESS_TEMP}" \
SCHEMA_FILE="${PHASE_F1_PACK_DIR}/environment-groups.cjs" \
SERIALIZER_FILE="${PHASE_F1_PACK_DIR}/environment-serialization.cjs" \
node <<'NODE'
const { writeFileSync } = require("node:fs");
const {
  BCN_ALLOWED_KEYS,
  BCN_ONLY_KEYS,
  BUILD_ENV_KEYS,
  CIRCLE_ALLOWED_KEYS,
  CIRCLE_CARD_ONLY_KEYS,
  DELIBERATELY_UNSUPPORTED_KEYS,
  REQUIRED_BCN_KEYS, REQUIRED_CIRCLE_KEYS,
  REQUIRED_SHARED_KEYS, TOOLING_ONLY_KEYS,
  RUNTIME_VALUES,
  SHARED_KEYS
} = require(process.env.SCHEMA_FILE);
const { buildEnvironment, readDotEnvFile, renderEnvironmentJson } = require(process.env.SERIALIZER_FILE);
const legacy = readDotEnvFile(process.env.SOURCE_ENV);
const production = readDotEnvFile(process.env.SOURCE_PRODUCTION_ENV);
const overrides = process.env.OVERRIDE_FILE ? readDotEnvFile(process.env.OVERRIDE_FILE) : {};
const sources = [legacy, production];
const classified = new Set([
  ...SHARED_KEYS, ...BCN_ONLY_KEYS, ...CIRCLE_CARD_ONLY_KEYS, ...BUILD_ENV_KEYS, ...TOOLING_ONLY_KEYS,
  ...DELIBERATELY_UNSUPPORTED_KEYS,
  ...Object.values(RUNTIME_VALUES).flatMap((values) => Object.keys(values))
]);
const unknownSourceNames = [...new Set(sources.flatMap((values) => Object.keys(values)))]
  .filter((key) => !classified.has(key)).sort();
if (unknownSourceNames.length) {
  throw new Error(`Unclassified source names require an explicit pack decision: ${unknownSourceNames.join(", ")}`);
}
const invalidOverrideNames = Object.keys(overrides).filter((key) =>
  !new Set([...SHARED_KEYS, ...BCN_ONLY_KEYS, ...CIRCLE_CARD_ONLY_KEYS, ...BUILD_ENV_KEYS, ...TOOLING_ONLY_KEYS]).has(key)
).sort();
if (invalidOverrideNames.length) {
  throw new Error(`Override contains unapproved names: ${invalidOverrideNames.join(", ")}`);
}
for (const key of Object.keys(overrides).sort()) {
  const populated = sources.flatMap((values) => Object.hasOwn(values, key) && values[key] !== "" ? [values[key]] : []);
  if (populated.some((value) => value !== overrides[key])) {
    console.error(`Root-reviewed override explicitly resolves populated source name: ${key}`);
  }
}

const bcnBuild = buildEnvironment(
  BCN_ALLOWED_KEYS,
  [...REQUIRED_SHARED_KEYS, ...REQUIRED_BCN_KEYS], sources, overrides
);
const circleBuild = buildEnvironment(
  CIRCLE_ALLOWED_KEYS,
  [...REQUIRED_SHARED_KEYS, ...REQUIRED_CIRCLE_KEYS], sources, overrides
);
const buildOnly = buildEnvironment(BUILD_ENV_KEYS, [], sources, overrides).result;
for (const key of bcnBuild.emptyRequired) console.error(`Required value still needs secure manual entry: ${key}`);
for (const key of circleBuild.emptyRequired) console.error(`Required value still needs secure manual entry: ${key}`);
writeFileSync(process.env.BCN_TEMP, renderEnvironmentJson(bcnBuild.result), { mode: 0o600, flag: "w" });
writeFileSync(process.env.CIRCLE_TEMP, renderEnvironmentJson(circleBuild.result), { mode: 0o600, flag: "w" });
writeFileSync(process.env.BUILD_TEMP, renderEnvironmentJson(buildOnly), { mode: 0o600, flag: "w" });
writeFileSync(process.env.READINESS_TEMP, JSON.stringify({
  ready: bcnBuild.emptyRequired.length === 0 && circleBuild.emptyRequired.length === 0,
  bcn: { emptyRequiredNames: bcnBuild.emptyRequired.sort() },
  circleCard: { emptyRequiredNames: circleBuild.emptyRequired.sort() }
}, null, 2) + "\n", { mode: 0o600, flag: "w" });
console.log("Environment values were migrated and round-trip validated without being displayed.");
NODE

install -m 0640 -o root -g bcn-app "${BCN_TEMP}" "${PHASE_F1_BCN_ENV}"
install -m 0640 -o root -g circle-card-app "${CIRCLE_TEMP}" "${PHASE_F1_CIRCLE_ENV}"
install -m 0640 -o root -g phase-f1-build "${BUILD_TEMP}" "${PHASE_F1_BUILD_ENV}"
install -d -m 0700 -o root -g root "${PHASE_F1_STATE_ROOT}"
install -m 0600 -o root -g root "${READINESS_TEMP}" \
  "${PHASE_F1_STATE_ROOT}/environment-readiness.json"
printf 'Protected files created. Use sudoedit for any missing or deliberately resolved values.\n'
printf 'No source environment file was changed.\n'
printf 'Schema readiness is complete before build; application production validation follows artifact creation.\n'
