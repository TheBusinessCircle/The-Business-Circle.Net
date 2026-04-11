#!/bin/sh
set -eu

set -- \
  turnserver \
  -n \
  --fingerprint \
  --lt-cred-mech \
  --use-auth-secret \
  "--static-auth-secret=${TURN_SHARED_SECRET:-change-this-turn-secret}" \
  "--realm=${TURN_REALM:-thebusinesscircle.local}" \
  "--server-name=${TURN_DOMAIN:-turn.localhost}" \
  --listening-ip=0.0.0.0 \
  "--listening-port=${TURN_UDP_PORT:-3478}" \
  "--min-port=${TURN_MIN_PORT:-41000}" \
  "--max-port=${TURN_MAX_PORT:-41040}" \
  --stale-nonce=600 \
  --total-quota=200 \
  --no-cli \
  --no-multicast-peers \
  --log-file=stdout \
  --simple-log

if [ "${TURN_TLS_ENABLED:-false}" = "true" ]; then
  : "${TURN_TLS_CERT_FILE:?TURN_TLS_CERT_FILE is required when TURN_TLS_ENABLED=true}"
  : "${TURN_TLS_KEY_FILE:?TURN_TLS_KEY_FILE is required when TURN_TLS_ENABLED=true}"

  set -- \
    "$@" \
    "--tls-listening-port=${TURN_TLS_PORT:-5349}" \
    "--cert=${TURN_TLS_CERT_FILE}" \
    "--pkey=${TURN_TLS_KEY_FILE}"

  if [ -n "${TURN_TLS_CA_FILE:-}" ]; then
    set -- "$@" "--ca-file=${TURN_TLS_CA_FILE}"
  fi

  if [ -n "${TURN_TLS_CIPHER_LIST:-}" ]; then
    set -- "$@" "--cipher-list=${TURN_TLS_CIPHER_LIST}"
  fi
else
  set -- "$@" --no-tls --no-dtls
fi

exec "$@"
