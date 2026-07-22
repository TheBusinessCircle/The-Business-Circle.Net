#!/usr/bin/env bash

set -Eeuo pipefail
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH

readonly FORWARD_SHA="2c83694de301b0244c5586c1598aceb10fa2214b"
readonly ROLLBACK_SHA="5d1f81bb05a01b08e1134785c2f86b77c8969fe3"
readonly HISTORICAL_SHA="5fa2bbf6ac7d39aa14636882bbae2d2713faf11a"
readonly LIVE_DIR="/var/www/The-Business-Circle.Net"
readonly PACK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly EXPECTED_PACK_ROOT="/opt/thebusinesscircle/deployment-packs"

[[ ${1:-} == "${FORWARD_SHA}" ]] || {
  printf 'ERROR: first argument must be exact forward SHA %s\n' "${FORWARD_SHA}" >&2
  exit 1
}
[[ ${PACK_DIR} == "${EXPECTED_PACK_ROOT}/"* ]] || {
  printf 'ERROR: deployment pack must run beneath %s\n' "${EXPECTED_PACK_ROOT}" >&2
  exit 1
}
pack_identity=$(env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=/root \
  /usr/bin/node "${PACK_DIR}/verify-pack-integrity.mjs" /var/lib/thebusinesscircle/approved-phase-f1-pack.json)
IFS=$'\t' read -r operations_commit archive_sha manifest_sha <<<"${pack_identity}"
printf 'Forward application SHA=%s\nRollback application SHA=%s\nHistorical production SHA=%s\nOperations-pack commit=%s\nPack archive SHA-256=%s\nInstalled manifest SHA-256=%s\n' \
  "${FORWARD_SHA}" "${ROLLBACK_SHA}" "${HISTORICAL_SHA}" "${operations_commit}" "${archive_sha}" "${manifest_sha}"

printf '%s\n' '=== identity and capacity ==='
hostnamectl
date --iso-8601=seconds
timedatectl show --property=Timezone --value
uptime
nproc
free -h
df -h / /var/www

printf '%s\n' '=== runtime versions ==='
node --version
npm --version
node -e 'const {parseEnv}=require("node:util"); console.log(`node:util.parseEnv=${typeof parseEnv === "function"}`)'

printf '%s\n' '=== process state (no environments) ==='
for identity in bcn-app circle-card-app phase-f1-build; do
  if getent passwd "${identity}" >/dev/null; then
    printf '%s uid=%s gid=%s groups=%s\n' "${identity}" "$(id -u "${identity}")" \
      "$(id -g "${identity}")" "$(id -nG "${identity}" | tr ' ' ',')"
  else
    printf '%s absent\n' "${identity}"
  fi
done
if [[ -S /root/.pm2/rpc.sock ]] && pgrep -f 'PM2.*God Daemon' >/dev/null; then
  pm2 --version
  pm2 jlist | node -e '
let body="";process.stdin.on("data",c=>body+=c);process.stdin.on("end",()=>{
  for(const row of JSON.parse(body)) {
    const env=row.pm2_env??{};
    console.log(JSON.stringify({
      name:row.name,pid:row.pid,status:env.status,mode:env.exec_mode,
      instances:env.instances,cwd:env.pm_cwd,script:env.pm_exec_path,args:env.args,
      uptime:env.pm_uptime,restarts:env.restart_time,maxMemory:env.max_memory_restart,
      outLog:env.pm_out_log_path,errorLog:env.pm_err_log_path
    }));
  }
});'
else
  printf 'PM2 daemon is not already running; PM2 CLI inspection was deliberately skipped.\n'
  npm list --global pm2 --depth=0 || true
fi
systemctl is-enabled pm2-root.service || true
systemctl is-active pm2-root.service || true

printf '%s\n' '=== release and storage ==='
git -C "${LIVE_DIR}" branch --show-current
git -C "${LIVE_DIR}" rev-parse HEAD
git -C "${LIVE_DIR}" status --short
findmnt -T "${LIVE_DIR}" -o TARGET,SOURCE,FSTYPE,OPTIONS
stat -c '%n %U:%G %a %F' "${LIVE_DIR}" "${LIVE_DIR}/.env" "${LIVE_DIR}/.env.production"
[[ -f "${LIVE_DIR}/.next/BUILD_ID" ]] && printf '.next BUILD_ID present\n' || printf '.next BUILD_ID absent\n'
for path in "${LIVE_DIR}/public/uploads" "${LIVE_DIR}/.uploads" \
  "${LIVE_DIR}/public/generated/community-source-previews"; do
  if [[ -d ${path} ]]; then
    printf '%s files=' "${path}"
    find "${path}" -xdev -type f -printf . | wc -c
    du -sh "${path}"
  else
    printf '%s absent\n' "${path}"
  fi
done

printf '%s\n' '=== listeners and firewall ==='
ss -ltnp
ufw status verbose || true

printf '%s\n' '=== nginx (redact before sharing output) ==='
nginx -v
nginx -T 2>&1 | awk '
  /^# configuration file / ||
  /^[[:space:]]*(listen|server_name|location|proxy_pass|proxy_http_version|proxy_request_buffering|proxy_buffering|proxy_connect_timeout|proxy_read_timeout|proxy_send_timeout|client_max_body_size|return|ssl_certificate|ssl_certificate_key)[[:space:]]/ ||
  /^[[:space:]]*proxy_set_header[[:space:]]+(Host|X-Forwarded-Host|X-Forwarded-Proto|X-Real-IP|X-Forwarded-For|Upgrade|Connection)[[:space:]]/ {
    print
  }'

printf '%s\n' '=== environment names/status only ==='
node "${PACK_DIR}/report-environment.mjs" \
  "${LIVE_DIR}/.env" "${LIVE_DIR}/.env.production"

printf '%s\n' '=== schedulers and backups (metadata only) ==='
systemctl list-timers --all --no-pager
cron_body=$(crontab -l 2>/dev/null || true)
printf 'root crontab non-comment entries=%s\n' "$(printf '%s\n' "${cron_body}" | awk 'NF && $1 !~ /^#/ {count++} END {print count+0}')"
printf '%s\n' "${cron_body}" | grep -Eo 'https?://(localhost|127\.0\.0\.1|thebusinesscircle\.net|www\.thebusinesscircle\.net|circlecard\.co\.uk|www\.circlecard\.co\.uk)' | sort -u || true
find /etc/cron.d /etc/cron.daily /etc/cron.hourly -maxdepth 1 -type f -printf '%p\n' 2>/dev/null
find /var/backups -maxdepth 3 -type f -printf '%TY-%Tm-%TdT%TH:%TM:%TS %s %p\n' 2>/dev/null | sort -r | head -50

printf '%s\n' 'Read-only preflight complete.'
