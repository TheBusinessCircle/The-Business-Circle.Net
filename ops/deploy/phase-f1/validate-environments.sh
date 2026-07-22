#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

require_root
require_application_sha forward "${1:-}"
require_release_integrity
start_write_log "validate-environments"

env -i HOME=/root PATH=/usr/local/bin:/usr/bin:/bin /usr/bin/node "${PHASE_F1_PACK_DIR}/validate-environment.mjs" bcn
env -i HOME=/root PATH=/usr/local/bin:/usr/bin:/bin /usr/bin/node "${PHASE_F1_PACK_DIR}/validate-environment.mjs" circle-card
sudo -u circle-card-app test -r "${PHASE_F1_CIRCLE_ENV}" || die "Circle Card cannot read its protected environment"
sudo -u circle-card-app test ! -r "${PHASE_F1_BCN_ENV}" || die "Circle Card can read the BCN protected environment"
sudo -u bcn-app test -r "${PHASE_F1_BCN_ENV}" || die "BCN cannot read its protected environment"
sudo -u bcn-app test ! -r "${PHASE_F1_CIRCLE_ENV}" || die "BCN can read the Circle protected environment"

readonly READINESS="${PHASE_F1_STATE_ROOT}/environment-readiness.json"
[[ ! -L ${READINESS} ]] || die "environment readiness target is a symlink"
temporary=$(mktemp "${PHASE_F1_STATE_ROOT}/.environment-readiness.XXXXXX")
cat >"${temporary}" <<EOF
{
  "ready": true,
  "forwardApplicationSha": "${PHASE_F1_FORWARD_SHA}",
  "rollbackApplicationSha": "${PHASE_F1_ROLLBACK_SHA}",
  "historicalProductionSha": "${PHASE_F1_HISTORICAL_SHA}",
  "operationsCommit": "${PHASE_F1_PACK_COMMIT}",
  "bcn": { "validation": "passed", "emptyRequiredNames": [] },
  "circleCard": { "validation": "passed", "emptyRequiredNames": [] }
}
EOF
chmod 0600 "${temporary}" && chown root:root "${temporary}"
mv -T "${temporary}" "${READINESS}"
printf 'Both protected runtime environments passed name, isolation and production policy validation.\n'
