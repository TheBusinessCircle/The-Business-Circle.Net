#!/usr/bin/env python3
"""Create an isolated manual PostgreSQL safety dump from the ACTIVE Circle Card app.

Default mode --check is read-only. --backup writes only a new, private database
archive and metadata under /var/backups/circle-card-safety. It does not modify
Circle Card, Nginx, systemd, live records, database schemas, or recovery timer.

This creates a PostgreSQL archive and verifies archive readability, but it DOES
NOT claim a successful restore test. Keep app/state backups separate.
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
import tempfile
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

LIVE_SERVICE = "circle-card-bransons-account-20261109-115143.service"
LIVE_RELEASE = "/var/www/releases/circle-card-bransons-account-20261109-115143"
BACKUP_ROOT = Path("/var/backups/circle-card-safety")
MIN_DISK_BYTES = 5 * (1024 ** 3)
MAX_DUMP_BYTES = 2 * (1024 ** 3)
SAFE_CLIENT_KEYS = {
    "sslmode", "sslcert", "sslkey", "sslrootcert", "connect_timeout",
    "application_name", "target_session_attrs", "options", "sslnegotiation",
    "host", "hostaddr", "port", "service", "passfile", "gssencmode",
}


def run(arguments, *, env=None, timeout=25):
    return subprocess.run(arguments, env=env, stdout=subprocess.PIPE,
                          stderr=subprocess.DEVNULL, text=True,
                          timeout=timeout, check=False)


def property_values():
    p = run(["systemctl", "show", LIVE_SERVICE, "--no-pager",
             "--property=ActiveState,MainPID,WorkingDirectory"])
    if p.returncode:
        raise RuntimeError("Could not read live service identity")
    return dict(line.split("=", 1) for line in p.stdout.splitlines() if "=" in line)


def check_live():
    props = property_values()
    if props.get("ActiveState") != "active" or props.get("WorkingDirectory") != LIVE_RELEASE:
        raise RuntimeError("Current live service differs from expected release")
    try:
        pid = int(props.get("MainPID", "0"))
        real = str((Path("/proc") / str(pid) / "cwd").resolve(strict=True))
    except (OSError, ValueError):
        raise RuntimeError("Cannot verify live process directory") from None
    if pid < 2 or real != LIVE_RELEASE:
        raise RuntimeError("Live process does not match pinned release")
    sockets = run(["ss", "-H", "-lntp"])
    if sockets.returncode or not any(
        "127.0.0.1:3386" in line and f"pid={pid}," in line
        for line in sockets.stdout.splitlines()
    ):
        raise RuntimeError("Live process does not own loopback port 3386")
    for path in ("/login", "/card/hucknall-circle-hub"):
        result = run(["curl", "--noproxy", "*", "-sS",
                      "--output", "/dev/null", "--write-out", "%{http_code}",
                      "--max-time", "18", "--header", "Host: circlecard.co.uk",
                      "--header", "X-Forwarded-Proto: https",
                      "http://127.0.0.1:3386" + path], timeout=22)
        if result.returncode or result.stdout.strip() != "200":
            raise RuntimeError("Production application health check failed")
    return pid


def extract_process_database_url(pid):
    # Reading /proc is limited to root; never echo database connection details.
    contents = (Path("/proc") / str(pid) / "environ").read_bytes()
    values = {}
    for part in contents.split(b"\0"):
        key, sep, value = part.partition(b"=")
        if sep and key in {b"DATABASE_URL", b"DIRECT_URL"}:
            values[key.decode()] = value.decode("utf-8", errors="strict")
    # Direct connection is preferred for pg_dump over transaction poolers.
    return values.get("DIRECT_URL") or values.get("DATABASE_URL"), "process_environment"


def sanitized_pg_url(url):
    if not url or not isinstance(url, str):
        raise RuntimeError("No runtime database URL is available; aborting")
    if not url.startswith(("postgres://", "postgresql://")):
        raise RuntimeError("Unexpected database connection type; aborting")
    p = urlsplit(url)
    if not p.hostname or not p.path or p.path == "/":
        raise RuntimeError("Database URI is missing a host or database name")
    if p.fragment:
        raise RuntimeError("Unexpected fragment in database connection")
    values = parse_qsl(p.query, keep_blank_values=True)
    extra = {k for k, _ in values if k not in SAFE_CLIENT_KEYS}
    # Reject unknown parameters rather than making a different connection.
    if extra - {"schema", "pgbouncer", "connection_limit", "pool_timeout"}:
        raise RuntimeError("Database URL has unsupported connection parameters")
    query = urlencode([(k, v) for k, v in values if k in SAFE_CLIENT_KEYS])
    return urlunsplit((p.scheme, p.netloc, p.path, query, ""))


def safe_root(create=False):
    parent = BACKUP_ROOT.parent
    if parent.is_symlink() or not parent.is_dir():
        raise RuntimeError("Backup parent is missing or a symlink")
    if BACKUP_ROOT.exists() or BACKUP_ROOT.is_symlink():
        if BACKUP_ROOT.is_symlink() or not BACKUP_ROOT.is_dir():
            raise RuntimeError("Backup root must be a real directory")
        st = BACKUP_ROOT.stat()
        if st.st_uid != 0 or st.st_mode & 0o077:
            raise RuntimeError("Backup directory must be root-owned and private")
    elif create:
        BACKUP_ROOT.mkdir(mode=0o700)
    return BACKUP_ROOT


def guard_environment():
    if os.geteuid() != 0:
        raise RuntimeError("Root access is required for protected live process validation")
    pid = check_live()
    pg_dump = shutil.which("pg_dump")
    pg_restore = shutil.which("pg_restore")
    if not pg_dump or not pg_restore:
        raise RuntimeError("PostgreSQL dump and restore tools not installed; no backup attempted")
    url, source = extract_process_database_url(pid)
    pgurl = sanitized_pg_url(url)
    safe_root(create=False)
    disk = shutil.disk_usage(str(BACKUP_ROOT.parent)).free
    if disk < MIN_DISK_BYTES:
        raise RuntimeError("Less than 5 GiB disk available; no backup attempted")
    return {"pid": pid, "pg_dump": pg_dump, "pg_restore": pg_restore,
            "pg_url": pgurl, "disk_gib": round(disk / (1024 ** 3), 2),
            "url_source": source}


def dump_limit():
    resource.setrlimit(resource.RLIMIT_FSIZE, (MAX_DUMP_BYTES, MAX_DUMP_BYTES))


def fingerprint(file):
    digest = hashlib.sha256()
    with file.open("rb") as f:
        while True:
            block = f.read(1024 * 1024)
            if not block:
                break
            digest.update(block)
    return digest.hexdigest()


def backup(context):
    os.umask(0o077)
    safe_root(create=True)
    timestamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    dest = BACKUP_ROOT / f"circle-card-db-{timestamp}.dump"
    if dest.exists():
        raise RuntimeError("Backup destination exists; refusing to overwrite")
    with tempfile.NamedTemporaryFile(dir=BACKUP_ROOT, prefix=".creating-", suffix=".dump",
                                     delete=False) as fd:
        scratch = Path(fd.name)
    try:
        # A connection URI in PGDATABASE is parsed by libpq and does not
        # appear on the command line. Never display subprocess stderr.
        env = dict(os.environ)
        env["PGDATABASE"] = context["pg_url"]
        env["PGCONNECT_TIMEOUT"] = "15"
        env["PGAPPNAME"] = "circle_card_oneshot_backup"
        result = subprocess.run([
            context["pg_dump"], "--format=custom", "--compress=6",
            "--no-owner", "--no-privileges", "--lock-wait-timeout=3000",
            "--file", str(scratch)
        ], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
           timeout=240, check=False, preexec_fn=dump_limit)
        if result.returncode:
            raise RuntimeError("pg_dump could not complete; incomplete dump is discarded")
        if scratch.stat().st_size < 1024:
            raise RuntimeError("Dump is unexpectedly small")
        check = subprocess.run([context["pg_restore"], "--list", str(scratch)],
                               stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                               text=True, timeout=45, check=False)
        if check.returncode or len(check.stdout.splitlines()) < 12:
            raise RuntimeError("Archive list verification failed")
        before_pid = property_values().get("MainPID")
        if before_pid != str(context["pid"]):
            raise RuntimeError("Live service changed during backup")
        size = scratch.stat().st_size
        checksum = fingerprint(scratch)
        with scratch.open("rb") as file:
            os.fsync(file.fileno())
        scratch.rename(dest)
        metadata = {"result": "DATABASE_ARCHIVE_CREATED_AND_READABLE",
                    "created_utc": timestamp,
                    "path": str(dest), "size_mib": round(size / 1048576, 2),
                    "sha256": checksum, "archive_list_verified": True,
                    "full_restore_test_verified": False,
                    "application_release": LIVE_RELEASE,
                    "database_contents_printed": False}
        (BACKUP_ROOT / f"circle-card-db-{timestamp}.json").write_text(
            json.dumps(metadata, indent=2))
        print(json.dumps(metadata, indent=2))
    except BaseException:
        try:
            scratch.unlink(missing_ok=True)
        except OSError:
            pass
        raise


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--backup", action="store_true",
                        help="Write new private one-shot PostgreSQL dump and verify archive list")
    args = parser.parse_args()
    ctx = guard_environment()
    if args.backup:
        backup(ctx)
    else:
        print(json.dumps({
            "result": "SAFE_DATABASE_DUMP_PRECHECK_READY",
            "disk_gib": ctx["disk_gib"],
            "database_url_available_from_live_process": True,
            "postgresql_tools_installed": True,
            "live_site_healthy": True,
            "backup_written": False,
            "full_restore_test_verified": False,
        }, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        # Do not echo exceptions containing URLs or credentials.
        code = "BACKUP_PRECHECK_OR_DUMP_ABORTED"
        print(json.dumps({"result": code, "error_type": type(exc).__name__,
                          "credentials_printed": False}, indent=2))
        sys.exit(1)
