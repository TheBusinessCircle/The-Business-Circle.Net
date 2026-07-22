#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
require_root; require_application_sha rollback "${1:-}"; start_write_log remove-circle-card-traffic
current_stage=$(/usr/bin/node "${PHASE_F1_PACK_DIR}/deployment-state.mjs" read "${PHASE_F1_STATE_ROOT}" | /usr/bin/node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>process.stdout.write(JSON.parse(s).stage))')
[[ ${current_stage} == forward-live || ${current_stage} == traffic-switched || ${current_stage} == finalized ]] || die "Circle traffic removal requires a forward state"
enabled=/etc/nginx/sites-enabled/circlecard.co.uk
[[ -L ${enabled} && $(readlink -f "${enabled}") == /etc/nginx/sites-available/circlecard.co.uk ]] || die "active Circle Card Nginx link differs from the reviewed path"
disabled="${PHASE_F1_STATE_ROOT}/circlecard.co.uk.enabled-symlink"
[[ ! -e ${disabled} && ! -L ${disabled} ]] || die "Circle routing-removal evidence already exists"
nginx -t || die "active Nginx configuration is invalid"
mv -T "${enabled}" "${disabled}"
durable_removal=false
restore_link() { local status=$?; trap - EXIT INT TERM; if ((status)) && [[ ${durable_removal} != true && -L ${disabled} && ! -e ${enabled} ]]; then mv -T "${disabled}" "${enabled}"; nginx -t && systemctl reload nginx || status=1; fi; exit "${status}"; }
trap restore_link EXIT INT TERM
nginx -t || die "no-Circle Nginx configuration is invalid"
systemctl reload nginx || die "no-Circle Nginx reload failed"
circle_status=$(curl -kfsS --path-as-is --resolve circlecard.co.uk:443:127.0.0.1 -H 'Cache-Control: no-cache' -o /dev/null -w '%{http_code}' "https://circlecard.co.uk/?phase-f1-cache-bypass=$(openssl rand -hex 12)" || true)
[[ ${circle_status} == 421 || ${circle_status} == 404 ]] || die "Circle Card remains publicly routed at the origin"
bcn_status=$(curl -kfsS --path-as-is --resolve thebusinesscircle.net:443:127.0.0.1 -H 'Cache-Control: no-cache' -o /dev/null -w '%{http_code}' "https://thebusinesscircle.net/?phase-f1-cache-bypass=$(openssl rand -hex 12)" || true)
[[ ${bcn_status} =~ ^(200|307|308)$ ]] || die "BCN homepage failed after Circle route removal"
webhook_status=$(curl -ksS --path-as-is --resolve thebusinesscircle.net:443:127.0.0.1 -H 'Cache-Control: no-cache' -H 'Content-Type: application/json' -H 'Stripe-Signature: invalid-phase-f1' --data '{}' -o /dev/null -w '%{http_code}' https://thebusinesscircle.net/api/stripe/webhook)
[[ ${webhook_status} == 400 ]] || die "BCN webhook baseline failed after Circle route removal"
refresh_release_bindings forward disabled
evidence="${PHASE_F1_STATE_ROOT}/circle-traffic-removed-evidence.json"; temporary=$(mktemp "${PHASE_F1_STATE_ROOT}/.circle-traffic.XXXXXXXX")
printf '{"schemaVersion":1,"kind":"routing-removed","operationsIdentity":"%s","forwardApplicationSha":"%s","rollbackApplicationSha":"%s","artifactIdentity":"%s","systemdUnitIdentity":"%s","nginxIdentity":"%s","databaseIdentity":"%s","storageIdentity":"%s","executedAt":"%s","reviewer":"%s","bcnHomepagePassed":true,"bcnWebhookPassed":true,"circleTrafficRemoved":true,"nginxSyntaxPassed":true,"publicRouteProbePassed":true}\n' \
  "${PHASE_F1_PACK_COMMIT}" "${PHASE_F1_FORWARD_SHA}" "${PHASE_F1_ROLLBACK_SHA}" "$(sha256sum "${PHASE_F1_ARTIFACT_ROOT}/forward-bcn.artifact.json"|awk '{print $1}')" "$(sha256sum "${PHASE_F1_STATE_ROOT}/systemd-unit-manifest.sha256"|awk '{print $1}')" "$(sha256sum "${disabled}"|awk '{print $1}')" "$(sha256sum "${PHASE_F1_STATE_ROOT}/database-backup.evidence.json"|awk '{print $1}')" "$(sha256sum "${PHASE_F1_STATE_ROOT}/storage-manifest-index.sha256"|awk '{print $1}')" "$(date -u +%Y-%m-%dT%H:%M:%S.%NZ)" "${PHASE_F1_EVIDENCE_REVIEWER:?reviewer identifier required}" >"${temporary}"
chmod 0600 "${temporary}"; chown root:root "${temporary}"; /usr/bin/node "${PHASE_F1_PACK_DIR}/structured-evidence.mjs" validate routing-removed "${temporary}"; mv -T "${temporary}" "${evidence}"
transition_state "${current_stage}" circle-traffic-removed "${evidence}"
durable_removal=true
publish_boot_eligibility forward
trap - EXIT INT TERM
printf 'Circle Card routing was removed and BCN/webhook remained healthy; the Circle service is still running.\n'
