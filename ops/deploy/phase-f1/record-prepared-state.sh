#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
require_root; require_application_sha forward "${1:-}"; start_write_log record-prepared-state
/usr/bin/node "${PHASE_F1_PACK_DIR}/release-bindings.mjs" "${PHASE_F1_STATE_ROOT}" \
  "${PHASE_F1_ARTIFACT_ROOT}" "${PHASE_F1_PACK_COMMIT}" legacy private >/dev/null
transition_state none prepared "${PHASE_F1_STATE_ROOT}/release-bindings.json"
printf 'Prepared state records distinct forward, rollback, historical and operations identities.\n'
