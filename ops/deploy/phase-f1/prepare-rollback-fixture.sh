#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
require_root; require_application_sha rollback "${1:-}"
[[ $(uname -s) == Linux && $(node --version) == v22.22.2 ]] || die "rollback fixture requires Linux and Node 22.22.2"
require_trusted_npm_config_sources
start_write_log prepare-rollback-linux-fixture
attempt_file="${PHASE_F1_STATE_ROOT}/rollback-build-attempt.json"; require_protected_state_file "${attempt_file}"
workspace=$(/usr/bin/node "${PHASE_F1_PACK_DIR}/build-state.mjs" inspect "${attempt_file}" rollback "${PHASE_F1_ROLLBACK_SHA}" "${PHASE_F1_PACK_COMMIT}"); workspace=$(realpath -e "${workspace}")
[[ ${workspace} == "${PHASE_F1_BUILD_ROOT}/rollback-${PHASE_F1_ROLLBACK_SHA}-"* ]] || die "wrong rollback fixture workspace"
identity_recheck="${PHASE_F1_STATE_ROOT}/rollback-application-identity.recheck.json"
[[ ! -e ${identity_recheck} ]] || die "rollback identity recheck evidence already exists"
env -i HOME=/root PATH=/usr/local/bin:/usr/bin:/bin /usr/bin/node "${PHASE_F1_PACK_DIR}/application-identities.mjs" verify rollback "${workspace}" "${identity_recheck}" >/dev/null
chmod 0600 "${identity_recheck}"; chown root:root "${identity_recheck}"
env -i HOME=/root PATH=/usr/local/bin:/usr/bin:/bin /usr/bin/node \
  "${PHASE_F1_PACK_DIR}/offline-npm-cache.mjs" verify "${workspace}" "${PHASE_F1_PACK_COMMIT}" >/dev/null || die "OFFLINE_NPM_CACHE_NOT_READY"
readonly OFFLINE_CACHE=${PHASE_F1_OFFLINE_NPM_CACHE_ROOT}
consumed_workspace=$(/usr/bin/node "${PHASE_F1_PACK_DIR}/build-state.mjs" consume "${attempt_file}" rollback "${PHASE_F1_ROLLBACK_SHA}" "${PHASE_F1_PACK_COMMIT}")
[[ $(realpath -e "${consumed_workspace}") == "${workspace}" ]] || die "rollback build attempt changed before consumption"
build_complete=false
record_failed_attempt() { local status=$?; trap - EXIT ERR INT TERM; if ((status)) && [[ ${build_complete} != true ]]; then /usr/bin/node "${PHASE_F1_PACK_DIR}/build-state.mjs" finish "${attempt_file}" failed "${PHASE_F1_PACK_COMMIT}" || true; fi; exit "${status}"; }
trap record_failed_attempt EXIT INT TERM
sudo -u phase-f1-build env -i HOME=/var/lib/thebusinesscircle/build PATH=/usr/local/bin:/usr/bin:/bin \
  NPM_CONFIG_USERCONFIG="${PHASE_F1_NPM_USER_CONFIG}" NPM_CONFIG_GLOBALCONFIG="${PHASE_F1_NPM_GLOBAL_CONFIG}" NPM_CONFIG_CACHE="${OFFLINE_CACHE}" \
  NPM_CONFIG_LOGS_DIR=/var/lib/thebusinesscircle/build/npm-logs NPM_CONFIG_OFFLINE=true NPM_CONFIG_INCLUDE=dev NPM_CONFIG_UPDATE_NOTIFIER=false NEXT_TELEMETRY_DISABLED=1 \
  npm --prefix "${workspace}" ci --include=dev --offline --no-audit --no-fund
workspace_basename=$(basename "${workspace}")
[[ ${workspace_basename} == rollback-${PHASE_F1_ROLLBACK_SHA}-* && ${workspace_basename} != *..* ]] ||
  die "rollback fixture workspace basename is unsafe"
