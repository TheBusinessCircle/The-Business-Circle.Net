#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

require_root
require_application_sha forward "${1:-}"
readonly CERTIFICATE=${2:-}
readonly PRIVATE_KEY=${3:-}
readonly CA_FILE=${4:-}
[[ -f ${CERTIFICATE} && ! -L ${CERTIFICATE} && -f ${PRIVATE_KEY} && ! -L ${PRIVATE_KEY} &&
   -f ${CA_FILE} && ! -L ${CA_FILE} ]] || die "reviewed certificate, key and CA files are required"
require_port_free 8443
circle_pid=$(systemctl show circle-card.service -p MainPID --value)
[[ ${circle_pid} =~ ^[0-9]+$ && ${circle_pid} -gt 1 ]] || die "Circle systemd MainPID is unavailable"
/usr/bin/node "${PHASE_F1_PACK_DIR}/listener-verification.mjs" verify 3200 "${circle_pid}"
start_write_log "local-origin-tls-stage"

readonly STATE_ROOT="${PHASE_F1_STATE_ROOT}/origin-tls-test"
assert_no_symlink_components "${STATE_ROOT}"
[[ ! -e ${STATE_ROOT} && ! -L ${STATE_ROOT} ]] || die "stale local TLS test state requires investigation"
install -d -m 0700 -o root -g root "${STATE_ROOT}"
readonly CONFIG="${STATE_ROOT}/nginx.conf"

TEMPLATE="${PHASE_F1_PACK_DIR}/nginx-circle-card-origin-test.conf.example" \
OUTPUT="${CONFIG}" STATE_ROOT="${STATE_ROOT}" CERTIFICATE="${CERTIFICATE}" PRIVATE_KEY="${PRIVATE_KEY}" \
  /usr/bin/node <<'NODE'
const { lstatSync, readFileSync, realpathSync, writeFileSync } = require("node:fs");
for (const name of ["CERTIFICATE", "PRIVATE_KEY"]) {
  const value = process.env[name];
  const stats = lstatSync(value);
  if (!value.startsWith("/etc/") || !stats.isFile() || stats.isSymbolicLink() || realpathSync(value) !== value || /[\r\n\0]/.test(value)) {
    throw new Error(`Unsafe ${name} path.`);
  }
}
let body = readFileSync(process.env.TEMPLATE, "utf8");
for (const [token, value] of [
  ["__STATE_ROOT__", process.env.STATE_ROOT],
  ["__CERTIFICATE__", process.env.CERTIFICATE],
  ["__PRIVATE_KEY__", process.env.PRIVATE_KEY]
]) body = body.replaceAll(token, value);
if (/__[A-Z_]+__/.test(body)) throw new Error("Unresolved local TLS template token.");
writeFileSync(process.env.OUTPUT, body, { flag: "wx", mode: 0o600 });
NODE

nginx -t -p "${STATE_ROOT}/" -c "${CONFIG}"
TEST_PID=""
cleanup() {
  local failed=0
  if [[ -n ${TEST_PID} && -d /proc/${TEST_PID} ]]; then
    kill -QUIT "${TEST_PID}" || failed=1
    for _ in {1..100}; do [[ ! -d /proc/${TEST_PID} ]] && break; sleep 0.1; done
    [[ ! -d /proc/${TEST_PID} ]] || failed=1
  fi
  /usr/bin/node "${PHASE_F1_PACK_DIR}/listener-verification.mjs" free 8443 || failed=1
  ((failed == 0))
}
on_exit() { local status=$?; trap - EXIT ERR INT TERM; cleanup || status=1; exit "${status}"; }
trap on_exit EXIT ERR INT TERM
nginx -p "${STATE_ROOT}/" -c "${CONFIG}"
TEST_PID=$(<"${STATE_ROOT}/nginx.pid")
[[ ${TEST_PID} =~ ^[0-9]+$ && -d /proc/${TEST_PID} ]] || die "temporary Nginx PID was not recorded"
/usr/bin/node "${PHASE_F1_PACK_DIR}/listener-verification.mjs" verify 8443 "${TEST_PID}"
"${PHASE_F1_PACK_DIR}/origin-tls-smoke.sh" "${PHASE_F1_FORWARD_SHA}" \
  "${CERTIFICATE}" "${PRIVATE_KEY}" "${CA_FILE}"
cleanup || die "temporary TLS listener cleanup failed; evidence preserved"
trap - EXIT ERR INT TERM
tls_evidence="${PHASE_F1_STATE_ROOT}/origin-tls-rehearsal.evidence.json"; [[ ! -e ${tls_evidence} && ! -L ${tls_evidence} ]] || die "origin TLS rehearsal evidence already exists"
tls_temporary=$(mktemp "${PHASE_F1_STATE_ROOT}/.origin-tls-rehearsal.XXXXXXXX")
fingerprint=$(openssl x509 -in "${CERTIFICATE}" -noout -fingerprint -sha256 | cut -d= -f2 | tr -d ':' | tr 'A-F' 'a-f')
expiry=$(date -u -d "$(openssl x509 -in "${CERTIFICATE}" -noout -enddate | cut -d= -f2-)" +%Y-%m-%dT%H:%M:%S.000Z)
printf '{"schemaVersion":1,"operationsIdentity":"%s","forwardApplicationSha":"%s","originCertificateFingerprintSha256":"%s","certificateExpiresAt":"%s","certificateKeyPairingPassed":true,"sniPassed":true,"hostRoutingPassed":true,"loopbackOnly":true,"reviewedAt":"%s"}\n' "${PHASE_F1_PACK_COMMIT}" "${PHASE_F1_FORWARD_SHA}" "${fingerprint}" "${expiry}" "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)" >"${tls_temporary}"
chmod 0600 "${tls_temporary}"; chown root:root "${tls_temporary}"; mv -T "${tls_temporary}" "${tls_evidence}"
printf 'Isolated loopback TLS listener stopped after the mandatory origin test passed.\n'
