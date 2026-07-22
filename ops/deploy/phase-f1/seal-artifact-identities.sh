#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
require_root; require_application_sha forward "${1:-}"
require_protected_state_file "${PHASE_F1_STATE_ROOT}/storage-manifest-index.sha256"
for role in forward-bcn forward-circle-card rollback-bcn; do
  env -i HOME=/root PATH=/usr/local/bin:/usr/bin:/bin /usr/bin/node \
    "${PHASE_F1_PACK_DIR}/artifact-identity.mjs" "${role}" "${PHASE_F1_STATE_ROOT}" \
    "${PHASE_F1_ARTIFACT_ROOT}" "${PHASE_F1_PACK_COMMIT}" >/dev/null
  chmod 0600 "${PHASE_F1_ARTIFACT_ROOT}/${role}.artifact.json"
  chown root:root "${PHASE_F1_ARTIFACT_ROOT}/${role}.artifact.json"
done
printf 'Forward BCN, forward Circle Card and rollback BCN artifact identities are sealed.\n'
