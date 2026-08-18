#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
require_root
readonly ROLE=${2:-}
require_application_sha "${ROLE}" "${1:-}"
require_environment_ready
start_write_log "prepare-${ROLE}-fresh-checkout"

[[ -d ${PHASE_F1_LIVE_DIR}/.git ]] || die "legacy origin checkout is unavailable"
origin=$(git -C "${PHASE_F1_LIVE_DIR}" remote get-url origin)
transport=$(/usr/bin/node "${PHASE_F1_PACK_DIR}/git-transport-trust.mjs" origin "${origin}") ||
  die "exact approved Git origin required"
git_ssh_command=""
if [[ ${transport} == ssh ]]; then
  /usr/bin/node "${PHASE_F1_PACK_DIR}/git-authentication.mjs" verify-ready "${PHASE_F1_PACK_COMMIT}" >/dev/null ||
    die "GIT_AUTH_NOT_READY"
  git_ssh_command=$(/usr/bin/node "${PHASE_F1_PACK_DIR}/git-transport-trust.mjs" verify "${PHASE_F1_PACK_DIR}") ||
    die "approved Git transport trust is unavailable"
elif [[ ${transport} != https ]]; then
  die "unsupported approved Git transport"
fi
git_as_build_user() {
  local -a environment=(
    HOME=/var/lib/thebusinesscircle/build
    PATH=/usr/local/bin:/usr/bin:/bin
    GIT_CONFIG_NOSYSTEM=1
    GIT_CONFIG_GLOBAL=/dev/null
    GIT_CONFIG_SYSTEM=/dev/null
    GIT_TERMINAL_PROMPT=0
  )
  if [[ ${transport} == ssh ]]; then
    environment+=("GIT_SSH_COMMAND=${git_ssh_command}" GIT_SSH_VARIANT=ssh)
  fi
  sudo -u phase-f1-build env -i "${environment[@]}" git "$@"
}
assert_no_symlink_components "${PHASE_F1_BUILD_ROOT}"
install -d -m 0755 -o root -g root "${PHASE_F1_BUILD_ROOT}"
case "${ROLE}" in
  forward) application_sha=${PHASE_F1_FORWARD_SHA} ;;
  rollback) application_sha=${PHASE_F1_ROLLBACK_SHA} ;;
  *) die "checkout role must be forward or rollback" ;;
esac
attempt="${PHASE_F1_BUILD_ROOT}/${ROLE}-${application_sha}-$(date -u +%Y%m%dT%H%M%S.%NZ)-$(openssl rand -hex 8)"
checkout_verified=false
cleanup_failed_checkout() {
  local status=$?
  trap - EXIT ERR INT TERM
  if ((status)) && [[ ${checkout_verified} != true && -n ${attempt} && -d ${attempt} && ! -L ${attempt} ]]; then
    /usr/bin/node "${PHASE_F1_PACK_DIR}/failed-checkout-cleanup.mjs" cleanup \
      "${attempt}" "${ROLE}" "${application_sha}" "${PHASE_F1_PACK_COMMIT}" || status=1
  fi
  exit "${status}"
}
trap cleanup_failed_checkout EXIT ERR INT TERM
[[ ! -e ${attempt} && ! -L ${attempt} ]] || die "fresh build path collision"
install -d -m 0750 -o phase-f1-build -g phase-f1-build "${attempt}"
git_as_build_user clone --no-checkout -- "${origin}" "${attempt}"
git_as_build_user -C "${attempt}" fetch --depth=2 origin "${application_sha}"
git_as_build_user -C "${attempt}" checkout --detach "${application_sha}"
[[ $(git -C "${attempt}" rev-parse HEAD) == "${application_sha}" && -z $(git -C "${attempt}" status --porcelain --untracked-files=all) ]] || die "fresh checkout identity failed"
identity_evidence="${PHASE_F1_STATE_ROOT}/${ROLE}-application-identity.json"
[[ ! -e ${identity_evidence} && ! -L ${identity_evidence} ]] || die "application identity evidence already exists"
env -i HOME=/root PATH=/usr/local/bin:/usr/bin:/bin /usr/bin/node \
  "${PHASE_F1_PACK_DIR}/application-identities.mjs" verify "${ROLE}" "${attempt}" "${identity_evidence}" >/dev/null
chmod 0600 "${identity_evidence}"; chown root:root "${identity_evidence}"
checkout_verified=true
evidence="${PHASE_F1_STATE_ROOT}/${ROLE}-build-attempt.json"
[[ ! -e ${evidence} ]] || die "an earlier build attempt must be retired, never reused"
/usr/bin/node "${PHASE_F1_PACK_DIR}/artifact-manifest.mjs" build-inputs "${attempt}" fresh >/dev/null
/usr/bin/node "${PHASE_F1_PACK_DIR}/build-state.mjs" create "${evidence}" "${ROLE}" "${application_sha}" "${PHASE_F1_PACK_COMMIT}" "${attempt}"
chmod 0600 "${evidence}"; chown root:root "${evidence}"
trap - EXIT ERR INT TERM
printf 'Fresh detached %s build attempt prepared at exact application SHA %s.\n' "${ROLE}" "${application_sha}"
