#!/usr/bin/env python3
"""Safely snapshot the ACTUAL active Circle Card application for a rollback.

Default --check is read-only. --backup creates a new private compressed tarball
containing the exact active release, Nginx vhost file, systemd unit and native
deployment receipt. It never writes to source files, services or databases.

This captures a filesystem snapshot at a point in time, not a verified
application restore and not independently hosted/offsite disaster recovery.
External assets referenced by symbolic links are not dereferenced.
"""
from __future__ import annotations
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import resource
import shutil
import subprocess
import sys
import tarfile
import tempfile

ROOT = Path("/var/backups/circle-card-safety")
LIVE = Path("/var/www/releases/circle-card-bransons-account-20261109-115143")
SERVICE = "circle-card-bransons-account-20261109-115143.service"
UNIT = Path("/etc/systemd/system") / SERVICE
NGINX = Path("/etc/nginx/sites-enabled/circlecard.co.uk")
RECEIPT = Path("/var/lib/circle-card-bransons-account/20261109-115143/deployment.json")
BRANSONS_STATIC_SAMPLES = Path("/var/www/circle-card-samples-bransons")
DATABASE_COPY = ROOT / "circle-card-db-20261111T232300Z.dump"
DB_SHA = "1cc9b8cc72d8da831c17cda6c77eb51e2a459714e0f95c18773950fee796dad7"
MAX_TAR_BYTES = 4 * (1024 ** 3)
MIN_DISK_FREE = 5 * (1024 ** 3)
MAX_UNCOMPRESSED_ESTIMATE = 10 * (1024 ** 3)


def safe_output(cmd):
    p = subprocess.run(cmd, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                       stderr=subprocess.DEVNULL, text=True, timeout=20, check=False)
    if p.returncode:
        raise RuntimeError("EXTERNAL_VALIDATION_FAILED")
    return p.stdout


def status():
    props = safe_output(["systemctl", "show", SERVICE, "--no-pager",
                         "--property=ActiveState,MainPID,WorkingDirectory"])
    return dict(line.split("=", 1) for line in props.splitlines() if "=" in line)


def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def sources():
    if os.geteuid() != 0:
        raise RuntimeError("ROOT_REQUIRED")
    p = status()
    if p.get("ActiveState") != "active" or p.get("WorkingDirectory") != str(LIVE):
        raise RuntimeError("LIVE_SERVICE_MISMATCH")
    try:
        pid = int(p.get("MainPID", "0"))
        cwd = (Path("/proc") / str(pid) / "cwd").resolve(strict=True)
    except (ValueError, OSError, RuntimeError):
        raise RuntimeError("LIVE_PID_MISMATCH") from None
    if pid < 2 or cwd != LIVE:
        raise RuntimeError("LIVE_PROCESS_MISMATCH")
    if not LIVE.is_dir() or LIVE.is_symlink() or not UNIT.is_file() or UNIT.is_symlink():
        raise RuntimeError("RELEASE_OR_UNIT_UNAVAILABLE")
    nginx_real = NGINX.resolve(strict=True)
    if not str(nginx_real).startswith("/etc/nginx/") or not nginx_real.is_file():
        raise RuntimeError("NGINX_CONFIG_UNSAFE")
    if not RECEIPT.is_file() or RECEIPT.is_symlink():
        raise RuntimeError("NATIVE_DEPLOYMENT_RECEIPT_MISSING")
    try:
        receipt = json.loads(RECEIPT.read_text(encoding="utf8"))
    except (OSError, ValueError):
        raise RuntimeError("NATIVE_DEPLOYMENT_RECEIPT_INVALID") from None
    if not (receipt.get("release") == str(LIVE) and receipt.get("service") == SERVICE
            and receipt.get("port") == 3386):
        raise RuntimeError("NATIVE_DEPLOYMENT_RECEIPT_MISMATCH")
    health = safe_output([
        "curl", "--noproxy", "*", "--silent", "--show-error",
        "--output", "/dev/null", "--write-out", "%{http_code}",
        "--max-time", "15", "--header", "Host: circlecard.co.uk",
        "--header", "X-Forwarded-Proto: https",
        "http://127.0.0.1:3386/login",
    ]).strip()
    if health != "200":
        raise RuntimeError("LIVE_HTTP_CHECK_FAILED")
    if not ROOT.is_dir() or ROOT.is_symlink() or ROOT.stat().st_uid != 0 or ROOT.stat().st_mode & 0o077:
        raise RuntimeError("PRIVATE_BACKUP_DIRECTORY_UNAVAILABLE")
    if not DATABASE_COPY.is_file() or DATABASE_COPY.is_symlink() or digest(DATABASE_COPY) != DB_SHA:
        raise RuntimeError("DATABASE_BACKUP_NOT_VERIFIED")
    if shutil.disk_usage(ROOT).free < MIN_DISK_FREE:
        raise RuntimeError("INSUFFICIENT_DISK_SPACE")
    if RECEIPT.parent.is_symlink():
        raise RuntimeError("NATIVE_DEPLOYMENT_STATE_PATH_UNSAFE")
    paths = [LIVE, UNIT, nginx_real, RECEIPT.parent]
    if BRANSONS_STATIC_SAMPLES.exists() or BRANSONS_STATIC_SAMPLES.is_symlink():
        if BRANSONS_STATIC_SAMPLES.is_symlink() or not BRANSONS_STATIC_SAMPLES.is_dir():
            raise RuntimeError("BRANSONS_STATIC_ASSETS_UNSAFE")
        paths.append(BRANSONS_STATIC_SAMPLES)
    # Inode-sized estimate doesn't follow symlinks; tar may be larger due to
    # headers. Enforce output size hard limit as well.
    file_count = 0
    total_size = 0
    symlink_count = 0
    for path in paths:
        tree = path.rglob("*") if path.is_dir() else (path,)
        for item in tree:
            if item.is_symlink():
                symlink_count += 1
                continue
            try:
                stat = item.lstat()
            except OSError:
                raise RuntimeError("RELEASE_FILE_UNREADABLE") from None
            if item.is_file():
                total_size += stat.st_size
                file_count += 1
            if total_size > MAX_UNCOMPRESSED_ESTIMATE:
                raise RuntimeError("RELEASE_TOO_LARGE_FOR_SAFE_SNAPSHOT")
    return {"paths": paths, "pid": pid, "uncompressed_estimate_mib": round(total_size/1048576, 1),
            "file_count": file_count, "symlinks_not_dereferenced": symlink_count}


