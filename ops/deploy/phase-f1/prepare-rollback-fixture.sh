#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
require_root; require_application_sha rollback "${1:-}"
[[ $(uname -s) == Linux && $(node --version) == v22.22.2 ]] || die "rollback fixture requires Linux and Node 22.22.2"
start_write_log prepare-rollback-linux-fixture
attempt_file="${PHASE_F1_STATE_ROOT}/rollback-build-attempt.path"; require_protected_state_file "${attempt_file}"
workspace=$(realpath -e "$(<"${attempt_file}")")
[[ ${workspace} == "${PHASE_F1_BUILD_ROOT}/rollback-${PHASE_F1_ROLLBACK_SHA}-"* ]] || die "wrong rollback fixture workspace"
identity_recheck="${PHASE_F1_STATE_ROOT}/rollback-application-identity.recheck.json"
[[ ! -e ${identity_recheck} ]] || die "rollback identity recheck evidence already exists"
env -i HOME=/root PATH=/usr/local/bin:/usr/bin:/bin /usr/bin/node "${PHASE_F1_PACK_DIR}/application-identities.mjs" verify rollback "${workspace}" "${identity_recheck}" >/dev/null
chmod 0600 "${identity_recheck}"; chown root:root "${identity_recheck}"
readonly OFFLINE_CACHE=${PHASE_E3_OFFLINE_NPM_CACHE_ROOT:?approved offline npm cache required}
[[ -d ${OFFLINE_CACHE} && ! -L ${OFFLINE_CACHE} ]] || die "unsafe offline npm cache"
sudo -u phase-f1-build env -i HOME=/var/lib/thebusinesscircle/build PATH=/usr/local/bin:/usr/bin:/bin \
  NPM_CONFIG_CACHE="${OFFLINE_CACHE}" NPM_CONFIG_OFFLINE=true NEXT_TELEMETRY_DISABLED=1 \
  npm --prefix "${workspace}" ci --offline --no-audit --no-fund
fixture_parent="${PHASE_F1_BUILD_ROOT}/rollback-fixture-${PHASE_F1_ROLLBACK_SHA}-$(openssl rand -hex 8)"
fixture="${fixture_parent}/fixture"
[[ ! -e ${fixture_parent} && ! -L ${fixture_parent} ]] || die "rollback fixture path collision"
install -d -m 0750 -o phase-f1-build -g phase-f1-build "${fixture_parent}"
sudo -u phase-f1-build env -i HOME=/var/lib/thebusinesscircle/build PATH=/usr/local/bin:/usr/bin:/bin \
  NPM_CONFIG_CACHE="${OFFLINE_CACHE}" NPM_CONFIG_OFFLINE=true NEXT_TELEMETRY_DISABLED=1 \
  PHASE_E3_OFFLINE_NPM_CACHE_ROOT="${OFFLINE_CACHE}" PHASE_E3_GENERATE_PRODUCTION_FIXTURE_ROOT="${fixture}" \
  /usr/bin/node "${workspace}/node_modules/vitest/vitest.mjs" run src/config/rollback-immutable-runtime-cache.test.ts
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
sudo -u phase-f1-build env -i HOME=/var/lib/thebusinesscircle/build PATH=/usr/local/bin:/usr/bin:/bin \
  NEXT_TELEMETRY_DISABLED=1 PHASE_E3_PRODUCTION_FIXTURE_ROOT="${fixture}" \
  /usr/bin/node "${workspace}/node_modules/vitest/vitest.mjs" run src/config/rollback-immutable-runtime-cache.test.ts
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
printf 'Rollback fixture generation and provenance-gated real next start both executed successfully.\n'
