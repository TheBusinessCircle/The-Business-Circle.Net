#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

require_root
require_application_sha forward "${1:-}"
readonly MODE=${2:-}
[[ ${MODE} == initial || ${MODE} == final ]] || die "mode must be initial or final"
start_write_log "storage-${MODE}"

if [[ ${MODE} == final ]]; then
  [[ -f ${PHASE_F1_STATE_ROOT}/writers-frozen.evidence ]] || die "all legacy writers must be durably frozen"
fi

declare -ar MAPPINGS=(
  "public/uploads/profiles|${PHASE_F1_PUBLIC_ROOT}/profiles|root|circle-public|2770"
  "public/uploads/circle-card|${PHASE_F1_PUBLIC_ROOT}/circle-card|root|circle-public|2770"
  "public/uploads/visual-media|${PHASE_F1_PUBLIC_ROOT}/visual-media|root|bcn-app|2770"
  ".uploads/direct-messages|${PHASE_F1_PRIVATE_ROOT}/direct-messages|root|bcn-app|2770"
  ".uploads/wins|${PHASE_F1_PRIVATE_ROOT}/wins|root|bcn-app|2770"
  ".uploads/founder-services|${PHASE_F1_PRIVATE_ROOT}/founder-services|root|bcn-app|2770"
  ".uploads/circle-card-link-files|${PHASE_F1_PRIVATE_ROOT}/circle-card-link-files|root|circle-card-private|2770"
  "public/generated/community-source-previews|${PHASE_F1_PREVIEW_ROOT}|root|bcn-app|2770"
)
readonly QUARANTINE="/var/backups/thebusinesscircle/upload-conflicts/$(date -u +%Y%m%dT%H%M%S.%NZ)"
readonly EVIDENCE="${PHASE_F1_STATE_ROOT}/storage"
readonly RUN_ID="${MODE}-$(date -u +%Y%m%dT%H%M%S.%NZ)-$(openssl rand -hex 6)"
for path in "${PHASE_F1_SHARED_ROOT}" "${EVIDENCE}" "${QUARANTINE}"; do assert_no_symlink_components "${path}"; done
install -d -m 0711 -o root -g root "${PHASE_F1_SHARED_ROOT}" "${PHASE_F1_PUBLIC_ROOT}" "${PHASE_F1_PRIVATE_ROOT}"
install -d -m 0700 -o root -g root "${EVIDENCE}" "${QUARANTINE}"

validate_tree() {
  local path=$1
  [[ -d ${path} && ! -L ${path} && $(realpath -e "${path}") == "${path}" ]] || die "non-canonical storage tree: ${path}"
  ! find "${path}" -xdev \( -type l -o -type b -o -type c -o -type p -o -type s \) -print -quit | grep -q . || die "special storage entry rejected"
}

