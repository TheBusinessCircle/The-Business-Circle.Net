#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
readonly ROLE=${2:-}
readonly WORKSPACE=${3:-}
require_root
require_application_sha "${ROLE}" "${1:-}"
[[ -n ${WORKSPACE} ]] || die "failed checkout path is required"
start_write_log "cleanup-${ROLE}-failed-checkout"
/usr/bin/node "${PHASE_F1_PACK_DIR}/failed-checkout-cleanup.mjs" cleanup \
  "${WORKSPACE}" "${ROLE}" "${1}" "${PHASE_F1_PACK_COMMIT}"
