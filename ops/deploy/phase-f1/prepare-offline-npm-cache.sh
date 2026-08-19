#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
require_root; require_application_sha rollback "${1:-}"; require_environment_ready
[[ $(node --version) == v22.22.2 && $(npm --version) == 10.9.7 ]] || die "exact Node/npm versions required"
attempt_file="${PHASE_F1_STATE_ROOT}/rollback-build-attempt.json"; require_protected_state_file "${attempt_file}"
workspace=$(/usr/bin/node "${PHASE_F1_PACK_DIR}/build-state.mjs" inspect "${attempt_file}" rollback "${PHASE_F1_ROLLBACK_SHA}" "${PHASE_F1_PACK_COMMIT}"); workspace=$(realpath -e "${workspace}")
[[ ${workspace} == "${PHASE_F1_BUILD_ROOT}/rollback-${PHASE_F1_ROLLBACK_SHA}-"* && $(git_read_as_phase_f1_build_user -C "${workspace}" rev-parse HEAD) == "${PHASE_F1_ROLLBACK_SHA}" ]] || die "unapproved rollback cache-preparation workspace"
[[ ! -e ${PHASE_F1_OFFLINE_NPM_CACHE_ROOT} && ! -L ${PHASE_F1_OFFLINE_NPM_CACHE_ROOT} ]] || die "offline npm cache destination already exists"
[[ ! -e ${PHASE_F1_OFFLINE_NPM_CACHE_READINESS} && ! -L ${PHASE_F1_OFFLINE_NPM_CACHE_READINESS} ]] || die "offline npm cache readiness evidence already exists"
cache_parent=$(dirname "${PHASE_F1_OFFLINE_NPM_CACHE_ROOT}")
assert_no_symlink_components "${cache_parent}"
install -d -m 0755 -o root -g root "${cache_parent}"
promotion="${cache_parent}/.npm-offline-v1.promotion.$(openssl rand -hex 8)"
[[ ! -e ${promotion} && ! -L ${promotion} ]] || die "offline npm cache promotion collision"
cache_published=false
cleanup_cache_preparation() {
  if [[ ${cache_published} != true && -d ${promotion} && ! -L ${promotion} && ${promotion} == "${cache_parent}/.npm-offline-v1.promotion."* ]]; then
    rm -rf --one-file-system -- "${promotion}"
  fi
}
trap cleanup_cache_preparation EXIT INT TERM
install -d -m 0750 -o phase-f1-build -g phase-f1-build "${promotion}"
install -d -m 0750 -o phase-f1-build -g phase-f1-build /var/lib/thebusinesscircle/build/npm-logs
start_write_log prepare-offline-npm-cache
sudo -u phase-f1-build env -i HOME=/var/lib/thebusinesscircle/build PATH=/usr/local/bin:/usr/bin:/bin \
  NPM_CONFIG_USERCONFIG=/dev/null NPM_CONFIG_GLOBALCONFIG=/dev/null NPM_CONFIG_CACHE="${promotion}" \
  NPM_CONFIG_LOGS_DIR=/var/lib/thebusinesscircle/build/npm-logs NPM_CONFIG_UPDATE_NOTIFIER=false \
  NPM_CONFIG_REGISTRY=https://registry.npmjs.org/ NEXT_TELEMETRY_DISABLED=1 \
  npm --prefix "${workspace}" ci --ignore-scripts --no-audit --no-fund
[[ ${workspace} == "${PHASE_F1_BUILD_ROOT}/rollback-${PHASE_F1_ROLLBACK_SHA}-"* && -d ${workspace}/node_modules && ! -L ${workspace}/node_modules ]] || die "unexpected cache-preparation dependency directory"
rm -rf --one-file-system -- "${workspace}/node_modules"
[[ ! -e ${workspace}/node_modules ]] || die "cache-preparation dependency cleanup failed"
for disposable in _logs _update-notifier-last-checked; do
  target="${promotion}/${disposable}"
  if [[ -e ${target} || -L ${target} ]]; then [[ ${target} == "${promotion}/"* ]] || die "unsafe cache cleanup target"; rm -rf --one-file-system -- "${target}"; fi
done
[[ -d ${promotion}/_cacache && ! -L ${promotion}/_cacache ]] || die "npm did not create the approved content-addressable cache"
chown -hR root:phase-f1-build "${promotion}"
find -P "${promotion}" -xdev -type d -exec chmod 0550 {} +
find -P "${promotion}" -xdev -type f -exec chmod 0440 {} +
find -P "${promotion}" -xdev \( -type l -o ! -type d ! -type f \) -print -quit | grep -q . && die "offline npm cache contains an unsupported object"
mv "${promotion}" "${PHASE_F1_OFFLINE_NPM_CACHE_ROOT}"
/usr/bin/sync -f "${PHASE_F1_OFFLINE_NPM_CACHE_ROOT}"
/usr/bin/sync -f "${cache_parent}"
cache_published=true; trap - EXIT INT TERM
/usr/bin/node "${PHASE_F1_PACK_DIR}/offline-npm-cache.mjs" publish "${workspace}" "${PHASE_F1_PACK_COMMIT}" >/dev/null
first_cache_file=$(find -P "${PHASE_F1_OFFLINE_NPM_CACHE_ROOT}/_cacache/content-v2" -xdev -type f -print -quit)
[[ -n ${first_cache_file} && ${first_cache_file} == "${PHASE_F1_OFFLINE_NPM_CACHE_ROOT}/_cacache/content-v2/"* ]] || die "offline npm cache contains no approved content"
sudo -u phase-f1-build test -x "${cache_parent}" || die "build user cannot traverse the offline npm cache parent"
sudo -u phase-f1-build test -x "${PHASE_F1_OFFLINE_NPM_CACHE_ROOT}" || die "build user cannot traverse the offline npm cache"
sudo -u phase-f1-build test -r "${first_cache_file}" || die "build user cannot read offline npm cache content"
sudo -u bcn-app test ! -w "${PHASE_F1_OFFLINE_NPM_CACHE_ROOT}" || die "BCN runtime can mutate the offline npm cache"
sudo -u bcn-app test ! -w "${first_cache_file}" || die "BCN runtime can mutate offline npm cache content"
sudo -u circle-card-app test ! -w "${PHASE_F1_OFFLINE_NPM_CACHE_ROOT}" || die "Circle Card runtime can mutate the offline npm cache"
sudo -u circle-card-app test ! -w "${first_cache_file}" || die "Circle Card runtime can mutate offline npm cache content"
printf 'OFFLINE_NPM_CACHE_READY\n'
