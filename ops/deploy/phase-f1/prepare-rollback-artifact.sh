#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
require_root; require_application_sha rollback "${1:-}"; require_environment_ready
fixture_pointer="${PHASE_F1_STATE_ROOT}/rollback-fixture.path"; require_protected_state_file "${fixture_pointer}"
fixture=$(realpath -e "$(<"${fixture_pointer}")")
[[ ${fixture} == "${PHASE_F1_BUILD_ROOT}/rollback-fixture-${PHASE_F1_ROLLBACK_SHA}-"* && -f ${fixture}/.phase-e3-production-fixture.json ]] || die "unapproved rollback fixture"
for cache in cache cache/fetch-cache cache/images; do [[ ! -e ${fixture}/.next/${cache} ]] || die "rollback fixture contains forbidden runtime cache: ${cache}"; done
start_write_log prepare-rollback-artifact
rollback_root=$(dirname "${PHASE_F1_ROLLBACK_DIR}"); install -d -m 0755 -o root -g root "${rollback_root}"
promotion="${rollback_root}/.${PHASE_F1_ROLLBACK_SHA}.promotion.$(openssl rand -hex 8)"
[[ ! -e ${promotion} && ! -e ${PHASE_F1_ROLLBACK_DIR} ]] || die "rollback promotion or artifact already exists"
promoted=false
cleanup_promotion() {
  if [[ ${promoted} != true && -d ${promotion} && ! -L ${promotion} && ${promotion} == "${rollback_root}/.${PHASE_F1_ROLLBACK_SHA}.promotion."* ]]; then
    rm -rf --one-file-system -- "${promotion}"
  fi
}
trap cleanup_promotion EXIT
install -d -m 0700 -o root -g root "${promotion}"
rsync -a --exclude=.phase-e3-production-fixture.json --exclude=.git --exclude=.next/cache/ "${fixture}/" "${promotion}/"
mv "${promotion}" "${PHASE_F1_ROLLBACK_DIR}"
promoted=true
"${PHASE_F1_PACK_DIR}/attach-storage.sh" "${PHASE_F1_ROLLBACK_SHA}" "${PHASE_F1_ROLLBACK_DIR}" rollback
install -d -m 0700 -o root -g root "${PHASE_F1_ARTIFACT_ROOT}"
/usr/bin/node "${PHASE_F1_PACK_DIR}/artifact-manifest.mjs" runtime-create "${PHASE_F1_ROLLBACK_DIR}/.next" "${PHASE_F1_ARTIFACT_ROOT}/rollback-bcn.manifest" >/dev/null
/usr/bin/node "${PHASE_F1_PACK_DIR}/artifact-manifest.mjs" release-create "${PHASE_F1_ROLLBACK_DIR}" "${PHASE_F1_ARTIFACT_ROOT}/rollback-release.manifest" >/dev/null
chmod 0600 "${PHASE_F1_ARTIFACT_ROOT}"/rollback-*.manifest; chown root:root "${PHASE_F1_ARTIFACT_ROOT}"/rollback-*.manifest
[[ ! -e /var/www/current-bcn-rollback-probe && ! -L /var/www/current-bcn-rollback-probe ]] || die "rollback probe selector exists"
ln -s "${PHASE_F1_ROLLBACK_DIR}" /var/www/current-bcn-rollback-probe
printf 'Rollback artifact was promoted only from the provenance-gated committed-candidate fixture.\n'
