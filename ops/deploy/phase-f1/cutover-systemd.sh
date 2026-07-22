#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
require_root; require_application_sha forward "${1:-}"; require_release_integrity; start_write_log cutover-systemd
proof_pointer="${PHASE_F1_STATE_ROOT}/latest-rollback-proof.path"; require_protected_state_file "${proof_pointer}"; proof=$(<"${proof_pointer}"); [[ ${proof} == "${PHASE_F1_STATE_ROOT}/rollback-proof-"*.json ]] || die "unsafe rollback proof path"; /usr/bin/node "${PHASE_F1_PACK_DIR}/rollback-proof.mjs" verify "${proof}" "${PHASE_F1_ROLLBACK_SHA}" "${PHASE_F1_HISTORICAL_SHA}"

atomic_selector() { local selector=$1 target=$2 parent temp; parent=$(dirname "${selector}"); [[ $(realpath -e "${target}") == "${target}" ]] || die "selector target not canonical"; temp="${parent}/.$(basename "${selector}").$(openssl rand -hex 8)"; ln -s "${target}" "${temp}"; mv -T "${temp}" "${selector}"; [[ $(readlink -f "${selector}") == "${target}" ]] || die "selector switch failed"; }
restore_rollback() {
  local from=$1 actual
  systemctl stop circle-card.service 2>/dev/null || true
  atomic_selector "${PHASE_F1_CURRENT_BCN}" "${PHASE_F1_ROLLBACK_DIR}"
  refresh_release_bindings rollback disabled
  actual=$(/usr/bin/node "${PHASE_F1_PACK_DIR}/deployment-state.mjs" read "${PHASE_F1_STATE_ROOT}" | /usr/bin/node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>process.stdout.write(JSON.parse(s).stage))')
  [[ ${actual} == "${from}" || ${actual} == forward-bcn-switch-pending || ${actual} == forward-bcn-starting || ${actual} == forward-bcn-live ]] || die "cannot recover rollback from unexpected durable state: ${actual}"
  transition_state "${actual}" rollback-live "${proof}"
  publish_boot_eligibility rollback
  systemctl restart the-business-circle-network.service || die "forward recovery failed and verified rollback could not restart"
  /usr/bin/node "${PHASE_F1_PACK_DIR}/verify-systemd-process.mjs" the-business-circle-network.service >/dev/null || die "rollback process verification failed"
  "${PHASE_F1_PACK_DIR}/private-smoke-read-only.sh" "${PHASE_F1_ROLLBACK_SHA}" rollback-live || die "rollback health failed"
}

[[ -f ${PHASE_F1_STATE_ROOT}/systemd-adoption-approved.evidence ]] || die "PM2-to-systemd adoption evidence missing"
current_stage=$(/usr/bin/node "${PHASE_F1_PACK_DIR}/deployment-state.mjs" read "${PHASE_F1_STATE_ROOT}" | /usr/bin/node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>process.stdout.write(JSON.parse(s).stage))')
if [[ ${current_stage} == forward-bcn-switch-pending || ${current_stage} == forward-bcn-starting ]]; then
  restore_rollback "${current_stage}"
  current_stage=rollback-live
fi
[[ ${current_stage} == rollback-live ]] || die "forward cutover requires rollback-live durable state"
[[ $(readlink -f "${PHASE_F1_CURRENT_BCN}") == "${PHASE_F1_ROLLBACK_DIR}" ]] || die "verified rollback must be live before forward switch"
refresh_release_bindings rollback disabled
transition_state rollback-live forward-bcn-switch-pending "${proof}"
publish_boot_eligibility rollback
atomic_selector "${PHASE_F1_CURRENT_BCN}" "${PHASE_F1_RELEASE_DIR}"
refresh_release_bindings forward private
if ! transition_state forward-bcn-switch-pending forward-bcn-starting "${PHASE_F1_ARTIFACT_ROOT}/manifest-index.sha256"; then atomic_selector "${PHASE_F1_CURRENT_BCN}" "${PHASE_F1_ROLLBACK_DIR}"; refresh_release_bindings rollback disabled; transition_state forward-bcn-switch-pending rollback-live "${proof}"; publish_boot_eligibility rollback; die "durable forward-start transition failed; selector and state restored"; fi
publish_boot_eligibility forward
if ! systemctl restart the-business-circle-network.service || ! /usr/bin/node "${PHASE_F1_PACK_DIR}/verify-systemd-process.mjs" the-business-circle-network.service >/dev/null || ! "${PHASE_F1_PACK_DIR}/private-smoke-read-only.sh" "${PHASE_F1_FORWARD_SHA}" forward-live; then restore_rollback forward-bcn-starting; die "forward BCN failed; verified rollback restored"; fi
transition_state forward-bcn-starting forward-bcn-live "${PHASE_F1_ARTIFACT_ROOT}/manifest-index.sha256" || { restore_rollback forward-bcn-starting; die "forward BCN verification could not be durably recorded"; }
publish_boot_eligibility forward
if ! systemctl enable circle-card.service >/dev/null || ! systemctl start circle-card.service || ! /usr/bin/node "${PHASE_F1_PACK_DIR}/verify-systemd-process.mjs" circle-card.service >/dev/null || ! "${PHASE_F1_PACK_DIR}/private-smoke-read-only.sh" "${PHASE_F1_FORWARD_SHA}" circle-only; then restore_rollback forward-bcn-live; die "Circle Card private start failed; verified rollback restored"; fi
refresh_release_bindings forward private
transition_state forward-bcn-live forward-live "${PHASE_F1_ARTIFACT_ROOT}/manifest-index.sha256" || { restore_rollback forward-bcn-live; die "forward dual-runtime state transition failed"; }
publish_boot_eligibility forward
printf 'Stable BCN and private Circle Card run approved forward artifacts; public traffic is unchanged.\n'
