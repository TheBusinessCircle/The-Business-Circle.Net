#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
require_root
require_pack_integrity
start_write_log recover-git-auth-material
/usr/bin/node "${PHASE_F1_PACK_DIR}/git-authentication.mjs" recover-partial
