#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
require_root; require_application_sha rollback "${1:-}"; start_write_log probe-rollback-candidate
unit=the-business-circle-network-rollback-probe.service; port=3300
ownership=$(begin_candidate_invocation "${unit}" "${port}")
cleanup() { local status=$?; trap - EXIT ERR INT TERM; local -a owned=("${unit}|${port}|${ownership}"); cleanup_all_candidate_invocations owned || status=1; exit "${status}"; }
trap cleanup EXIT INT TERM
systemctl start "${unit}"
/usr/bin/node "${PHASE_F1_PACK_DIR}/verify-systemd-process.mjs" "${unit}" >/dev/null
"${PHASE_F1_PACK_DIR}/private-smoke-read-only.sh" "${PHASE_F1_ROLLBACK_SHA}" rollback
run_id="$(date -u +%Y%m%dT%H%M%S.%NZ)-$(openssl rand -hex 6)"
evidence="${PHASE_F1_STATE_ROOT}/rollback-private-smoke-${run_id}.evidence"
printf 'unit=%s\nrollbackApplicationSha=%s\nhistoricalParentSha=%s\n' "${unit}" "${PHASE_F1_ROLLBACK_SHA}" "${PHASE_F1_HISTORICAL_SHA}" >"${evidence}"; chmod 0600 "${evidence}"; chown root:root "${evidence}"
proof="${PHASE_F1_STATE_ROOT}/rollback-proof-${run_id}.json"
"${PHASE_F1_PACK_DIR}/rollback-proof.mjs" create "${proof}" "${PHASE_F1_ROLLBACK_SHA}" "${PHASE_F1_HISTORICAL_SHA}" "${evidence}"
pointer="${PHASE_F1_STATE_ROOT}/latest-rollback-proof.path"; pointer_temp=$(mktemp "${PHASE_F1_STATE_ROOT}/.rollback-proof-pointer.XXXXXXXX"); printf '%s\n' "${proof}" >"${pointer_temp}"; chmod 0600 "${pointer_temp}"; chown root:root "${pointer_temp}"; mv -T "${pointer_temp}" "${pointer}"
printf 'Rollback artifact passed a current-storage, current-database private systemd probe.\n'
