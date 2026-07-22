#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
require_root; require_application_sha forward "${1:-}"; start_write_log freeze-storage-writers
baseline="${PHASE_F1_STATE_ROOT}/legacy-before-freeze.json"; [[ ! -e ${baseline} && ! -L ${baseline} ]] || die "legacy freeze baseline already exists"
/usr/bin/node "${PHASE_F1_PACK_DIR}/capture-legacy-baseline.mjs" "${baseline}"
legacy_pid=$(/usr/bin/node -e 'process.stdout.write(String(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).pid))' "${baseline}")
/usr/bin/node "${PHASE_F1_PACK_DIR}/listener-verification.mjs" verify 3000 "${legacy_pid}"
env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=/root /usr/bin/node "${PHASE_F1_PACK_DIR}/smoke-http.mjs" private bcn-only 3000 3200
intent="${PHASE_F1_STATE_ROOT}/freeze-intent.evidence"; [[ ! -e ${intent} && ! -L ${intent} ]] || die "freeze intent already exists"
printf 'forwardApplicationSha=%s\nrollbackApplicationSha=%s\nhistoricalProductionSha=%s\nlegacyPid=%s\nlegacyBaselineSha256=%s\n' "${PHASE_F1_FORWARD_SHA}" "${PHASE_F1_ROLLBACK_SHA}" "${PHASE_F1_HISTORICAL_SHA}" "${legacy_pid}" "$(sha256sum "${baseline}" | awk '{print $1}')" >"${intent}"; chmod 0600 "${intent}"; chown root:root "${intent}"
transition_state candidates-verified freezing "${intent}"
# From durable `freezing` onward, the pm2-root ExecCondition rejects resurrection.
declare -a frozen_candidates=()
for candidate in "the-business-circle-network-candidate.service|3100" "circle-card.service|3200"; do
  IFS='|' read -r unit port <<<"${candidate}"
  ownership="${PHASE_F1_STATE_ROOT}/candidate-running-${unit}.evidence"
  frozen_candidates+=("${unit}|${port}|${ownership}")
done
cleanup_all_candidate_invocations frozen_candidates || die "one or more invocation-owned candidates could not be cleaned"
pm2 stop businesscircle
for port in 3000 3100 3200; do /usr/bin/node "${PHASE_F1_PACK_DIR}/listener-verification.mjs" free "${port}" || die "writer still owns port ${port}"; done
marker="${PHASE_F1_STATE_ROOT}/writers-frozen.evidence"; [[ ! -e ${marker} && ! -L ${marker} ]] || die "writer-freeze evidence already exists"
printf 'freezeIntentSha256=%s\n' "$(sha256sum "${intent}" | awk '{print $1}')" >"${marker}"; chmod 0600 "${marker}"; chown root:root "${marker}"
transition_state freezing writers-frozen "${marker}"
printf 'All known upload writers are frozen. A reboot at this stage intentionally leaves BCN stopped until convergence and rollback adoption resume.\n'