fixture_parent="${PHASE_F1_BUILD_ROOT}/rollback-fixture-${PHASE_F1_ROLLBACK_SHA}-${workspace_basename}"
fixture="${fixture_parent}/fixture"
[[ ! -e ${fixture_parent} && ! -L ${fixture_parent} ]] || die "rollback fixture path collision"
install -d -m 0750 -o phase-f1-build -g phase-f1-build "${fixture_parent}"
/usr/bin/unshare --mount --net -- /usr/bin/env -i HOME=/root PATH=/usr/local/bin:/usr/bin:/bin \
  /usr/bin/node "${PHASE_F1_PACK_DIR}/rollback-fixture-network-isolation.mjs" generate
[[ -f ${fixture}/.phase-e3-production-fixture.json && ! -L ${fixture}/.phase-e3-production-fixture.json ]] || die "rollback fixture provenance is absent"
post_build_identity="${PHASE_F1_STATE_ROOT}/rollback-application-identity.post-build.json"
[[ ! -e ${post_build_identity} && ! -L ${post_build_identity} ]] || die "post-build rollback identity evidence already exists"
env -i HOME=/root PATH=/usr/local/bin:/usr/bin:/bin /usr/bin/node "${PHASE_F1_PACK_DIR}/application-identities.mjs" verify rollback "${workspace}" "${post_build_identity}" >/dev/null
chmod 0600 "${post_build_identity}"; chown root:root "${post_build_identity}"
# Remove build-user mutation authority before accepting the real-server evidence.
chown -hR root:root "${workspace}" "${fixture_parent}"
find -P "${workspace}" "${fixture_parent}" -xdev -type d -exec chmod 0555 {} +
find -P "${workspace}" "${fixture_parent}" -xdev -type f -perm /111 -exec chmod 0555 {} +
find -P "${workspace}" "${fixture_parent}" -xdev -type f ! -perm /111 -exec chmod 0444 {} +
/usr/bin/unshare --mount --net -- /usr/bin/env -i HOME=/root PATH=/usr/local/bin:/usr/bin:/bin \
  /usr/bin/node "${PHASE_F1_PACK_DIR}/rollback-fixture-network-isolation.mjs" verify
provenance_evidence="${PHASE_F1_STATE_ROOT}/rollback-production-fixture-provenance.json"
next_start_evidence="${PHASE_F1_STATE_ROOT}/rollback-linux-next-start-evidence.json"
fixture_evidence="${PHASE_F1_STATE_ROOT}/rollback-fixture.path"
for output in "${provenance_evidence}" "${next_start_evidence}" "${fixture_evidence}"; do [[ ! -e ${output} && ! -L ${output} ]] || die "rollback fixture evidence already exists: ${output}"; done
install -m 0600 -o root -g root "${fixture}/.phase-e3-production-fixture.json" "${provenance_evidence}"
printf '{"skipped":false,"applicationSha":"%s","provenanceSha256":"%s","testSourceSha256":"%s","applicationIdentitySha256":"%s","buildIdSha256":"%s","realNextStartPassed":true,"historicalHomepagePassed":true,"loginRedirectPassed":true,"invalidStripeSignaturePassed":true,"imageSignaturesPassed":true,"runtimeManifestUnchanged":true,"publicManifestUnchanged":true,"fetchCacheAbsent":true,"imageCacheAbsent":true}\n' \
  "${PHASE_F1_ROLLBACK_SHA}" "$(sha256sum "${fixture}/.phase-e3-production-fixture.json" | awk '{print $1}')" \
  "$(sha256sum "${workspace}/src/config/rollback-immutable-runtime-cache.test.ts" | awk '{print $1}')" \
  "$(sha256sum "${identity_recheck}" | awk '{print $1}')" "$(sha256sum "${fixture}/.next/BUILD_ID" | awk '{print $1}')" \
  >"${next_start_evidence}"
chmod 0600 "${next_start_evidence}"; chown root:root "${next_start_evidence}"
printf '%s\n' "${fixture}" >"${fixture_evidence}"
chmod 0600 "${fixture_evidence}"; chown root:root "${fixture_evidence}"
/usr/bin/node "${PHASE_F1_PACK_DIR}/build-state.mjs" finish "${attempt_file}" complete "${PHASE_F1_PACK_COMMIT}"
build_complete=true; trap - EXIT ERR INT TERM
printf 'Rollback fixture generation and provenance-gated real next start both executed successfully.\n'
