#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

require_root
require_application_sha forward "${1:-}"
start_write_log prepare-identities

ensure_group() { getent group "$1" >/dev/null || groupadd --system "$1"; }
ensure_user() {
  local user=$1 group=$2 home=$3 expected_groups=$4
  if ! getent passwd "${user}" >/dev/null; then
    useradd --system --gid "${group}" --home-dir "${home}" --shell /usr/sbin/nologin --no-create-home "${user}"
  fi
  [[ $(id -u "${user}") -ne 0 && $(id -gn "${user}") == "${group}" ]] || die "unsafe identity: ${user}"
  [[ $(getent passwd "${user}" | cut -d: -f6,7) == "${home}:/usr/sbin/nologin" ]] || die "unsafe account properties: ${user}"
  usermod --groups "${expected_groups}" "${user}"
  mapfile -t actual < <(id -nG "${user}" | tr ' ' '\n' | sort)
  mapfile -t expected < <(printf '%s\n' "${group}" ${expected_groups//,/ } | sort)
  [[ "${actual[*]}" == "${expected[*]}" ]] || die "unexpected supplementary groups for ${user}"
}

for group in bcn-app circle-card-app phase-f1-build circle-public circle-card-private; do ensure_group "${group}"; done
ensure_user bcn-app bcn-app /var/lib/thebusinesscircle/bcn-app circle-public,circle-card-private
ensure_user circle-card-app circle-card-app /var/lib/thebusinesscircle/circle-card-app circle-public,circle-card-private
ensure_user phase-f1-build phase-f1-build /var/lib/thebusinesscircle/build ""

for entry in bcn-app:bcn-app:/var/lib/thebusinesscircle/bcn-app \
  circle-card-app:circle-card-app:/var/lib/thebusinesscircle/circle-card-app \
  phase-f1-build:phase-f1-build:/var/lib/thebusinesscircle/build; do
  IFS=: read -r owner group path <<<"${entry}"
  assert_no_symlink_components "${path}"
  install -d -m 0750 -o "${owner}" -g "${group}" "${path}"
done
install -d -m 0700 -o root -g root "${PHASE_F1_STATE_ROOT}" "${PHASE_F1_LOG_ROOT}"
printf 'Exact unprivileged identities are prepared; systemd will launch them directly.\n'
