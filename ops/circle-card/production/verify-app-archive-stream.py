#!/usr/bin/env python3
"""Stream-verify the exact private Circle Card application rollback archive.

Reads every archived regular-file byte, checks archive SHA256, validates tar
member paths and the presence of all pinned production rollback components.
Does not extract, execute, expose contents or change production files.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import sys
import tarfile

ARCHIVE = Path("/var/backups/circle-card-safety/circle-card-app-20261111T235024Z.tar.gz")
EXPECTED_SHA256 = "cafc513a55025975187296e95dec3515382816c7e1e0eb51c6dc80939d57380c"
EXPECTED_ROOTS = (
    "var/www/releases/circle-card-bransons-account-20261109-115143",
    "etc/systemd/system/circle-card-bransons-account-20261109-115143.service",
    "etc/nginx/sites-available/circlecard.co.uk",
    "var/lib/circle-card-bransons-account/20261109-115143",
    "var/www/circle-card-samples-bransons",
)
EXPECTED_FILES = (
    "etc/systemd/system/circle-card-bransons-account-20261109-115143.service",
    "etc/nginx/sites-available/circlecard.co.uk",
    "var/lib/circle-card-bransons-account/20261109-115143/deployment.json",
)
EXPECTED_RELEASE_PREFIX = "var/www/releases/circle-card-bransons-account-20261109-115143/"
MAX_GZIP_BYTES = 1024 * 1024 * 1024
MAX_FILES = 150000
MAX_EXPANDED_BYTES = 12 * 1024 * 1024 * 1024


def file_digest(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def safe_member_path(name):
    if not name or name.startswith("/") or "\x00" in name or "\\" in name:
        return False
    parts = PurePosixPath(name).parts
    return bool(parts) and all(part not in ("", ".", "..") for part in parts)


def inspect_archive(path):
    seen = set()
    regular_count = 0
    directory_count = 0
    symlink_count = 0
    hardlink_count = 0
    unpacked_bytes = 0
    critical_files = set()
    release_files = 0
    root_presence = set()
    # r|gz consumes the gzip stream end to end, including file payloads.
    # Python's gzip stream also verifies the gzip CRC and trailer on EOF.
    with tarfile.open(path, "r|gz") as archive:
        for member in archive:
            name = member.name.rstrip("/") if member.isdir() else member.name
            if not safe_member_path(name):
                raise RuntimeError("UNSAFE_ARCHIVE_PATH")
            if name in seen:
                raise RuntimeError("DUPLICATE_ARCHIVE_ENTRY")
            seen.add(name)
            if len(seen) > MAX_FILES:
                raise RuntimeError("EXCESSIVE_ARCHIVE_ENTRIES")
            if any(name == p or name.startswith(p + "/") for p in EXPECTED_ROOTS):
                root_presence.update(
                    p for p in EXPECTED_ROOTS if name == p or name.startswith(p + "/")
                )
            else:
                raise RuntimeError("UNEXPECTED_ARCHIVE_PATH")
            if member.isfile():
                if member.size < 0:
                    raise RuntimeError("NEGATIVE_ARCHIVE_FILE_SIZE")
                unpacked_bytes += member.size
                if unpacked_bytes > MAX_EXPANDED_BYTES:
                    raise RuntimeError("ARCHIVE_CONTENT_TOO_LARGE")
                data = archive.extractfile(member)
                if data is None:
                    raise RuntimeError("ARCHIVE_ENTRY_UNREADABLE")
                read_bytes = 0
                while True:
                    chunk = data.read(1024 * 1024)
                    if not chunk:
                        break
                    read_bytes += len(chunk)
                if read_bytes != member.size:
                    raise RuntimeError("ARCHIVE_FILE_TRUNCATED")
                regular_count += 1
                if name in EXPECTED_FILES:
                    critical_files.add(name)
                if name.startswith(EXPECTED_RELEASE_PREFIX):
                    release_files += 1
            elif member.isdir():
                directory_count += 1
            elif member.issym():
                symlink_count += 1
            elif member.islnk():
                # tarfile may encode duplicate inodes as hardlinks. They are
                # self-contained only if the referent appeared earlier in the
                # same archive under one of the verified source roots.
                target = member.linkname.rstrip("/")
                if (not safe_member_path(target) or target == name
                        or target not in seen):
                    raise RuntimeError("ARCHIVE_HARDLINK_TARGET_UNAVAILABLE")
                hardlink_count += 1
            else:
                raise RuntimeError("UNEXPECTED_ARCHIVE_MEMBER_TYPE")
    if set(EXPECTED_ROOTS) - root_presence or set(EXPECTED_FILES) - critical_files:
        raise RuntimeError("CRITICAL_BACKUP_COMPONENT_MISSING")
    if release_files < 100 or regular_count < 1000:
        raise RuntimeError("ARCHIVE_UNEXPECTEDLY_SMALL_CONTENT")
    return {
        "result": "APPLICATION_ARCHIVE_STREAM_VERIFIED",
        "archive_sha256_matches": True,
        "regular_files_read_to_end": regular_count,
        "directories": directory_count,
        "symlinks_preserved_without_following": symlink_count,
        "hardlinks_validated_to_prior_archived_entry": hardlink_count,
        "uncompressed_file_data_mib": round(unpacked_bytes / 1048576, 2),
        "all_five_requested_roots_present": True,
        "critical_service_nginx_receipt_files_present": True,
        "live_release_files_present": True,
        "filesystem_extraction_test_completed": False,
        "application_startup_restore_test_completed": False,
        "production_modified": False,
        "archive_deleted": False,
    }


def main():
    if os.geteuid() != 0:
        raise RuntimeError("ROOT_REQUIRED")
    if ARCHIVE.is_symlink() or not ARCHIVE.is_file():
        raise RuntimeError("PINNED_APP_ARCHIVE_MISSING")
    s = ARCHIVE.stat()
    if s.st_uid != 0 or stat.S_IMODE(s.st_mode) & 0o077:
        raise RuntimeError("APP_ARCHIVE_NOT_ROOT_PRIVATE")
    if s.st_size <= 1024 or s.st_size >= MAX_GZIP_BYTES:
        raise RuntimeError("APP_ARCHIVE_SIZE_OUT_OF_BOUNDS")
    if file_digest(ARCHIVE) != EXPECTED_SHA256:
        raise RuntimeError("APPLICATION_ARCHIVE_SHA256_MISMATCH")
    result = inspect_archive(ARCHIVE)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    try:
        main()
    except BaseException as exc:
        reason = str(exc) if isinstance(exc, RuntimeError) else type(exc).__name__.upper()
        if not re.fullmatch(r"[A-Z_0-9]+", reason):
            reason = "VERIFICATION_FAILED"
        print(json.dumps({
            "result": "APP_ARCHIVE_VERIFICATION_ABORTED",
            "safe_reason": reason,
            "production_changed": False,
            "archive_deleted": False,
            "file_contents_printed": False,
        }, indent=2))
        sys.exit(1)
