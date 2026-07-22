#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
require_root; require_application_sha forward "${1:-}"; start_write_log record-traffic-switch
/usr/bin/node "${PHASE_F1_PACK_DIR}/validate-release-gates.mjs" "${PHASE_F1_STATE_ROOT}" forward >/dev/null
/usr/bin/node "${PHASE_F1_PACK_DIR}/validate-release-gates.mjs" "${PHASE_F1_STATE_ROOT}" rollback >/dev/null
cloudflare_evidence="${PHASE_F1_STATE_ROOT}/cloudflare-tls-approval.json"
tls_evidence="${PHASE_F1_STATE_ROOT}/origin-tls-rehearsal.evidence.json"
require_protected_state_file "${PHASE_F1_STATE_ROOT}/active-nginx-manifest.sha256"
require_protected_state_file "${tls_evidence}"
nginx_identity=$(sha256sum "${PHASE_F1_STATE_ROOT}/active-nginx-manifest.sha256" | awk '{print $1}')
tls_identity=$(sha256sum "${tls_evidence}" | awk '{print $1}')
certificate_fingerprint=$(/usr/bin/node -e 'const e=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));const f=e.originCertificateFingerprintSha256||e.certificateFingerprintSha256;if(!/^[0-9a-f]{64}$/.test(f||""))process.exit(1);process.stdout.write(f)' "${tls_evidence}") || die "TLS rehearsal certificate fingerprint is absent"
cloudflare_validation=$(/usr/bin/node "${PHASE_F1_PACK_DIR}/cloudflare-tls-evidence.mjs" validate "${cloudflare_evidence}" "${PHASE_F1_PACK_COMMIT}" "${nginx_identity}" "${tls_identity}" "${certificate_fingerprint}") || die "Cloudflare/TLS semantic approval failed"
cloudflare_sha=$(/usr/bin/node -e 'const v=JSON.parse(process.argv[1]);process.stdout.write(v.sha256)' "${cloudflare_validation}")
/usr/bin/node "${PHASE_F1_PACK_DIR}/structured-evidence.mjs" validate routing-active "${PHASE_F1_STATE_ROOT}/active-routing-evidence.json"
/usr/bin/node "${PHASE_F1_PACK_DIR}/structured-evidence.mjs" validate authenticated "${PHASE_F1_STATE_ROOT}/authenticated-smoke-evidence.json"
active_routing_nginx_identity=$(/usr/bin/node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));if(!/^[0-9a-f]{64}$/.test(p.nginxIdentity||""))process.exit(1);process.stdout.write(p.nginxIdentity)' "${PHASE_F1_STATE_ROOT}/active-routing-evidence.json") || die "active routing Nginx identity is invalid"
[[ ${active_routing_nginx_identity} == "${nginx_identity}" ]] || die "Cloudflare approval and active Nginx identity differ"
nginx -t || die "active Nginx syntax failed"
"${PHASE_F1_PACK_DIR}/post-switch-smoke-read-only.sh" "${PHASE_F1_FORWARD_SHA}"
bound="${PHASE_F1_STATE_ROOT}/traffic-switch-evidence.json"; [[ ! -e ${bound} && ! -L ${bound} ]] || die "traffic-switch evidence collision"
temporary=$(mktemp "${PHASE_F1_STATE_ROOT}/.traffic-switch.XXXXXXXX")
printf '{"schemaVersion":1,"kind":"traffic-switch","operationsIdentity":"%s","forwardApplicationSha":"%s","rollbackApplicationSha":"%s","artifactIdentity":"%s","systemdUnitIdentity":"%s","nginxIdentity":"%s","databaseIdentity":"%s","storageIdentity":"%s","executedAt":"%s","reviewer":"%s","authenticatedEvidenceSha256":"%s","cloudflareEvidenceSha256":"%s","cloudflareTlsNginxIdentity":"%s","cloudflareTlsRehearsalIdentity":"%s","routingEvidenceSha256":"%s","forwardRehearsalEvidenceSha256":"%s","rollbackRehearsalEvidenceSha256":"%s"}\n' \
  "${PHASE_F1_PACK_COMMIT}" "${PHASE_F1_FORWARD_SHA}" "${PHASE_F1_ROLLBACK_SHA}" \
  "$(sha256sum "${PHASE_F1_ARTIFACT_ROOT}/forward-bcn.artifact.json"|awk '{print $1}')" "$(sha256sum "${PHASE_F1_STATE_ROOT}/systemd-unit-manifest.sha256"|awk '{print $1}')" "${nginx_identity}" "$(sha256sum "${PHASE_F1_STATE_ROOT}/database-backup.evidence.json"|awk '{print $1}')" "$(sha256sum "${PHASE_F1_STATE_ROOT}/storage-manifest-index.sha256"|awk '{print $1}')" \
  "$(date -u +%Y-%m-%dT%H:%M:%S.%NZ)" "${PHASE_F1_EVIDENCE_REVIEWER:?reviewer identifier required}" \
  "$(sha256sum "${PHASE_F1_STATE_ROOT}/authenticated-smoke-evidence.json"|awk '{print $1}')" "${cloudflare_sha}" "${nginx_identity}" "${tls_identity}" "$(sha256sum "${PHASE_F1_STATE_ROOT}/active-routing-evidence.json"|awk '{print $1}')" "$(sha256sum "${PHASE_F1_STATE_ROOT}/forward-ubuntu-rehearsal-evidence.json"|awk '{print $1}')" "$(sha256sum "${PHASE_F1_STATE_ROOT}/rollback-ubuntu-rehearsal-evidence.json"|awk '{print $1}')" >"${temporary}"
chmod 0600 "${temporary}"; chown root:root "${temporary}"
/usr/bin/node "${PHASE_F1_PACK_DIR}/structured-evidence.mjs" validate traffic-switch "${temporary}"
mv -T "${temporary}" "${bound}"
/usr/bin/node "${PHASE_F1_PACK_DIR}/structured-evidence.mjs" validate traffic-switch "${bound}"
refresh_release_bindings forward public
/usr/bin/node "${PHASE_F1_PACK_DIR}/cloudflare-tls-evidence.mjs" validate "${cloudflare_evidence}" "${PHASE_F1_PACK_COMMIT}" "${nginx_identity}" "${tls_identity}" "${certificate_fingerprint}" >/dev/null || die "Cloudflare/TLS approval changed before transition"
transition_state forward-live traffic-switched "${bound}"
printf 'Public traffic switch was recorded only after Nginx, TLS, semantic and authenticated gates passed.\n'
