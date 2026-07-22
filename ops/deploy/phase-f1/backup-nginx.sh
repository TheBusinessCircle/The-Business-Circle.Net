#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
require_root; require_application_sha forward "${1:-}"
[[ -f ${PHASE_F1_STATE_ROOT}/nginx-change-freeze.approved ]] || die "explicit Nginx configuration-change freeze evidence required"
exec 9>/run/lock/thebusinesscircle-nginx-config.lock; flock -n 9 || die "Nginx configuration lock is busy"
[[ -d /etc/nginx && ! -L /etc/nginx && -f /etc/nginx/nginx.conf && ! -L /etc/nginx/nginx.conf ]] || die "unsafe Nginx root"
nginx -t || die "invalid baseline cannot be backed up"; start_write_log backup-nginx
root=/var/backups/thebusinesscircle/nginx; assert_no_symlink_components "${root}"; install -d -m 0700 -o root -g root "${root}"
stamp=$(date -u +%Y%m%dT%H%M%S.%NZ); archive="${root}/nginx-${stamp}.tar"; pre="${root}/nginx-${stamp}.pre.manifest"; post="${root}/nginx-${stamp}.post.manifest"; metadata="${root}/nginx-${stamp}.dependency-evidence.json"
for target in "${archive}" "${pre}" "${post}" "${metadata}"; do [[ ! -e ${target} && ! -L ${target} ]] || die "exclusive Nginx backup collision"; done
manifest() { local base=${1:-/etc/nginx}; find "${base}" -xdev \( -type f -o -type l \) -print0 | sort -z | while IFS= read -r -d '' path; do if [[ -L ${path} ]]; then printf 'L %s %s\n' "$(readlink "${path}")" "${path#${base}/}"; else printf 'F %s %s\n' "$(sha256sum "${path}" | awk '{print $1}')" "${path#${base}/}"; fi; done; }
manifest >"${pre}"
capture_root=$(mktemp -d "${root}/.capture-${stamp}.XXXXXXXX"); rmdir "${capture_root}"
/usr/bin/node "${PHASE_F1_PACK_DIR}/nginx-dependency-closure.mjs" capture /etc/nginx/nginx.conf "${capture_root}" "${metadata}"
chmod 0700 "${capture_root}"; chown -hR root:root "${capture_root}"; chmod 0600 "${metadata}"; chown root:root "${metadata}"
tar --create --file="${archive}" --directory="${capture_root}" .
manifest >"${post}"; cmp --silent "${pre}" "${post}" || die "Nginx files changed during backup"
tar --list --file="${archive}" >/dev/null || die "archive listing failed"
verify_dir=$(mktemp -d "${root}/.verify.XXXXXXXX"); trap 'rm -rf --one-file-system "${verify_dir}" "${capture_root}"' EXIT
tar --extract --file="${archive}" --directory="${verify_dir}"
/usr/bin/node "${PHASE_F1_PACK_DIR}/nginx-dependency-closure.mjs" verify "${verify_dir}" "${metadata}" || die "captured Nginx dependency closure is incomplete or altered"
entry=$(/usr/bin/node -e 'const e=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));if(!/^[a-zA-Z0-9._\/-]+$/.test(e.entry))process.exit(1);process.stdout.write(e.entry)' "${metadata}") || die "captured Nginx entry is invalid"
install -d -m 0700 "${verify_dir}/phase-f1-dependencies/root/var/log/nginx" "${verify_dir}/phase-f1-dependencies/root/run" "${verify_dir}/phase-f1-dependencies/root/var/lib/nginx"
nginx -t -p "${verify_dir}/" -c "${entry}" || die "extracted Nginx snapshot failed isolated staged validation"
manifest >"${verify_dir}/live-after-validation.manifest"; cmp --silent "${post}" "${verify_dir}/live-after-validation.manifest" || die "staged validation touched live Nginx configuration"
rm -rf --one-file-system "${capture_root}"
chmod 0600 "${archive}" "${pre}" "${post}" "${metadata}"; chown root:root "${archive}" "${pre}" "${post}" "${metadata}"
(cd "${root}" && sha256sum -- "$(basename "${archive}")" "$(basename "${pre}")" "$(basename "${metadata}")" >"nginx-${stamp}.sha256")
printf 'Syntax-valid, pre/post-identical Nginx baseline passed isolated extracted-snapshot validation.\n'
