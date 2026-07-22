#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH

readonly PHASE_F1_FORWARD_SHA="2c83694de301b0244c5586c1598aceb10fa2214b"
readonly PHASE_F1_ROLLBACK_SHA="5d1f81bb05a01b08e1134785c2f86b77c8969fe3"
readonly PHASE_F1_HISTORICAL_SHA="5fa2bbf6ac7d39aa14636882bbae2d2713faf11a"
readonly PHASE_F1_OPERATIONS_BASE_SHA="c95b10d82d192c273812a40c2c9d1e9e73791b96"
readonly PHASE_F1_PACK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
readonly PHASE_F1_EXPECTED_PACK_ROOT="/opt/thebusinesscircle/deployment-packs"
readonly PHASE_F1_EXTERNAL_IDENTITY="/var/lib/thebusinesscircle/approved-phase-f1-pack.json"
readonly PHASE_F1_LIVE_DIR="/var/www/The-Business-Circle.Net"
readonly PHASE_F1_RELEASE_ROOT="/var/www/releases"
readonly PHASE_F1_RELEASE_DIR="${PHASE_F1_RELEASE_ROOT}/${PHASE_F1_FORWARD_SHA}"
readonly PHASE_F1_BUILD_ROOT="/var/www/builds"
readonly PHASE_F1_SHARED_ROOT="/var/www/shared"
readonly PHASE_F1_PUBLIC_ROOT="${PHASE_F1_SHARED_ROOT}/public"
readonly PHASE_F1_PRIVATE_ROOT="${PHASE_F1_SHARED_ROOT}/private"
readonly PHASE_F1_PREVIEW_ROOT="${PHASE_F1_SHARED_ROOT}/generated/community-source-previews"
readonly PHASE_F1_BCN_ENV="/etc/thebusinesscircle/bcn/runtime.env.json"
readonly PHASE_F1_CIRCLE_ENV="/etc/thebusinesscircle/circle-card/runtime.env.json"
readonly PHASE_F1_BUILD_ENV="/etc/thebusinesscircle/build/build.env.json"
readonly PHASE_F1_LOG_ROOT="/var/log/thebusinesscircle/deployments"
readonly PHASE_F1_STATE_ROOT="/var/lib/thebusinesscircle/deployment-state"
readonly PHASE_F1_BOOT_ELIGIBILITY_ROOT="/var/lib/thebusinesscircle/boot-eligibility"
readonly PHASE_F1_ARTIFACT_ROOT="/var/lib/thebusinesscircle/artifacts/${PHASE_F1_FORWARD_SHA}-${PHASE_F1_ROLLBACK_SHA}"
readonly PHASE_F1_ROLLBACK_DIR="/var/www/rollbacks/${PHASE_F1_ROLLBACK_SHA}"
readonly PHASE_F1_CURRENT_BCN="/var/www/current-bcn"
readonly PHASE_F1_CURRENT_CIRCLE="/var/www/current-circle-card"
PHASE_F1_PACK_COMMIT=""
PHASE_F1_PACK_ARCHIVE_SHA256=""
PHASE_F1_PACK_MANIFEST_SHA256=""

die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
require_root() { [[ ${EUID} -eq 0 ]] || die "this preparation phase requires root"; }

