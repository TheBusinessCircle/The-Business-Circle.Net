#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
require_root
require_pack_integrity
readonly ORIGIN=git@github.com:TheBusinessCircle/The-Business-Circle.Net.git
identity=$(/usr/bin/node "${PHASE_F1_PACK_DIR}/git-authentication.mjs" verify-material >/dev/null && printf '%s' /var/lib/thebusinesscircle/build/git-auth/github-deploy-key)
ssh_command=$(/usr/bin/node "${PHASE_F1_PACK_DIR}/git-transport-trust.mjs" verify "${PHASE_F1_PACK_DIR}" "${identity}")
sudo -u phase-f1-build env -i HOME=/var/lib/thebusinesscircle/build PATH=/usr/local/bin:/usr/bin:/bin GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null GIT_TERMINAL_PROMPT=0 GIT_SSH_COMMAND="${ssh_command}" GIT_SSH_VARIANT=ssh \
  git ls-remote --exit-code -- "${ORIGIN}" HEAD 2>/dev/null | grep -Eq '^[0-9a-f]{40}[[:space:]]+HEAD$' || die "GIT_AUTH_GITHUB_AUTHORIZATION_UNVERIFIED"
/usr/bin/node "${PHASE_F1_PACK_DIR}/git-authentication.mjs" publish-ready "${PHASE_F1_PACK_COMMIT}"
