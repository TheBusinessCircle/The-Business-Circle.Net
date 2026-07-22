#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
readonly ROLE=${2:-}
require_root; require_application_sha "${ROLE}" "${1:-}"; require_environment_ready
[[ ${ROLE} == forward ]] || die "rollback builds must use prepare-rollback-fixture.sh and prepare-rollback-artifact.sh"
[[ $(node --version) == v22.22.2 && $(npm --version) == 10.9.7 ]] || die "exact Node/npm versions required"
application_sha=${PHASE_F1_FORWARD_SHA}
final_dir=${PHASE_F1_RELEASE_DIR}
attempt_file="${PHASE_F1_STATE_ROOT}/${ROLE}-build-attempt.json"
require_protected_state_file "${attempt_file}"
workspace=$(/usr/bin/node "${PHASE_F1_PACK_DIR}/build-state.mjs" consume "${attempt_file}" "${ROLE}" "${application_sha}"); workspace=$(realpath -e "${workspace}")
build_complete=false
record_failed_attempt() { local status=$?; trap - EXIT ERR INT TERM; if ((status)) && [[ ${build_complete} != true ]]; then /usr/bin/node "${PHASE_F1_PACK_DIR}/build-state.mjs" finish "${attempt_file}" failed || true; fi; exit "${status}"; }
trap record_failed_attempt EXIT INT TERM
[[ ${workspace} == "${PHASE_F1_BUILD_ROOT}/${ROLE}-${application_sha}-"* && $(git -C "${workspace}" rev-parse HEAD) == "${application_sha}" ]] || die "unapproved build workspace"
[[ ! -e ${final_dir} ]] || die "release cannot be reused"
for forbidden in .env .env.local .env.production .next node_modules; do [[ ! -e ${workspace}/${forbidden} ]] || die "stale or secret-bearing build input: ${forbidden}"; done
start_write_log "build-${ROLE}-release"
sudo -u phase-f1-build test ! -r "${PHASE_F1_BCN_ENV}" || die "build user can read BCN secrets"
sudo -u phase-f1-build test ! -r "${PHASE_F1_CIRCLE_ENV}" || die "build user can read Circle secrets"
helper="${PHASE_F1_PACK_DIR}/artifact-manifest.mjs"; evidence="${PHASE_F1_STATE_ROOT}/build-evidence"
install -d -m 0700 -o root -g root "${evidence}"
pre="${evidence}/source-before.manifest"; post_install="${evidence}/source-after-install.manifest"; post_build="${evidence}/source-after-build.manifest"
dependencies_after_install="${evidence}/dependencies-after-install.manifest"; dependencies_after_build="${evidence}/dependencies-after-build.manifest"
/usr/bin/node "${helper}" build-inputs "${workspace}" fresh >/dev/null
/usr/bin/node "${helper}" source "${workspace}" "${pre}" >/dev/null
cd "${workspace}"
# Lifecycle scripts run without production authority in this disposable workspace.
sudo -u phase-f1-build env -i HOME=/var/lib/thebusinesscircle/build PATH=/usr/local/bin:/usr/bin:/bin \
  NPM_CONFIG_USERCONFIG=/dev/null NPM_CONFIG_GLOBALCONFIG=/dev/null NPM_CONFIG_CACHE=/var/lib/thebusinesscircle/build/npm-cache \
  npm ci --no-audit --no-fund