assert_no_symlink_components() {
  local path=$1 current=/ part
  [[ ${path} == /* ]] || die "absolute path required: ${path}"
  IFS='/' read -r -a parts <<<"${path#/}"
  for part in "${parts[@]}"; do
    [[ -n ${part} ]] || continue
    current="${current%/}/${part}"
    [[ ! -L ${current} ]] || die "symlinked path component rejected: ${current}"
    [[ ! -e ${current} || -d ${current} ]] || die "non-directory path component rejected: ${current}"
  done
}

require_protected_state_file() {
  local path=$1
  [[ -f ${path} && ! -L ${path} && $(stat -c '%U:%G:%a:%h' "${path}") == root:root:600:1 ]] || die "unsafe protected state file: ${path}"
}

require_pack_integrity() {
  [[ ${PHASE_F1_PACK_DIR} == "${PHASE_F1_EXPECTED_PACK_ROOT}/"* ]] ||
    die "installed pack is outside the protected pack root"
  local identity installed_path
  identity=$(env -i HOME=/root PATH=/usr/local/bin:/usr/bin:/bin \
    /usr/bin/node "${PHASE_F1_PACK_DIR}/verify-pack-integrity.mjs" "${PHASE_F1_EXTERNAL_IDENTITY}") ||
    die "external operations-pack integrity verification failed"
  IFS=$'\t' read -r PHASE_F1_PACK_COMMIT PHASE_F1_PACK_ARCHIVE_SHA256 \
    PHASE_F1_PACK_MANIFEST_SHA256 installed_path <<<"${identity}"
  [[ ${PHASE_F1_PACK_COMMIT} =~ ^[0-9a-f]{40}$ &&
     ${PHASE_F1_PACK_ARCHIVE_SHA256} =~ ^[0-9a-f]{64}$ &&
     ${PHASE_F1_PACK_MANIFEST_SHA256} =~ ^[0-9a-f]{64}$ ]] || die "pack identity is malformed"
  [[ ${installed_path} == "${PHASE_F1_EXPECTED_PACK_ROOT}/${PHASE_F1_PACK_COMMIT}" && ${PHASE_F1_PACK_DIR} == "${installed_path}" ]] || die "running pack path and external operations identity differ"
}

require_application_sha() {
  local role=${1:-} supplied=${2:-} expected
  case "${role}" in
    forward) expected=${PHASE_F1_FORWARD_SHA} ;;
    rollback) expected=${PHASE_F1_ROLLBACK_SHA} ;;
    *) die "application role must be forward or rollback" ;;
  esac
  [[ ${supplied} == "${expected}" ]] || die "exact ${role} application SHA required"
  require_pack_integrity
}

start_write_log() {
  local operation=$1 timestamp log_file
  assert_no_symlink_components "${PHASE_F1_LOG_ROOT}"
  install -d -m 0700 -o root -g root "${PHASE_F1_LOG_ROOT}"
  [[ $(stat -c '%U:%G:%a' "${PHASE_F1_LOG_ROOT}") == root:root:700 ]] || die "unsafe log root"
  [[ $(df --output=avail -B1 "${PHASE_F1_LOG_ROOT}" | tail -1) -ge 104857600 ]] || die "insufficient log space"
  timestamp=$(date -u +%Y%m%dT%H%M%S.%NZ)
  log_file=$(mktemp "${PHASE_F1_LOG_ROOT}/${timestamp}-${operation}.XXXXXXXX.log") || die "exclusive log creation failed"
  chmod 0600 "${log_file}" && chown root:root "${log_file}" || die "log protection failed"
  exec >>"${log_file}" 2>&1 || die "logging redirection failed"
  local artifact_index_sha=NOT_CREATED state_sha=NOT_CREATED
  [[ ! -f ${PHASE_F1_ARTIFACT_ROOT}/manifest-index.sha256 ]] || artifact_index_sha=$(sha256sum "${PHASE_F1_ARTIFACT_ROOT}/manifest-index.sha256" | awk '{print $1}')
  [[ ! -f ${PHASE_F1_STATE_ROOT}/state.json ]] || state_sha=$(sha256sum "${PHASE_F1_STATE_ROOT}/state.json" | awk '{print $1}')
  printf 'Operation: %s\nForward application SHA: %s\nRollback application SHA: %s\nHistorical production SHA: %s\nOperations commit: %s\nPack archive SHA-256: %s\nPack manifest SHA-256: %s\nRuntime manifest index SHA-256: %s\nDeployment state SHA-256: %s\nUTC start: %s\n' \
    "${operation}" "${PHASE_F1_FORWARD_SHA}" "${PHASE_F1_ROLLBACK_SHA}" "${PHASE_F1_HISTORICAL_SHA}" "${PHASE_F1_PACK_COMMIT}" \
    "${PHASE_F1_PACK_ARCHIVE_SHA256}" "${PHASE_F1_PACK_MANIFEST_SHA256}" "${artifact_index_sha}" "${state_sha}" "${timestamp}"
}

require_port_free() {
  /usr/bin/node "${PHASE_F1_PACK_DIR}/listener-verification.mjs" free "${1}" || die "port ${1} is occupied"
}

candidate_invocation_command() { /usr/bin/node "${PHASE_F1_PACK_DIR}/candidate-invocation.mjs" "$@"; }
candidate_listener_free_command() { /usr/bin/node "${PHASE_F1_PACK_DIR}/listener-verification.mjs" free "$1"; }

begin_candidate_invocation() {
  local unit=$1 port=$2 active ownership
  active=$(systemctl show "${unit}" --property=ActiveState --value 2>/dev/null || true)
  [[ ${active} == inactive ]] || die "candidate unit is not cleanly inactive: ${unit} (${active})"
  require_port_free "${port}"
  ownership=$(mktemp "${PHASE_F1_STATE_ROOT}/.candidate-invocation.XXXXXXXX")
  rm -f -- "${ownership}"
  candidate_invocation_command create "${ownership}" "${unit}" "${port}" "${active}" true
  chmod 0600 "${ownership}"; chown root:root "${ownership}"
  printf '%s' "${ownership}"
}

cleanup_candidate_invocation() {
  local ownership=$1 unit=$2 port=$3 result_root=${4:-${PHASE_F1_STATE_ROOT}} status=0 active=unknown pid=0 cleaned journal_preserved=true stop_succeeded=true port_free=true ownership_verified=true result
  candidate_invocation_command verify "${ownership}" "${unit}" "${port}" >/dev/null 2>&1 || { status=1; ownership_verified=false; }
  result="${result_root}/candidate-cleanup-$(basename "${ownership}").json"
  if [[ ${ownership_verified} != true ]]; then
    printf '{"activeState":"unknown","journalPreserved":false,"mainPid":0,"ownershipVerified":false,"portFree":false,"stopSucceeded":false,"unit":"%s","port":%s}\n' "${unit}" "${port}" >"${result}"
    chmod 0600 "${result}"; chown root:root "${result}"
    return 1
  fi
  journalctl --unit "${unit}" --no-pager --since '-10 minutes' || { status=1; journal_preserved=false; }
  systemctl stop "${unit}" || { status=1; stop_succeeded=false; }
  for _ in {1..30}; do active=$(systemctl show "${unit}" --property=ActiveState --value 2>/dev/null || true); [[ ${active} == inactive ]] && break; sleep 1; done
  [[ ${active} == inactive ]] || status=1
  pid=$(systemctl show "${unit}" --property=MainPID --value 2>/dev/null || true); [[ ${pid} == 0 || -z ${pid} ]] || status=1
  candidate_listener_free_command "${port}" || { status=1; port_free=false; }
  printf '{"activeState":"%s","journalPreserved":%s,"mainPid":%s,"ownershipVerified":true,"portFree":%s,"stopSucceeded":%s,"unit":"%s","port":%s}\n' "${active}" "${journal_preserved}" "${pid:-0}" "${port_free}" "${stop_succeeded}" "${unit}" "${port}" >"${result}"
  chmod 0600 "${result}"; chown root:root "${result}"
  candidate_invocation_command cleanup-check "${result}" >/dev/null 2>&1 || status=1
  ((status == 0)) || return 1
  cleaned="${result_root}/candidate-cleaned-$(basename "${ownership}").evidence"
  mv -T "${ownership}" "${cleaned}"
  return 0
}

cleanup_all_candidate_invocations() {
  local -n cleanup_entries=$1
  local result_root=${2:-${PHASE_F1_STATE_ROOT}} item unit port ownership failures=0
  for item in "${cleanup_entries[@]}"; do
    IFS='|' read -r unit port ownership <<<"${item}"
    if ! cleanup_candidate_invocation "${ownership}" "${unit}" "${port}" "${result_root}"; then
      failures=$((failures + 1))
    fi
  done
  ((failures == 0))
}

require_environment_ready() {
  env -i HOME=/root PATH=/usr/local/bin:/usr/bin:/bin /usr/bin/node \
    "${PHASE_F1_PACK_DIR}/validate-environment.mjs" schema >/dev/null || die "protected environments are not ready"
}

require_release_integrity() {
  [[ -d ${PHASE_F1_RELEASE_DIR} && ! -L ${PHASE_F1_RELEASE_DIR} ]] || die "approved release is missing"
  [[ $(realpath -e "${PHASE_F1_RELEASE_DIR}") == "${PHASE_F1_RELEASE_DIR}" ]] || die "release path is not canonical"
  /usr/bin/node "${PHASE_F1_PACK_DIR}/artifact-manifest.mjs" runtime-verify \
    "${PHASE_F1_RELEASE_DIR}/.runtime/bcn" "${PHASE_F1_ARTIFACT_ROOT}/runtime-bcn.manifest" >/dev/null
  /usr/bin/node "${PHASE_F1_PACK_DIR}/artifact-manifest.mjs" runtime-verify \
    "${PHASE_F1_RELEASE_DIR}/.runtime/circle-card" "${PHASE_F1_ARTIFACT_ROOT}/runtime-circle-card.manifest" >/dev/null
  /usr/bin/node "${PHASE_F1_PACK_DIR}/artifact-manifest.mjs" release-verify \
    "${PHASE_F1_RELEASE_DIR}" "${PHASE_F1_ARTIFACT_ROOT}/forward-release.manifest" >/dev/null
  [[ -d ${PHASE_F1_ROLLBACK_DIR} && ! -L ${PHASE_F1_ROLLBACK_DIR} ]] || die "approved rollback release is missing"
  /usr/bin/node "${PHASE_F1_PACK_DIR}/artifact-manifest.mjs" runtime-verify \
    "${PHASE_F1_ROLLBACK_DIR}/.next" "${PHASE_F1_ARTIFACT_ROOT}/rollback-bcn.manifest" >/dev/null
  /usr/bin/node "${PHASE_F1_PACK_DIR}/artifact-manifest.mjs" release-verify \
    "${PHASE_F1_ROLLBACK_DIR}" "${PHASE_F1_ARTIFACT_ROOT}/rollback-release.manifest" >/dev/null
}

refresh_release_bindings() {
  local selector=${1:-} circle_status=${2:-}
  env -i HOME=/root PATH=/usr/local/bin:/usr/bin:/bin /usr/bin/node \
    "${PHASE_F1_PACK_DIR}/release-bindings.mjs" "${PHASE_F1_STATE_ROOT}" \
    "${PHASE_F1_ARTIFACT_ROOT}" "${PHASE_F1_PACK_COMMIT}" "${selector}" "${circle_status}" >/dev/null
  require_protected_state_file "${PHASE_F1_STATE_ROOT}/release-bindings.json"
}

transition_state() {
  local expected=$1 next=$2 evidence=${3:-}
  env -i HOME=/root PATH=/usr/local/bin:/usr/bin:/bin /usr/bin/node \
    "${PHASE_F1_PACK_DIR}/deployment-state.mjs" transition "${PHASE_F1_STATE_ROOT}" \
    "${expected}" "${next}" "${PHASE_F1_FORWARD_SHA}" "${PHASE_F1_ROLLBACK_SHA}" \
    "${PHASE_F1_HISTORICAL_SHA}" "${PHASE_F1_PACK_COMMIT}" "${evidence}" \
    "${PHASE_F1_STATE_ROOT}/release-bindings.json"
}

publish_boot_eligibility() {
  local role=$1 artifact
  case "${role}" in
    forward) artifact="${PHASE_F1_ARTIFACT_ROOT}/forward-bcn.artifact.json" ;;
    rollback) artifact="${PHASE_F1_ARTIFACT_ROOT}/rollback-bcn.artifact.json" ;;
    *) die "boot eligibility role must be forward or rollback" ;;
  esac
  install -d -m 0755 -o root -g root "${PHASE_F1_BOOT_ELIGIBILITY_ROOT}"
  /usr/bin/node "${PHASE_F1_PACK_DIR}/boot-eligibility.mjs" publish \
    "${PHASE_F1_STATE_ROOT}/state.json" "${PHASE_F1_STATE_ROOT}/release-bindings.json" "${artifact}" \
    "${PHASE_F1_BOOT_ELIGIBILITY_ROOT}/bcn.json" "${PHASE_F1_PACK_COMMIT}"
}
