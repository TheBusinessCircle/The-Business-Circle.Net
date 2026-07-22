#!/usr/bin/env bash

set -Eeuo pipefail
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
case "${2:-}" in
  candidate) role=forward; scope=both; bcn_port=3100; circle_port=3200 ;;
  rollback) role=rollback; scope=bcn-only; bcn_port=3300; circle_port=3200 ;;
  rollback-live) role=rollback; scope=bcn-only; bcn_port=3000; circle_port=3200 ;;
  forward-live) role=forward; scope=bcn-only; bcn_port=3000; circle_port=3200 ;;
  circle-only) role=forward; scope=circle-only; bcn_port=3000; circle_port=3200 ;;
  *) die "private smoke mode must be candidate, rollback, rollback-live, forward-live, or circle-only" ;;
esac
require_application_sha "${role}" "${1:-}"
env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=/root /usr/bin/node "${PHASE_F1_PACK_DIR}/smoke-http.mjs" private "${scope}" "${bcn_port}" "${circle_port}"
