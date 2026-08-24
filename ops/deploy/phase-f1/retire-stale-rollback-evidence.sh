#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
require_root
require_pack_integrity
readonly APPLICATION_IDENTITY_SHA256=${1:-}
readonly BUILD_ATTEMPT_SHA256=${2:-}
[[ ${APPLICATION_IDENTITY_SHA256} =~ ^[0-9a-f]{64}$ ]] || die "exact rollback application-identity SHA-256 required"
[[ ${BUILD_ATTEMPT_SHA256} =~ ^[0-9a-f]{64}$ ]] || die "exact rollback build-attempt SHA-256 required"
start_write_log retire-stale-rollback-evidence
env -i HOME=/root PATH=/usr/local/bin:/usr/bin:/bin /usr/bin/node \
  "${PHASE_F1_PACK_DIR}/rollback-evidence-retirement.mjs" retire \
  "${APPLICATION_IDENTITY_SHA256}" "${BUILD_ATTEMPT_SHA256}" \
  "${PHASE_F1_PACK_COMMIT}" STALE_TRUSTED_ROLLBACK_EVIDENCE_RETIREMENT