for mapping in "${MAPPINGS[@]}"; do
  IFS='|' read -r relative destination owner group mode <<<"${mapping}"
  source="${PHASE_F1_LIVE_DIR}/${relative}"
  install -d -m "${mode}" -o "${owner}" -g "${group}" "${destination}"
  [[ -e ${source} ]] || { printf '%s is absent; preserving an empty canonical subtree.\n' "${relative}"; continue; }
  validate_tree "${source}"; validate_tree "${destination}"
  slug=${relative//\//-}
  comparison="${EVIDENCE}/${RUN_ID}-${slug}-compare.json"
  if [[ ${MODE} == initial ]]; then
    rsync -a --ignore-existing --partial --partial-dir=.phase-f1-partial --no-specials --no-devices "${source}/" "${destination}/"
  else
    quarantine="${QUARANTINE}/${slug}"
    install -d -m 0700 -o root -g root "${quarantine}"
    rsync -a --checksum --partial --partial-dir=.phase-f1-partial --no-specials --no-devices \
      --backup --backup-dir="${quarantine}" "${source}/" "${destination}/"
  fi
  [[ ! -d ${destination}/.phase-f1-partial || -z $(find "${destination}/.phase-f1-partial" -mindepth 1 -print -quit) ]] || die "interrupted sync remains"
  [[ ! -d ${destination}/.phase-f1-partial ]] || rmdir "${destination}/.phase-f1-partial"
  /usr/bin/node "${PHASE_F1_PACK_DIR}/storage-manifest.mjs" compare "${source}" "${destination}" "${comparison}" >/dev/null
  destination_only=$(/usr/bin/node -e 'process.stdout.write(String(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).destinationOnly.length))' "${comparison}")
  if ((destination_only > 0)); then
    approval="${EVIDENCE}/destination-only-${slug}.approved"
    [[ -f ${approval} && ! -L ${approval} && $(stat -c '%U:%G:%a' "${approval}") == root:root:600 ]] || die "destination-only storage requires explicit protected review"
    [[ $(<"${approval}") == "$(sha256sum "${comparison}" | awk '{print $1}')" ]] || die "destination-only approval is stale"
  fi
  if [[ ${MODE} == final ]]; then
    pending=$(rsync -ani --checksum --no-specials --no-devices "${source}/" "${destination}/")
    [[ -z ${pending} ]] || die "frozen storage did not converge"
  fi
  manifest="${EVIDENCE}/${RUN_ID}-${slug}.manifest"
  /usr/bin/node "${PHASE_F1_PACK_DIR}/storage-manifest.mjs" audit "${destination}" "${manifest}" >/dev/null
  find "${destination}" -xdev -type d -exec chown "${owner}:${group}" {} + -exec chmod "${mode}" {} +
  find "${destination}" -xdev -type f -exec chown "${owner}:${group}" {} + -exec chmod 0660 {} +
done

proof_index_temp=$(mktemp "${PHASE_F1_STATE_ROOT}/.storage-proof-index.XXXXXXXX")
(cd "${EVIDENCE}" && sha256sum -- "${RUN_ID}"-*.manifest "${RUN_ID}"-*-compare.json >"${proof_index_temp}")
chmod 0600 "${proof_index_temp}"; chown root:root "${proof_index_temp}"
mv -T "${proof_index_temp}" "${PHASE_F1_STATE_ROOT}/storage-proof-index.sha256"

if [[ ${MODE} == initial ]]; then
  artifact_storage_index="${PHASE_F1_STATE_ROOT}/artifact-storage-manifest-index.sha256"
  [[ ! -e ${artifact_storage_index} ]] || die "artifact storage identity already exists"
  cp --preserve=mode,ownership "${PHASE_F1_STATE_ROOT}/storage-proof-index.sha256" "${artifact_storage_index}"
  chmod 0600 "${artifact_storage_index}"; chown root:root "${artifact_storage_index}"
  "${PHASE_F1_PACK_DIR}/seal-artifact-identities.sh" "${PHASE_F1_FORWARD_SHA}"
fi

if [[ ${MODE} == final ]]; then
  index="${PHASE_F1_STATE_ROOT}/storage-manifest-index.sha256"
  [[ ! -e ${index} ]] || die "storage manifest index already exists"
  (cd "${EVIDENCE}" && sha256sum -- final-*.manifest final-*-compare.json >"${index}")
  chmod 0600 "${index}"; chown root:root "${index}"
  converged="${PHASE_F1_STATE_ROOT}/storage-converged.evidence"
  printf 'manifestIndexSha256=%s\n' "$(sha256sum "${index}" | awk '{print $1}')" >"${converged}"
  chmod 0600 "${converged}"; chown root:root "${converged}"
  refresh_release_bindings legacy private
  "${PHASE_F1_PACK_DIR}/probe-rollback-candidate.sh" "${PHASE_F1_ROLLBACK_SHA}"
  transition_state writers-frozen storage-converged "${converged}"
fi
printf 'Storage %s completed without deleting destination-only content; conflicts were retained in protected quarantine.\n' "${MODE}"
