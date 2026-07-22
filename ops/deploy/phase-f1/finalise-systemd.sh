#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
require_root; require_application_sha forward "${1:-}"; require_release_integrity; start_write_log finalise-systemd
for unit in the-business-circle-network.service circle-card.service; do
  [[ $(systemctl is-enabled "${unit}") == enabled && $(systemctl is-active "${unit}") == active ]] || die "final service is not enabled and active: ${unit}"
  /usr/bin/node "${PHASE_F1_PACK_DIR}/verify-systemd-process.mjs" "${unit}" >/dev/null
done
for unit in the-business-circle-network-candidate.service the-business-circle-network-rollback-probe.service; do
  [[ $(systemctl is-active "${unit}" 2>/dev/null || true) == inactive ]] || die "private candidate remains active"
done
[[ $(systemctl is-active pm2-root.service 2>/dev/null || true) == inactive ]] || die "pm2-root unexpectedly active"
/usr/bin/node "${PHASE_F1_PACK_DIR}/listener-verification.mjs" verify 3000 "$(systemctl show the-business-circle-network.service -p MainPID --value)"
/usr/bin/node "${PHASE_F1_PACK_DIR}/listener-verification.mjs" verify 3200 "$(systemctl show circle-card.service -p MainPID --value)"
for port in 3100 3300; do /usr/bin/node "${PHASE_F1_PACK_DIR}/listener-verification.mjs" free "${port}" || die "private port remains occupied"; done
/usr/bin/node "${PHASE_F1_PACK_DIR}/structured-evidence.mjs" validate authenticated "${PHASE_F1_STATE_ROOT}/authenticated-smoke-evidence.json"
transition_state traffic-switched finalized "${PHASE_F1_STATE_ROOT}/authenticated-smoke-evidence.json"
printf 'Exact final systemd process set and reboot ownership are verified.\n'
