#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
readonly SELECTOR_ROLE=${1:-}
readonly APPLICATION_SHA=${2:-}
require_root; require_environment_ready; require_release_integrity
case "${SELECTOR_ROLE}" in
  rollback-probe) require_application_sha rollback "${APPLICATION_SHA}" ;;
  circle-card) require_application_sha forward "${APPLICATION_SHA}" ;;
  *) die "selector role must be rollback-probe or circle-card" ;;
esac
start_write_log "publish-${SELECTOR_ROLE}-selector"
/usr/bin/node "${PHASE_F1_PACK_DIR}/candidate-selector.mjs" publish \
  "${SELECTOR_ROLE}" "${PHASE_F1_PACK_COMMIT}" >/dev/null
printf 'Verified immutable artifact selector published for %s.\n' "${SELECTOR_ROLE}"
