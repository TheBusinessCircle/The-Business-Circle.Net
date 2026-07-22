#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
require_root; require_application_sha forward "${1:-}"; start_write_log record-active-routing-evidence
stage=$(/usr/bin/node "${PHASE_F1_PACK_DIR}/deployment-state.mjs" read "${PHASE_F1_STATE_ROOT}" | /usr/bin/node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>process.stdout.write(JSON.parse(s).stage))')
[[ ${stage} == forward-live ]] || die "active routing evidence requires forward-live before public state publication"
require_protected_state_file "${PHASE_F1_STATE_ROOT}/active-nginx-manifest.sha256"
nginx -t || die "active Nginx syntax failed"
env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=/root /usr/bin/node "${PHASE_F1_PACK_DIR}/smoke-http.mjs" public both
evidence="${PHASE_F1_STATE_ROOT}/active-routing-evidence.json"; [[ ! -e ${evidence} && ! -L ${evidence} ]] || die "active routing evidence already exists"
temporary=$(mktemp "${PHASE_F1_STATE_ROOT}/.active-routing.XXXXXXXX")
printf '{"schemaVersion":1,"kind":"routing-active","operationsIdentity":"%s","forwardApplicationSha":"%s","rollbackApplicationSha":"%s","artifactIdentity":"%s","systemdUnitIdentity":"%s","nginxIdentity":"%s","databaseIdentity":"%s","storageIdentity":"%s","executedAt":"%s","reviewer":"%s","bcnHomepagePassed":true,"bcnWebhookPassed":true,"cacheBypassPassed":true,"circleCardPassed":true,"circleOwnerRouteMatrixPassed":true,"circleTrafficEnabled":true,"hostRejectionPassed":true,"mutatingHttpNeverRedirected":true,"nginxSyntaxPassed":true}\n' \
  "${PHASE_F1_PACK_COMMIT}" "${PHASE_F1_FORWARD_SHA}" "${PHASE_F1_ROLLBACK_SHA}" \
  "$(sha256sum "${PHASE_F1_ARTIFACT_ROOT}/forward-bcn.artifact.json"|awk '{print $1}')" "$(sha256sum "${PHASE_F1_STATE_ROOT}/systemd-unit-manifest.sha256"|awk '{print $1}')" "$(sha256sum "${PHASE_F1_STATE_ROOT}/active-nginx-manifest.sha256"|awk '{print $1}')" "$(sha256sum "${PHASE_F1_STATE_ROOT}/database-backup.evidence.json"|awk '{print $1}')" "$(sha256sum "${PHASE_F1_STATE_ROOT}/storage-manifest-index.sha256"|awk '{print $1}')" \
  "$(date -u +%Y-%m-%dT%H:%M:%S.%NZ)" "${PHASE_F1_EVIDENCE_REVIEWER:?reviewer identifier required}" >"${temporary}"
chmod 0600 "${temporary}"; chown root:root "${temporary}"
/usr/bin/node "${PHASE_F1_PACK_DIR}/structured-evidence.mjs" validate routing-active "${temporary}"
mv -T "${temporary}" "${evidence}"
/usr/bin/node "${PHASE_F1_PACK_DIR}/structured-evidence.mjs" validate routing-active "${evidence}"
printf 'Strict active public-routing evidence was published; durable traffic state is unchanged.\n'
