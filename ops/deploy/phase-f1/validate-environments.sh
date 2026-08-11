#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

require_root
require_application_sha forward "${1:-}"
start_write_log "validate-environments"

env -i HOME=/root PATH=/usr/local/bin:/usr/bin:/bin /usr/bin/node "${PHASE_F1_PACK_DIR}/validate-environment.mjs" schema
env -i HOME=/root PATH=/usr/local/bin:/usr/bin:/bin /usr/bin/node \
  "${PHASE_F1_PACK_DIR}/environment-readiness.mjs" publish \
  "${PHASE_F1_STATE_ROOT}" "${PHASE_F1_PACK_COMMIT}"
printf 'Protected BCN, Circle Card and build environments passed environment-only policy and isolation validation. Release integrity was not evaluated.\n'
