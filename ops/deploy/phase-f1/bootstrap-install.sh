#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
PATH=/usr/sbin:/usr/bin:/sbin:/bin
export PATH
[[ ${EUID} -eq 0 ]] || { printf 'root required\n' >&2; exit 1; }
readonly EXPECTED_BOOTSTRAP_SHA=${1:?external bootstrap SHA required}
readonly EXPECTED_ARCHIVE_SHA=${2:?external archive SHA required}
readonly EXPECTED_MANIFEST_SHA=${3:?external manifest SHA required}
readonly EXPECTED_OPERATIONS_COMMIT=${4:?external operations commit required}
readonly ARCHIVE=${5:?archive path required} MANIFEST=${6:?manifest path required} DESTINATION=${7:?new canonical destination required}
[[ ${EXPECTED_BOOTSTRAP_SHA} =~ ^[0-9a-f]{64}$ && ${EXPECTED_ARCHIVE_SHA} =~ ^[0-9a-f]{64}$ && ${EXPECTED_MANIFEST_SHA} =~ ^[0-9a-f]{64}$ ]] || exit 1
for protected_input in "${BASH_SOURCE[0]}" "${ARCHIVE}" "${MANIFEST}"; do
  [[ -f ${protected_input} && ! -L ${protected_input} && $(/usr/bin/stat -c '%U:%G:%h' "${protected_input}") == root:root:1 && $((8#$(/usr/bin/stat -c '%a' "${protected_input}" ) & 8#022)) -eq 0 ]] || { printf 'unsafe bootstrap input ownership, linkage or mode\n' >&2; exit 1; }
done
[[ $(/usr/bin/sha256sum "${BASH_SOURCE[0]}" | awk '{print $1}') == "${EXPECTED_BOOTSTRAP_SHA}" ]] || { printf 'bootstrap identity mismatch\n' >&2; exit 1; }
[[ $(/usr/bin/sha256sum "${ARCHIVE}" | awk '{print $1}') == "${EXPECTED_ARCHIVE_SHA}" && $(/usr/bin/sha256sum "${MANIFEST}" | awk '{print $1}') == "${EXPECTED_MANIFEST_SHA}" ]] || { printf 'external archive identity mismatch\n' >&2; exit 1; }
parent=$(/usr/bin/dirname "${DESTINATION}"); name=$(/usr/bin/basename "${DESTINATION}")
[[ ${parent} == /opt/thebusinesscircle/deployment-packs && ${name} == "${EXPECTED_OPERATIONS_COMMIT}" && ${name} =~ ^[0-9a-f]{40}$ && ! -e ${DESTINATION} && ! -L ${DESTINATION} ]] || { printf 'new protected destination required\n' >&2; exit 1; }
[[ $(/usr/bin/realpath -e "${parent}") == "${parent}" && $(/usr/bin/stat -c '%U:%G' "${parent}") == root:root && $(/usr/bin/stat -c '%a' "${parent}") =~ ^(755|750|700)$ ]] || { printf 'unsafe installation parent\n' >&2; exit 1; }
staging="${DESTINATION}.staging.$(/usr/bin/openssl rand -hex 8)"; [[ ! -e ${staging} ]] || exit 1
cleanup() { [[ ${staging} == "${parent}/.${name}.staging."* || ${staging} == "${parent}/${name}.staging."* ]] && /usr/bin/rm -rf --one-file-system "${staging}"; }; trap cleanup EXIT
/usr/bin/python3 - "${ARCHIVE}" "${MANIFEST}" <<'PY'
import hashlib, os, re, sys, tarfile
archive_path, manifest_path = sys.argv[1:]
rows={}
pattern=re.compile(r'^(D|F) (0[0-7]{3}) (-|\d+) (-|[0-9a-f]{64}) (.+)$')
with open(manifest_path, 'r', encoding='utf-8', newline='') as source:
    for raw in source:
        match=pattern.fullmatch(raw.rstrip('\n'))
        if not match: raise SystemExit('malformed approved manifest')
        kind, mode, size, digest, path=match.groups()
        parts=path.split('/')
        if path in rows or any(part in ('', '.', '..') for part in parts) or path.startswith('/') or '\\' in path: raise SystemExit('unsafe approved manifest path')
        wanted='0555' if kind == 'D' or path.endswith('.sh') else '0444'
        if mode != wanted: raise SystemExit('unexpected approved executable mode')
        rows[path]=(kind, mode, size, digest)
with tarfile.open(archive_path, 'r:') as archive:
    seen=set()
    for item in archive.getmembers():
        if item.name == 'phase-f1' or item.name == 'phase-f1/':
            if not item.isdir(): raise SystemExit('unsafe archive root')
            continue
        if not item.name.startswith('phase-f1/'): raise SystemExit('archive prefix mismatch')
        path=item.name[len('phase-f1/'):].rstrip('/')
        parts=path.split('/')
        if not path or item.name.startswith('/') or any(part in ('', '.', '..') for part in parts) or path in seen: raise SystemExit('unsafe archive path')
        seen.add(path)
        if not (item.isfile() or item.isdir()): raise SystemExit('links and special archive objects rejected')
        expected=rows.get(path)
        if not expected or expected[0] != ('F' if item.isfile() else 'D'): raise SystemExit('archive member absent from manifest')
        if item.isfile():
            body=archive.extractfile(item).read()
            if len(body) != int(expected[2]) or hashlib.sha256(body).hexdigest() != expected[3]: raise SystemExit('archive content differs from manifest')
    if seen != set(rows): raise SystemExit('archive and manifest path sets differ')
PY
[[ $(/usr/bin/sha256sum "${ARCHIVE}" | awk '{print $1}') == "${EXPECTED_ARCHIVE_SHA}" && $(/usr/bin/sha256sum "${MANIFEST}" | awk '{print $1}') == "${EXPECTED_MANIFEST_SHA}" ]] || { printf 'bootstrap inputs changed during validation\n' >&2; exit 1; }
/usr/bin/mkdir -m 0700 "${staging}"; /usr/bin/tar --extract --file="${ARCHIVE}" --directory="${staging}" --no-same-owner --no-same-permissions
[[ -d ${staging}/phase-f1 && ! -L ${staging}/phase-f1 ]] || exit 1
/usr/bin/mv "${staging}/phase-f1" "${staging}/installed"; /usr/bin/cp --no-preserve=mode,ownership "${MANIFEST}" "${staging}/installed/.installed-pack.manifest"
/usr/bin/chown -R root:root "${staging}/installed"
/usr/bin/python3 - "${staging}/installed" "${MANIFEST}" <<'PY'
import hashlib, os, re, stat, sys
root, manifest_path=sys.argv[1:]
expected={}
pattern=re.compile(r'^(D|F) (0[0-7]{3}) (-|\d+) (-|[0-9a-f]{64}) (.+)$')
with open(manifest_path, encoding='utf-8') as source:
    for raw in source:
        match=pattern.fullmatch(raw.rstrip('\n'))
        if not match: raise SystemExit('malformed approved manifest')
        expected[match.group(5)]=match.groups()[:4]
actual=set()
for directory, names, files in os.walk(root, topdown=True, followlinks=False):
    for name in names + files:
        absolute=os.path.join(directory, name)
        relative=os.path.relpath(absolute, root).replace(os.sep, '/')
        if relative == '.installed-pack.manifest': continue
        info=os.lstat(absolute)
        if stat.S_ISLNK(info.st_mode) or (stat.S_ISREG(info.st_mode) and info.st_nlink != 1): raise SystemExit('linked installed object rejected')
        kind='D' if stat.S_ISDIR(info.st_mode) else 'F' if stat.S_ISREG(info.st_mode) else None
        if not kind or relative not in expected or expected[relative][0] != kind: raise SystemExit('installed path/type mismatch')
        mode=int(expected[relative][1], 8)
        os.chmod(absolute, mode)
        if kind == 'F':
            body=open(absolute, 'rb').read()
            if len(body) != int(expected[relative][2]) or hashlib.sha256(body).hexdigest() != expected[relative][3]: raise SystemExit('installed content mismatch')
        actual.add(relative)
if actual != set(expected): raise SystemExit('installed and manifest path sets differ')
os.chmod(root, 0o555)
os.chmod(os.path.join(root, '.installed-pack.manifest'), 0o444)
PY
/usr/bin/mv "${staging}/installed" "${DESTINATION}"; /usr/bin/rmdir "${staging}"; trap - EXIT
/usr/bin/python3 - "${DESTINATION}" "${MANIFEST}" <<'PY'
import hashlib, os, re, stat, sys
root, manifest_path=sys.argv[1:]
pattern=re.compile(r'^(D|F) (0[0-7]{3}) (-|\d+) (-|[0-9a-f]{64}) (.+)$')
root_info=os.lstat(root)
if not stat.S_ISDIR(root_info.st_mode) or root_info.st_uid != 0 or root_info.st_gid != 0 or stat.S_IMODE(root_info.st_mode) != 0o555: raise SystemExit('published pack root protection mismatch')
expected={}
with open(manifest_path, encoding='utf-8') as source:
    for raw in source:
        match=pattern.fullmatch(raw.rstrip('\n'))
        if not match: raise SystemExit('malformed approved manifest after publication')
        expected[match.group(5)]=match.groups()[:4]
actual=set()
for directory, names, files in os.walk(root, topdown=True, followlinks=False):
    for name in names + files:
        path=os.path.join(directory, name); relative=os.path.relpath(path, root).replace(os.sep, '/')
        if relative == '.installed-pack.manifest': continue
        info=os.lstat(path)
        if info.st_uid != 0 or info.st_gid != 0 or (stat.S_ISREG(info.st_mode) and info.st_nlink != 1) or stat.S_ISLNK(info.st_mode): raise SystemExit('unsafe published pack ownership or linkage')
        kind='D' if stat.S_ISDIR(info.st_mode) else 'F' if stat.S_ISREG(info.st_mode) else None
        row=expected.get(relative)
        if not row or row[0] != kind or stat.S_IMODE(info.st_mode) != int(row[1], 8): raise SystemExit('published pack type or mode mismatch')
        if kind == 'F':
            body=open(path, 'rb').read()
            if len(body) != int(row[2]) or hashlib.sha256(body).hexdigest() != row[3]: raise SystemExit('published pack content mismatch')
        actual.add(relative)
if actual != set(expected): raise SystemExit('published pack path set mismatch')
manifest=os.path.join(root, '.installed-pack.manifest'); info=os.lstat(manifest)
if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_uid != 0 or info.st_gid != 0 or stat.S_IMODE(info.st_mode) != 0o444: raise SystemExit('published installed manifest protection mismatch')
PY
printf 'Pack installed only after external system checksum and archive-object validation.\n'
