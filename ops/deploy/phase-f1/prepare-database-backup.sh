#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
require_root; require_application_sha forward "${1:-}"; require_environment_ready; start_write_log database-backup
mapfile -d '' -t DB < <(/usr/bin/node "${PHASE_F1_PACK_DIR}/database-identity.mjs" "${PHASE_F1_BCN_ENV}" "${PHASE_F1_CIRCLE_ENV}" fields)
[[ ${#DB[@]} -eq 7 && ${DB[6]} =~ ^[0-9a-f]{64}$ ]] || die "database identity could not be established"
root=/var/backups/thebusinesscircle/database; assert_no_symlink_components "${root}"; install -d -m 0700 -o root -g root "${root}"; [[ $(stat -c '%U:%G:%a' "${root}") == root:root:700 ]] || die "unsafe backup root"
db_query() { PGPASSWORD="${DB[3]}" PGHOST="${DB[0]}" PGPORT="${DB[1]}" PGUSER="${DB[2]}" PGDATABASE="${DB[4]}" PGSSLMODE="${DB[5]}" psql --no-psqlrc -XAtqc "$1"; }
server_version=$(db_query 'SHOW server_version_num'); database_bytes=$(db_query 'SELECT pg_database_size(current_database())')
[[ ${server_version} =~ ^[0-9]+$ && ${database_bytes} =~ ^[0-9]+$ ]] || die "database metadata query failed"
server_major=$((server_version / 10000)); client_major=$(pg_dump --version | sed -E 's/.* ([0-9]+).*/\1/')
[[ ${client_major} -ge ${server_major} && ${client_major} -le $((server_major + 1)) ]] || die "pg_dump/server major versions are incompatible"
available=$(df --output=avail -B1 "${root}" | tail -1 | tr -d '[:space:]'); required=$((database_bytes * 2 + 1073741824)); ((available >= required)) || die "insufficient backup space"
stamp=$(date -u +%Y%m%dT%H%M%S.%NZ); final_set="${root}/production-${stamp}"; [[ ! -e ${final_set} && ! -L ${final_set} ]] || die "exclusive backup set collision"
temporary_set=$(mktemp -d "${root}/.production-${stamp}.XXXXXXXX.partial"); archive="${temporary_set}/database.dump"; checksum="${temporary_set}/database.dump.sha256"; evidence="${temporary_set}/evidence.json"; published=false
cleanup() { local status=$?; trap - EXIT INT TERM; unset PGPASSWORD PGHOST PGPORT PGUSER PGDATABASE PGSSLMODE; if [[ ${published} != true && -d ${temporary_set} && ! -L ${temporary_set} ]]; then rm -rf --one-file-system -- "${temporary_set}"; fi; exit "${status}"; }; trap cleanup EXIT INT TERM
export PGPASSWORD="${DB[3]}" PGHOST="${DB[0]}" PGPORT="${DB[1]}" PGUSER="${DB[2]}" PGDATABASE="${DB[4]}" PGSSLMODE="${DB[5]}"
pg_dump --format=custom --no-owner --file="${archive}"; unset PGPASSWORD; DB[3]=
[[ -s ${archive} ]] || die "backup is empty"; restore_list="${temporary_set}/.restore-list"; pg_restore --list "${archive}" >"${restore_list}" || die "archive list validation failed"
archive_sha=$(sha256sum "${archive}" | awk '{print $1}'); printf '%s  database.dump\n' "${archive_sha}" >"${checksum}"
(cd "${temporary_set}" && sha256sum --check database.dump.sha256 >/dev/null) || die "temporary backup checksum failed"
restore_list_sha=$(sha256sum "${restore_list}" | awk '{print $1}'); archive_bytes=$(stat -c '%s' "${archive}")
printf '{"schemaVersion":1,"applicationIdentities":{"forward":"%s","rollback":"%s","historical":"%s"},"databaseIdentitySha256":"%s","archiveSha256":"%s","restoreListSha256":"%s","archiveName":"database.dump","setName":"%s","archiveSizeBytes":%s,"databaseSizeBytes":%s}\n' "${PHASE_F1_FORWARD_SHA}" "${PHASE_F1_ROLLBACK_SHA}" "${PHASE_F1_HISTORICAL_SHA}" "${DB[6]}" "${archive_sha}" "${restore_list_sha}" "$(basename "${final_set}")" "${archive_bytes}" "${database_bytes}" >"${evidence}"
/usr/bin/node "${PHASE_F1_PACK_DIR}/database-backup-evidence.mjs" validate-evidence "${evidence}"
rm -f -- "${restore_list}"
chmod 0600 "${archive}" "${checksum}" "${evidence}"; chown root:root "${archive}" "${checksum}" "${evidence}"; chmod 0700 "${temporary_set}"; chown root:root "${temporary_set}"
[[ $(pg_restore --list "${archive}" | sha256sum | awk '{print $1}') == "${restore_list_sha}" ]] || die "final pre-publication restore-list validation failed"
mv -T "${temporary_set}" "${final_set}"; published=true
(cd "${final_set}" && sha256sum --check database.dump.sha256 >/dev/null); [[ $(pg_restore --list "${final_set}/database.dump" | sha256sum | awk '{print $1}') == "${restore_list_sha}" ]] || die "published restore-list identity mismatch"
/usr/bin/node "${PHASE_F1_PACK_DIR}/database-backup-evidence.mjs" validate-set "${final_set}"
[[ $(stat -c '%U:%G:%a:%h' "${final_set}/database.dump") == root:root:600:1 ]] || die "published backup protection mismatch"
state_evidence="${PHASE_F1_STATE_ROOT}/database-backup.evidence.json"; [[ ! -e ${state_evidence} && ! -L ${state_evidence} ]] || die "database evidence already exists"
state_temp=$(mktemp "${PHASE_F1_STATE_ROOT}/.database-backup.XXXXXXXX"); cp --no-preserve=mode,ownership "${final_set}/evidence.json" "${state_temp}"; chmod 0600 "${state_temp}"; chown root:root "${state_temp}"; mv -T "${state_temp}" "${state_evidence}"
trap - EXIT ERR INT TERM; unset PGHOST PGPORT PGUSER PGDATABASE PGSSLMODE
printf 'Verified database backup set atomically published; readiness evidence followed successful publication validation.\n'
