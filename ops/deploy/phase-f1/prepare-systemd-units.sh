#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
require_root; require_application_sha forward "${1:-}"; start_write_log prepare-systemd-units
[[ $(systemd --version | head -1) =~ ^systemd\ 249 ]] || die "Ubuntu 22.04 systemd 249 must be reviewed before unit installation"
source_dir="${PHASE_F1_PACK_DIR}/systemd"; evidence="${PHASE_F1_STATE_ROOT}/systemd-unit-manifest.sha256"
render_dir=$(mktemp -d "${PHASE_F1_STATE_ROOT}/.rendered-units.XXXXXXXX")
cleanup_render() { rm -rf --one-file-system -- "${render_dir}"; }
trap cleanup_render EXIT
for unit in the-business-circle-network.service circle-card.service the-business-circle-network-candidate.service the-business-circle-network-rollback-probe.service; do
  /usr/bin/node "${PHASE_F1_PACK_DIR}/render-systemd-units.mjs" "${source_dir}/${unit}" "${PHASE_F1_PACK_COMMIT}" "${render_dir}/${unit}" >/dev/null
  systemd-analyze verify "${render_dir}/${unit}" >/dev/null || die "systemd unit validation failed: ${unit}"
  target="/etc/systemd/system/${unit}"; [[ ! -e ${target} && ! -L ${target} ]] || die "refusing to overwrite existing unit: ${target}"
  install -m 0644 -o root -g root "${render_dir}/${unit}" "${target}"
done
dropin=/etc/systemd/system/pm2-root.service.d; assert_no_symlink_components "${dropin}"; install -d -m 0755 -o root -g root "${dropin}"
[[ ! -e ${dropin}/phase-f1-handoff.conf ]] || die "PM2 handoff drop-in already exists"
/usr/bin/node "${PHASE_F1_PACK_DIR}/render-systemd-units.mjs" "${source_dir}/pm2-root.service.d/phase-f1-handoff.conf" "${PHASE_F1_PACK_COMMIT}" "${render_dir}/phase-f1-handoff.conf" >/dev/null
install -m 0644 -o root -g root "${render_dir}/phase-f1-handoff.conf" "${dropin}/phase-f1-handoff.conf"
(cd /etc/systemd/system && sha256sum -- the-business-circle-network.service circle-card.service the-business-circle-network-candidate.service the-business-circle-network-rollback-probe.service pm2-root.service.d/phase-f1-handoff.conf >"${evidence}")
printf '%s  %s\n' "$(systemctl cat pm2-root.service | sha256sum | awk '{print $1}')" "systemctl-cat:pm2-root.service" >>"${evidence}"
chmod 0600 "${evidence}"; chown root:root "${evidence}"
systemctl daemon-reload
for unit in the-business-circle-network.service circle-card.service the-business-circle-network-candidate.service the-business-circle-network-rollback-probe.service pm2-root.service; do systemd-analyze verify "${unit}" >/dev/null || die "installed unit/drop-in validation failed: ${unit}"; done
trap - EXIT; cleanup_render
printf 'Units and the checksummed-state PM2 handoff condition are installed; no service was started, stopped, or restarted.\n'
