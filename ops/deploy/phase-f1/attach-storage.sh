#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
require_root
readonly ARTIFACT=${2:-} KIND=${3:-}
[[ ${KIND} == forward || ${KIND} == rollback ]] || die "kind must be forward or rollback"
require_application_sha "${KIND}" "${1:-}"
[[ -d ${ARTIFACT} && ! -L ${ARTIFACT} ]] || die "artifact must be a real directory"
canonical=$(realpath -e "${ARTIFACT}")
[[ ${canonical} == "${PHASE_F1_RELEASE_DIR}" || ${canonical} == "${PHASE_F1_ROLLBACK_DIR}" ]] || die "unapproved artifact"
start_write_log "attach-storage-${KIND}"

link_tree() {
  local relative=$1 target=$2 path="${canonical}/$1"
  [[ -d ${target} && ! -L ${target} && $(realpath -e "${target}") == "${target}" ]] || die "invalid canonical storage target"
  if [[ -L ${path} ]]; then [[ $(readlink -f "${path}") == "${target}" ]] || die "wrong persistent link"; return; fi
  [[ -d ${path} && -z $(find "${path}" -mindepth 1 -print -quit) ]] || die "artifact persistent path is not empty"
  rmdir "${path}"; ln -s "${target}" "${path}"
  [[ $(readlink -f "${path}") == "${target}" ]] || die "persistent link verification failed"
}
link_tree public/uploads "${PHASE_F1_PUBLIC_ROOT}"
link_tree .uploads "${PHASE_F1_PRIVATE_ROOT}"
link_tree public/generated/community-source-previews "${PHASE_F1_PREVIEW_ROOT}"

# Phase E2 disables all Next disk persistence. No generic cache directory is writable.
find -P "${canonical}" -xdev -type d -exec chmod 0555 {} +
find -P "${canonical}" -xdev -type f -perm /111 -exec chmod 0555 {} +
find -P "${canonical}" -xdev -type f ! -perm /111 -exec chmod 0444 {} +
find -P "${canonical}" -xdev \( -type d -o -type f \) -exec chown root:root {} +
printf '%s artifact is immutable and uses the canonical storage roots.\n' "${KIND}"
