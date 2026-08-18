#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
require_root
require_pack_integrity
start_write_log prepare-git-auth-material
readonly AUTH_ROOT=/var/lib/thebusinesscircle/build/git-auth
readonly PRIVATE_KEY=${AUTH_ROOT}/github-deploy-key
readonly PUBLIC_KEY=${PRIVATE_KEY}.pub
[[ ! -e ${AUTH_ROOT} && ! -L ${AUTH_ROOT} ]] || die "Git authentication material already exists"
install -d -m 0710 -o root -g phase-f1-build "${AUTH_ROOT}"
/usr/bin/ssh-keygen -q -t ed25519 -N '' -C phase-f1-github-deploy-key -f "${PRIVATE_KEY}"
chown root:phase-f1-build "${PRIVATE_KEY}"; chmod 0440 "${PRIVATE_KEY}"
chown root:root "${PUBLIC_KEY}"; chmod 0444 "${PUBLIC_KEY}"
/usr/bin/sync -f "${PRIVATE_KEY}"; /usr/bin/sync -f "${PUBLIC_KEY}"; /usr/bin/sync -f "${AUTH_ROOT}"
/usr/bin/node "${PHASE_F1_PACK_DIR}/git-authentication.mjs" verify-material >/dev/null
printf 'GIT_AUTH_MATERIAL_PRESENT public-key-registration-required=true values-recorded=false\n'
