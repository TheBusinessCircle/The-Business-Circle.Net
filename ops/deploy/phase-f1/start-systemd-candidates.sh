#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
require_root; require_application_sha forward "${1:-}"; require_release_integrity; require_environment_ready; start_write_log start-systemd-candidates
declare -a owned=()
cleanup() { local status=$?; trap - EXIT ERR INT TERM; if ((status)) && ! cleanup_all_candidate_invocations owned; then status=1; fi; exit "${status}"; }
trap cleanup EXIT INT TERM
for item in "the-business-circle-network-candidate.service|3100" "circle-card.service|3200"; do
  IFS='|' read -r unit port <<<"${item}"
  ownership=$(begin_candidate_invocation "${unit}" "${port}")
  owned+=("${unit}|${port}|${ownership}")
  systemctl start "${unit}"
  /usr/bin/node "${PHASE_F1_PACK_DIR}/verify-systemd-process.mjs" "${unit}" >/dev/null
done
"${PHASE_F1_PACK_DIR}/private-smoke-read-only.sh" "${PHASE_F1_FORWARD_SHA}" candidate
evidence="${PHASE_F1_STATE_ROOT}/candidate-smoke.evidence"; [[ ! -e ${evidence} ]] || die "candidate smoke evidence collision"
printf 'bcnUnit=the-business-circle-network-candidate.service\ncircleUnit=circle-card.service\nforwardApplicationSha=%s\nrollbackApplicationSha=%s\n' "${PHASE_F1_FORWARD_SHA}" "${PHASE_F1_ROLLBACK_SHA}" >"${evidence}"; chmod 0600 "${evidence}"; chown root:root "${evidence}"
for item in "${owned[@]}"; do IFS='|' read -r unit port ownership <<<"${item}"; mv -T "${ownership}" "${PHASE_F1_STATE_ROOT}/candidate-running-${unit}.evidence"; done
transition_state prepared candidates-verified "${evidence}"
trap - EXIT INT TERM
printf 'Private systemd candidates passed exact process and smoke verification; live BCN is untouched.\n'
