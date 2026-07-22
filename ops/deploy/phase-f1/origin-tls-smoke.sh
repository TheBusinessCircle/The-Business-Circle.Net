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
[[ -f ${CERTIFICATE} && ! -L ${CERTIFICATE} && -f ${PRIVATE_KEY} && ! -L ${PRIVATE_KEY} ]] ||
  die "reviewed certificate and private-key regular files are required"
[[ -f ${CA_FILE} && ! -L ${CA_FILE} ]] || die "reviewed certificate authority file is required"
start_write_log "origin-tls-smoke"
actual_fingerprint=$(openssl x509 -in "${CERTIFICATE}" -noout -fingerprint -sha256 | cut -d= -f2 | tr -d ':' | tr 'A-F' 'a-f')
actual_expiry=$(openssl x509 -in "${CERTIFICATE}" -noout -enddate | cut -d= -f2-)
[[ ${actual_fingerprint} =~ ^[0-9a-f]{64}$ && $(date -u -d "${actual_expiry}" +%s) -gt $(( $(date -u +%s) + 1209600 )) ]] || die "origin certificate identity or remaining lifetime is unsafe"
openssl x509 -in "${CERTIFICATE}" -noout -checkhost circlecard.co.uk >/dev/null || die "Circle certificate SAN mismatch"
if openssl x509 -in "${CERTIFICATE}" -noout -checkhost www.circlecard.co.uk >/dev/null 2>&1; then
  die "initial apex-only certificate unexpectedly includes unsupported www"
fi
certificate_key_hash=$(openssl x509 -in "${CERTIFICATE}" -pubkey -noout | openssl pkey -pubin -outform DER | sha256sum | awk '{print $1}')
private_key_hash=$(openssl pkey -in "${PRIVATE_KEY}" -pubout -outform DER 2>/dev/null | sha256sum | awk '{print $1}')
[[ ${certificate_key_hash} == "${private_key_hash}" ]] || die "Circle certificate/private-key pair mismatch"
openssl s_client -connect 127.0.0.1:8443 -servername circlecard.co.uk \
  -CAfile "${CA_FILE}" -verify_return_error -verify_hostname circlecard.co.uk </dev/null >/dev/null 2>&1 ||
  die "local staged TLS listener failed chain, SNI or hostname validation"
result=$(curl --silent --show-error --max-time 15 --cacert "${CA_FILE}" \
  --resolve circlecard.co.uk:8443:127.0.0.1 --output /dev/null \
  --write-out '%{http_code}\t%{url_effective}' https://circlecard.co.uk:8443/)
[[ ${result} == $'200\thttps://circlecard.co.uk:8443/' ]] || die "local staged TLS Host/server selection failed"
printf 'Mandatory local Circle origin TLS chain, key pair, SAN, SNI and server selection passed.\n'
