#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
require_root; require_application_sha rollback "${1:-}"; require_release_integrity; start_write_log adopt-systemd-boot-owner
proof_pointer="${PHASE_F1_STATE_ROOT}/latest-rollback-proof.path"; require_protected_state_file "${proof_pointer}"
proof=$(<"${proof_pointer}"); [[ ${proof} == "${PHASE_F1_STATE_ROOT}/rollback-proof-"*.json ]] || die "rollback proof path is outside state root"
/usr/bin/node "${PHASE_F1_PACK_DIR}/rollback-proof.mjs" verify "${proof}" "${PHASE_F1_ROLLBACK_SHA}" "${PHASE_F1_HISTORICAL_SHA}"
[[ $(systemctl is-active pm2-root.service 2>/dev/null || true) == inactive ]] || die "enabled-but-inactive PM2 unit status changed; stop for review"
[[ $(systemctl is-enabled pm2-root.service 2>/dev/null || true) == enabled ]] || die "recorded PM2 boot state changed"
[[ $(readlink -f "${PHASE_F1_CURRENT_BCN}") == "${PHASE_F1_ROLLBACK_DIR}" ]] || die "stable selector must already target verified rollback"
refresh_release_bindings rollback private
systemctl enable the-business-circle-network.service >/dev/null
[[ $(systemctl is-enabled the-business-circle-network.service) == enabled ]] || die "stable BCN unit is not enabled"
transition_state storage-converged rollback-boot-ready "${proof}"
publish_boot_eligibility rollback
# The atomic state transition makes stable systemd eligible while pm2-root remains ineligible.
/usr/bin/node "${PHASE_F1_PACK_DIR}/listener-verification.mjs" free 3000 || die "legacy PM2 did not release port 3000 during the frozen stage"
systemctl start the-business-circle-network.service
/usr/bin/node "${PHASE_F1_PACK_DIR}/verify-systemd-process.mjs" the-business-circle-network.service >/dev/null
"${PHASE_F1_PACK_DIR}/private-smoke-read-only.sh" "${PHASE_F1_ROLLBACK_SHA}" rollback-live
transition_state rollback-boot-ready rollback-live "${proof}"
publish_boot_eligibility rollback
evidence="${PHASE_F1_STATE_ROOT}/systemd-adoption-approved.evidence"; [[ ! -e ${evidence} ]] || die "adoption evidence collision"; printf 'rollbackProofSha256=%s\n' "$(sha256sum "${proof}" | awk '{print $1}')" >"${evidence}"; chmod 0600 "${evidence}"; chown root:root "${evidence}"
printf 'Systemd now owns BCN boot; PM2 evidence and the original dump were preserved unchanged.\n'
