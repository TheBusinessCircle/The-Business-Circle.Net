#!/usr/bin/env bash

set -Eeuo pipefail
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
require_application_sha forward "${1:-}"
[[ -f ${PHASE_F1_STATE_ROOT}/cloudflare-tls-approval.json && -f ${PHASE_F1_STATE_ROOT}/forward-ubuntu-rehearsal-evidence.json && -f ${PHASE_F1_STATE_ROOT}/rollback-ubuntu-rehearsal-evidence.json ]] || die "TLS and both Ubuntu rehearsal gates are mandatory"
env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=/root /usr/bin/node "${PHASE_F1_PACK_DIR}/smoke-http.mjs" public both
/usr/bin/node "${PHASE_F1_PACK_DIR}/structured-evidence.mjs" validate authenticated "${PHASE_F1_STATE_ROOT}/authenticated-smoke-evidence.json" || die "strict authenticated evidence was not approved"
printf 'Public semantic and explicit authenticated manual gates passed without a live email or unapproved charge.\n'
