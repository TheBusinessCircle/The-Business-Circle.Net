#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
require_root
require_pack_integrity
readonly FAILED_ATTEMPT_SHA256=${1:-}
[[ ${FAILED_ATTEMPT_SHA256} =~ ^[0-9a-f]{64}$ ]] ||
  die "exact failed rollback build-attempt SHA-256 required"
start_write_log recover-failed-rollback-attempt
env -i HOME=/root PATH=/usr/local/bin:/usr/bin:/bin /usr/bin/node \
  "${PHASE_F1_PACK_DIR}/failed-rollback-attempt-recovery.mjs" recover \
  "${FAILED_ATTEMPT_SHA256}" "${PHASE_F1_PACK_COMMIT}" \
  FAILED_CURRENT_AUTHORITY_ROLLBACK_BUILD_ATTEMPT_RECOVERY
