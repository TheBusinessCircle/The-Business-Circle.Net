#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
require_root; require_application_sha rollback "${1:-}"; require_release_integrity; start_write_log rollback-systemd
"${PHASE_F1_PACK_DIR}/probe-rollback-candidate.sh" "${PHASE_F1_ROLLBACK_SHA}"
proof_pointer="${PHASE_F1_STATE_ROOT}/latest-rollback-proof.path"; require_protected_state_file "${proof_pointer}"; proof=$(<"${proof_pointer}"); [[ ${proof} == "${PHASE_F1_STATE_ROOT}/rollback-proof-"*.json ]] || die "unsafe rollback proof path"; /usr/bin/node "${PHASE_F1_PACK_DIR}/rollback-proof.mjs" verify "${proof}" "${PHASE_F1_ROLLBACK_SHA}" "${PHASE_F1_HISTORICAL_SHA}"
current_stage=$(/usr/bin/node "${PHASE_F1_PACK_DIR}/deployment-state.mjs" read "${PHASE_F1_STATE_ROOT}" | /usr/bin/node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>process.stdout.write(JSON.parse(s).stage))')
if [[ ${current_stage} == forward-live || ${current_stage} == traffic-switched || ${current_stage} == finalized ]]; then
  "${PHASE_F1_PACK_DIR}/remove-circle-card-traffic.sh" "${PHASE_F1_ROLLBACK_SHA}"
  current_stage=circle-traffic-removed
fi
[[ ${current_stage} == circle-traffic-removed || ${current_stage} == rollback-switch-pending || ${current_stage} == rollback-starting ]] || die "rollback state is neither forward nor a recoverable rollback transaction"
/usr/bin/node "${PHASE_F1_PACK_DIR}/structured-evidence.mjs" validate routing-removed "${PHASE_F1_STATE_ROOT}/circle-traffic-removed-evidence.json"
if [[ ${current_stage} == circle-traffic-removed ]]; then
  systemctl disable --now circle-card.service || die "Circle Card service could not be disabled for rollback"
  [[ $(systemctl is-active circle-card.service 2>/dev/null || true) == inactive ]] || die "Circle Card remained active"
fi
parent=$(dirname "${PHASE_F1_CURRENT_BCN}"); temporary="${parent}/.current-bcn.rollback.$(openssl rand -hex 8)"
if [[ ${current_stage} == circle-traffic-removed ]]; then
  refresh_release_bindings forward disabled
  transition_state circle-traffic-removed rollback-switch-pending "${proof}"
  publish_boot_eligibility forward
  current_stage=rollback-switch-pending
fi
if [[ ${current_stage} == rollback-switch-pending ]]; then
  ln -s "${PHASE_F1_ROLLBACK_DIR}" "${temporary}"; mv -T "${temporary}" "${PHASE_F1_CURRENT_BCN}"
  refresh_release_bindings rollback disabled
  transition_state rollback-switch-pending rollback-starting "${proof}"
  publish_boot_eligibility rollback
  current_stage=rollback-starting
fi
if ! systemctl restart the-business-circle-network.service || ! /usr/bin/node "${PHASE_F1_PACK_DIR}/verify-systemd-process.mjs" the-business-circle-network.service >/dev/null || ! "${PHASE_F1_PACK_DIR}/private-smoke-read-only.sh" "${PHASE_F1_ROLLBACK_SHA}" rollback-live; then
  rescue="${parent}/.current-bcn.forward.$(openssl rand -hex 8)"; ln -s "${PHASE_F1_RELEASE_DIR}" "${rescue}"; mv -T "${rescue}" "${PHASE_F1_CURRENT_BCN}"
  refresh_release_bindings forward disabled
  transition_state rollback-starting circle-traffic-removed "${proof}"
  publish_boot_eligibility forward
  systemctl restart the-business-circle-network.service || die "rollback failed and forward recovery could not start"
  /usr/bin/node "${PHASE_F1_PACK_DIR}/verify-systemd-process.mjs" the-business-circle-network.service >/dev/null
  "${PHASE_F1_PACK_DIR}/private-smoke-read-only.sh" "${PHASE_F1_FORWARD_SHA}" forward-live || die "both rollback and forward recovery failed"
  die "rollback artifact failed; forward service was restored"
fi
transition_state rollback-starting rollback-live "${proof}"
publish_boot_eligibility rollback
printf 'Traffic rollback uses current database and canonical storage; no reverse sync or database restore occurred.\n'
