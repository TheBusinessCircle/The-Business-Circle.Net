#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
[[ $# -eq 1 ]] || die "exact rollback application SHA is the only accepted argument"
require_root; require_application_sha rollback "${1:-}"; require_environment_ready
[[ $(node --version) == v22.22.2 && $(npm --version) == 10.9.7 ]] || die "exact Node/npm versions required"
require_trusted_npm_config_sources
attempt_file="${PHASE_F1_STATE_ROOT}/rollback-build-attempt.json"; require_protected_state_file "${attempt_file}"
workspace=$(/usr/bin/node "${PHASE_F1_PACK_DIR}/build-state.mjs" inspect "${attempt_file}" rollback "${PHASE_F1_ROLLBACK_SHA}" "${PHASE_F1_PACK_COMMIT}"); workspace=$(realpath -e "${workspace}")
[[ ${workspace} == "${PHASE_F1_BUILD_ROOT}/rollback-${PHASE_F1_ROLLBACK_SHA}-"* && $(git_read_as_phase_f1_build_user -C "${workspace}" rev-parse HEAD) == "${PHASE_F1_ROLLBACK_SHA}" ]] || die "unapproved rollback cache-reverification workspace"
[[ -d ${PHASE_F1_OFFLINE_NPM_CACHE_ROOT} && ! -L ${PHASE_F1_OFFLINE_NPM_CACHE_ROOT} ]] || die "sealed offline npm cache is unavailable"
[[ ! -e ${PHASE_F1_OFFLINE_NPM_CACHE_READINESS} && ! -L ${PHASE_F1_OFFLINE_NPM_CACHE_READINESS} ]] || die "offline npm cache already has readiness evidence"
cache_parent=$(dirname "${PHASE_F1_OFFLINE_NPM_CACHE_ROOT}")
[[ -z $(find -P "${cache_parent}" -mindepth 1 -maxdepth 1 -name '.npm-offline-v1.promotion.*' -print -quit) ]] || die "offline npm cache promotion residue exists"
[[ ! -e ${workspace}/node_modules && ! -L ${workspace}/node_modules && ! -e ${workspace}/.next && ! -L ${workspace}/.next ]] || die "cache-reverification workspace is not clean"
if /usr/bin/pgrep -u phase-f1-build -f '(npm|npm-cli\.js)' >/dev/null 2>&1; then die "an npm process is active in the build-user context"; fi
first_cache_file=$(find -P "${PHASE_F1_OFFLINE_NPM_CACHE_ROOT}/_cacache/content-v2" -xdev -type f -print -quit)
[[ -n ${first_cache_file} && ${first_cache_file} == "${PHASE_F1_OFFLINE_NPM_CACHE_ROOT}/_cacache/content-v2/"* ]] || die "sealed offline npm cache contains no approved content"
sudo -u phase-f1-build test -r "${first_cache_file}" || die "build user cannot read sealed offline npm cache content"
sudo -u phase-f1-build test ! -w "${PHASE_F1_OFFLINE_NPM_CACHE_ROOT}" || die "build user can mutate the sealed offline npm cache"
sudo -u bcn-app test ! -w "${PHASE_F1_OFFLINE_NPM_CACHE_ROOT}" || die "BCN runtime can mutate the sealed offline npm cache"
sudo -u circle-card-app test ! -w "${PHASE_F1_OFFLINE_NPM_CACHE_ROOT}" || die "Circle Card runtime can mutate the sealed offline npm cache"
before=$(/usr/bin/node "${PHASE_F1_PACK_DIR}/offline-npm-cache.mjs" classify-recovery "${workspace}" "${PHASE_F1_PACK_COMMIT}") || die "SEALED_NOT_READY cache classification failed"
[[ ${before} == *'"classification":"SEALED_NOT_READY_REVERIFY_APPROVED"'* ]] || die "sealed cache is not approved for re-verification"
start_write_log reverify-sealed-offline-npm-cache
cleanup_verification_dependencies() {
  local target="${workspace}/node_modules"
  if [[ -e ${target} || -L ${target} ]]; then
    [[ ${workspace} == "${PHASE_F1_BUILD_ROOT}/rollback-${PHASE_F1_ROLLBACK_SHA}-"* && -d ${target} && ! -L ${target} ]] || return 1
    rm -rf --one-file-system -- "${target}"
  fi
}
trap cleanup_verification_dependencies EXIT INT TERM
sudo -u phase-f1-build env -i HOME=/var/lib/thebusinesscircle/build PATH=/usr/local/bin:/usr/bin:/bin \
  NPM_CONFIG_USERCONFIG="${PHASE_F1_NPM_USER_CONFIG}" NPM_CONFIG_GLOBALCONFIG="${PHASE_F1_NPM_GLOBAL_CONFIG}" NPM_CONFIG_CACHE="${PHASE_F1_OFFLINE_NPM_CACHE_ROOT}" \
  NPM_CONFIG_LOGS_DIR=/var/lib/thebusinesscircle/build/npm-logs NPM_CONFIG_UPDATE_NOTIFIER=false \
  NPM_CONFIG_OFFLINE=true NEXT_TELEMETRY_DISABLED=1 \
  npm --prefix "${workspace}" ci --offline --ignore-scripts --no-audit --no-fund
[[ -d ${workspace}/node_modules && ! -L ${workspace}/node_modules ]] || die "offline npm resolution did not create disposable dependencies"
cleanup_verification_dependencies || die "offline npm resolution cleanup failed"
[[ ! -e ${workspace}/node_modules && -z $(git_read_as_phase_f1_build_user -C "${workspace}" status --porcelain --untracked-files=all) ]] || die "offline npm resolution left workspace residue"
after=$(/usr/bin/node "${PHASE_F1_PACK_DIR}/offline-npm-cache.mjs" classify-recovery "${workspace}" "${PHASE_F1_PACK_COMMIT}") || die "post-resolution sealed cache classification failed"
[[ ${after} == "${before}" ]] || die "sealed cache identity changed during offline resolution"
/usr/bin/node "${PHASE_F1_PACK_DIR}/offline-npm-cache.mjs" publish-after-offline-verification "${workspace}" "${PHASE_F1_PACK_COMMIT}" >/dev/null
/usr/bin/node "${PHASE_F1_PACK_DIR}/offline-npm-cache.mjs" verify "${workspace}" "${PHASE_F1_PACK_COMMIT}" >/dev/null
trap - EXIT INT TERM
printf 'OFFLINE_NPM_CACHE_READY recovery=REVERIFY values-recorded=false\n'