def filter_item(info):
    if info.ischr() or info.isblk() or info.isfifo():
        raise RuntimeError("UNSAFE_DEVICE_IN_RELEASE")
    return info


def backup(ctx):
    os.umask(0o077)
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    output = ROOT / f"circle-card-app-{stamp}.tar.gz"
    if output.exists():
        raise RuntimeError("BACKUP_ALREADY_EXISTS")
    with tempfile.NamedTemporaryFile(prefix=".creating-app-", suffix=".tar.gz",
                                     dir=ROOT, delete=False) as f:
        temporary = Path(f.name)
    try:
        resource.setrlimit(resource.RLIMIT_FSIZE, (MAX_TAR_BYTES, MAX_TAR_BYTES))
        with tarfile.open(temporary, "w:gz", compresslevel=1, dereference=False) as tar:
            for item in ctx["paths"]:
                tar.add(str(item), arcname=str(item).lstrip("/"), recursive=True, filter=filter_item)
        if temporary.stat().st_size < 1024:
            raise RuntimeError("APP_ARCHIVE_UNEXPECTEDLY_SMALL")
        with tarfile.open(temporary, "r:gz") as tar:
            entries = tar.getmembers()
            if len(entries) < 100 or not any(m.name.startswith("var/www/releases/circle-card-bransons-account-20261109-115143") for m in entries):
                raise RuntimeError("APP_ARCHIVE_INCOMPLETE")
        if status().get("MainPID") != str(ctx["pid"]):
            raise RuntimeError("LIVE_PROCESS_CHANGED_DURING_COPY")
        value = digest(temporary)
        with temporary.open("rb") as fd:
            os.fsync(fd.fileno())
        temporary.rename(output)
        meta = {
            "result": "LIVE_APPLICATION_FILES_ARCHIVED",
            "created_utc": stamp,
            "archive_path": str(output),
            "archive_size_mib": round(output.stat().st_size/1048576, 2),
            "sha256": value,
            "included_root_paths": [str(p) for p in ctx["paths"]],
            "entries_validated": len(entries),
            "database_archive_previously_restored": True,
            "separate_application_restore_test_completed": False,
            "external_symlink_targets_not_dereferenced": True,
            "secret_values_printed": False,
        }
        (ROOT / f"circle-card-app-{stamp}.json").write_text(json.dumps(meta,indent=2))
        print(json.dumps(meta,indent=2))
    except BaseException:
        temporary.unlink(missing_ok=True)
        raise


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--backup", action="store_true",
                   help="Create a new root-private application rollback archive")
    args = p.parse_args()
    context = sources()
    if args.backup:
        backup(context)
    else:
        print(json.dumps({
            "result": "APP_BACKUP_PRECHECK_READY",
            "uncompressed_estimate_mib": context["uncompressed_estimate_mib"],
            "file_count": context["file_count"],
            "symlinks_not_dereferenced": context["symlinks_not_dereferenced"],
            "database_archive_hash_verified": True,
            "writes_made": False,
        }, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        reason = str(exc) if isinstance(exc, RuntimeError) else type(exc).__name__.upper()
        if not re.fullmatch(r"[A-Z0-9_]+",reason):
            reason = "UNCLASSIFIED_SNAPSHOT_ERROR"
        print(json.dumps({"result": "APP_BACKUP_ABORTED",
                          "reason": reason, "live_files_unchanged": True,
                          "secrets_printed": False},indent=2))
        sys.exit(1)