for required in node_modules/.prisma node_modules/sharp node_modules/esbuild node_modules/next; do [[ -e ${required} ]] || die "required installed dependency missing: ${required}"; done
/usr/bin/node "${helper}" source "${workspace}" "${post_install}" >/dev/null
cmp --silent "${pre}" "${post_install}" || die "dependency installation changed tracked source"
/usr/bin/node "${helper}" build-inputs "${workspace}" post-install >/dev/null
/usr/bin/node "${helper}" create "${workspace}/node_modules" "${dependencies_after_install}" >/dev/null
for command in prisma next verify; do sudo -u phase-f1-build env -i HOME=/var/lib/thebusinesscircle/build PATH=/usr/local/bin:/usr/bin:/bin /usr/bin/node "${PHASE_F1_PACK_DIR}/build-command.mjs" "${command}" "${ROLE}"; done
/usr/bin/node "${helper}" source "${workspace}" "${post_build}" >/dev/null
cmp --silent "${pre}" "${post_build}" || die "build changed tracked source"
/usr/bin/node "${helper}" build-inputs "${workspace}" post-build >/dev/null
/usr/bin/node "${helper}" create "${workspace}/node_modules" "${dependencies_after_build}" >/dev/null
cmp --silent "${dependencies_after_install}" "${dependencies_after_build}" || die "build modified installed dependencies"
[[ -s .next/BUILD_ID ]] || die "build is incomplete"
# Phase E2/E3 make all runtime caches memory-only. Build caches are never promoted.
rm -rf -- .next/cache
[[ ! -e .next/cache ]] || die "Next build cache exclusion failed"

final_root=$(dirname "${final_dir}")
promotion="${final_root}/.${application_sha}.promotion.$(openssl rand -hex 8)"
install -d -m 0755 -o root -g root "${final_root}"
install -d -m 0700 -o root -g root "${promotion}"
rsync -a --exclude=.git "${workspace}/" "${promotion}/"
install -d -m 0755 -o root -g root "${promotion}/.runtime"
cp -a "${promotion}/.next" "${promotion}/.runtime/bcn"
cp -a "${promotion}/.next" "${promotion}/.runtime/circle-card"
mv "${promotion}" "${final_dir}"
"${PHASE_F1_PACK_DIR}/attach-storage.sh" "${application_sha}" "${final_dir}" "${ROLE}"
install -d -m 0700 -o root -g root "${PHASE_F1_ARTIFACT_ROOT}"
for item in "built-next:.next" "runtime-bcn:.runtime/bcn" "runtime-circle-card:.runtime/circle-card"; do IFS=: read -r name path <<<"${item}"; /usr/bin/node "${helper}" runtime-create "${final_dir}/${path}" "${PHASE_F1_ARTIFACT_ROOT}/${name}.manifest" >/dev/null; done
/usr/bin/node "${helper}" release-create "${final_dir}" "${PHASE_F1_ARTIFACT_ROOT}/forward-release.manifest" >/dev/null
cmp --silent "${PHASE_F1_ARTIFACT_ROOT}/runtime-bcn.manifest" "${PHASE_F1_ARTIFACT_ROOT}/runtime-circle-card.manifest" || die "runtime copies differ"
(cd "${PHASE_F1_ARTIFACT_ROOT}" && sha256sum -- *.manifest >manifest-index.sha256)
chown -R root:root "${PHASE_F1_ARTIFACT_ROOT}"; chmod -R go-rwx "${PHASE_F1_ARTIFACT_ROOT}"
require_release_integrity
/usr/bin/node "${PHASE_F1_PACK_DIR}/build-state.mjs" finish "${attempt_file}" complete
build_complete=true; trap - EXIT ERR INT TERM
[[ ! -e ${PHASE_F1_CURRENT_CIRCLE} && ! -L ${PHASE_F1_CURRENT_CIRCLE} ]] || die "Circle stable selector already exists"
ln -s "${PHASE_F1_RELEASE_DIR}" "${PHASE_F1_CURRENT_CIRCLE}"
[[ $(readlink -f "${PHASE_F1_CURRENT_CIRCLE}") == "${PHASE_F1_RELEASE_DIR}" ]] || die "Circle selector verification failed"
sha256sum "${PHASE_F1_ARTIFACT_ROOT}/manifest-index.sha256" "${PHASE_F1_ARTIFACT_ROOT}"/*.manifest
printf '%s authority-free build produced immutable runtime artifact(s) from %s.\n' "${ROLE}" "${application_sha}"
