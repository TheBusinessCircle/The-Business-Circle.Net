#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

require_root
require_application_sha forward "${1:-}"
readonly OPERATOR_INPUT_PATH=${2:-}
[[ -n ${OPERATOR_INPUT_PATH} ]] ||
  die "a separately protected sanitised operator input path is required"
[[ -f ${OPERATOR_INPUT_PATH} && ! -L ${OPERATOR_INPUT_PATH} ]] ||
  die "the sanitised operator input is not a regular non-symlink file"
[[ $(realpath -e "${OPERATOR_INPUT_PATH}") == "${OPERATOR_INPUT_PATH}" ]] ||
  die "the sanitised operator input path is not canonical"
[[ $(stat -c '%U:%G:%a:%h' "${OPERATOR_INPUT_PATH}") == "root:root:600:1" ]] ||
  die "the sanitised operator input must be root:root mode 600 with link count 1"
start_write_log "prepare-environment"

assert_no_symlink_components /etc/thebusinesscircle
install -d -m 0755 -o root -g root /etc/thebusinesscircle
install -d -m 0750 -o root -g bcn-app /etc/thebusinesscircle/bcn
install -d -m 0750 -o root -g circle-card-app /etc/thebusinesscircle/circle-card
install -d -m 0750 -o root -g phase-f1-build /etc/thebusinesscircle/build
for target in "${PHASE_F1_BCN_ENV}" "${PHASE_F1_CIRCLE_ENV}" "${PHASE_F1_BUILD_ENV}"; do
  [[ ! -e ${target} && ! -L ${target} ]] ||
    die "refusing to replace an existing or symlinked protected environment path: ${target}"
done

BCN_PAYLOAD_PATH=$(mktemp /etc/thebusinesscircle/bcn/.bcn.payload.XXXXXX)
CIRCLE_PAYLOAD_PATH=$(mktemp /etc/thebusinesscircle/circle-card/.circle-card.payload.XXXXXX)
BUILD_PAYLOAD_PATH=$(mktemp /etc/thebusinesscircle/build/.build.payload.XXXXXX)
readonly BCN_PAYLOAD_PATH CIRCLE_PAYLOAD_PATH BUILD_PAYLOAD_PATH
cleanup() {
  rm -f -- "${BCN_PAYLOAD_PATH}" "${CIRCLE_PAYLOAD_PATH}" "${BUILD_PAYLOAD_PATH}"
}
trap cleanup EXIT

OPERATOR_INPUT="${OPERATOR_INPUT_PATH}" \
BCN_PAYLOAD="${BCN_PAYLOAD_PATH}" \
CIRCLE_PAYLOAD="${CIRCLE_PAYLOAD_PATH}" \
BUILD_PAYLOAD="${BUILD_PAYLOAD_PATH}" \
CONTRACT_FILE="${PHASE_F1_PACK_DIR}/environment-contract.cjs" \
SERIALIZER_FILE="${PHASE_F1_PACK_DIR}/environment-serialization.cjs" \
/usr/bin/node <<'NODE'
const { closeSync, fsyncSync, openSync, writeFileSync } = require("node:fs");
const { prepareSanitizedEnvironment } = require(process.env.CONTRACT_FILE);
const { readDotEnvFile, renderEnvironmentJson } = require(process.env.SERIALIZER_FILE);

const source = readDotEnvFile(process.env.OPERATOR_INPUT);
const prepared = prepareSanitizedEnvironment(source);
if (prepared.excludedInputNames.length) {
  console.error(`Recognised non-migrating input names excluded: ${prepared.excludedInputNames.join(", ")}`);
}
if (prepared.issues.length) {
  for (const issue of prepared.issues) {
    const names = issue.names?.join(", ") || issue.alternatives?.flat().join(", ") || "provider-pair";
    console.error(`Readiness gate ${issue.code} (${issue.scope || "shared"}): ${names}`);
  }
  process.exit(2);
}
for (const [path, values] of [
  [process.env.BCN_PAYLOAD, prepared.bcn],
  [process.env.CIRCLE_PAYLOAD, prepared.circleCard],
  [process.env.BUILD_PAYLOAD, prepared.build]
]) {
  const body = renderEnvironmentJson(values);
  const fd = openSync(path, "w", 0o600);
  try {
    writeFileSync(fd, body);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}
console.log("Sanitised operator input passed value-free preparation gates.");
NODE

env -i HOME=/root PATH=/usr/local/bin:/usr/bin:/bin \
  /usr/bin/node "${PHASE_F1_PACK_DIR}/publish-environment-set.mjs" \
  "${BCN_PAYLOAD_PATH}" "${CIRCLE_PAYLOAD_PATH}" "${BUILD_PAYLOAD_PATH}" \
  "${PHASE_F1_BCN_ENV}" "${PHASE_F1_CIRCLE_ENV}" "${PHASE_F1_BUILD_ENV}"

env -i HOME=/root PATH=/usr/local/bin:/usr/bin:/bin \
  /usr/bin/node "${PHASE_F1_PACK_DIR}/report-protected-readiness.mjs"
printf 'Historical and PM2 environments were not used as value authorities or changed.\n'
printf 'Schema readiness is complete before build; application runtime validation follows artifact creation.\n'
