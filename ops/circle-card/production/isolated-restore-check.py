#!/usr/bin/env python3
"""Restore an exact Circle Card backup inside a new isolated PostgreSQL 14 cluster.

Default --check is read-only; --restore-test creates a disposable, local-only
PostgreSQL 14 cluster in /var/tmp, restores the pinned *existing* archive,
checks restored tables, stops the isolated cluster and removes that cluster.

Never connects to the production database, never changes a production DB or
web service, never deletes a backup. No connection secrets are used.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import pwd
import re
import shutil
import subprocess
import sys
import tempfile

ARCHIVE = Path("/var/backups/circle-card-safety/circle-card-db-20261111T232300Z.dump")
EXPECTED_HASH = "1cc9b8cc72d8da831c17cda6c77eb51e2a459714e0f95c18773950fee796dad7"
PG_BIN = Path("/usr/lib/postgresql/14/bin")
EXPECTED_SERVICE = "circle-card-bransons-account-20261109-115143.service"
PG_PORT = "54329"
RESTORE_NAME = "circle_card_restore_validation"
MIN_AVAILABLE_BYTES = 3 * 1024 ** 3
MAX_ARCHIVE_BYTES = 1 * 1024 ** 3


def call(command, *, timeout=60, env=None):
    return subprocess.run(command, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE, text=True, timeout=timeout,
                          env=env, check=False)


def run_as_pg(command, *, timeout=60, env=None):
    return call(["runuser", "-u", "postgres", "--", *[str(x) for x in command]],
                timeout=timeout, env=env)


def live_health():
    p = call(["systemctl", "show", EXPECTED_SERVICE, "--property=ActiveState,WorkingDirectory"])
    props = dict(line.split("=", 1) for line in p.stdout.splitlines() if "=" in line)
    if (p.returncode or props.get("ActiveState") != "active"
            or props.get("WorkingDirectory") != "/var/www/releases/circle-card-bransons-account-20261109-115143"):
        raise RuntimeError("LIVE_SERVICE_CHANGED")
    h = call([
        "curl", "--noproxy", "*", "--silent", "--show-error", "--output", "/dev/null",
        "--write-out", "%{http_code}", "--max-time", "15",
        "--header", "Host: circlecard.co.uk",
        "--header", "X-Forwarded-Proto: https", "http://127.0.0.1:3386/login",
    ], timeout=19)
    if h.returncode or h.stdout.strip() != "200":
        raise RuntimeError("LIVE_HTTP_UNHEALTHY")


def hash_file(file):
    digest = hashlib.sha256()
    with file.open("rb") as fp:
        for data in iter(lambda: fp.read(1024 * 1024), b""):
            digest.update(data)
    return digest.hexdigest()


def checks():
    if os.geteuid() != 0:
        raise RuntimeError("ROOT_REQUIRED")
    if ARCHIVE.is_symlink() or not ARCHIVE.is_file():
        raise RuntimeError("EXACT_ARCHIVE_NOT_FOUND")
    stat = ARCHIVE.stat()
    if stat.st_uid != 0 or stat.st_mode & 0o077:
        raise RuntimeError("ARCHIVE_NOT_ROOT_PRIVATE")
    if not 1024 * 1024 < stat.st_size < MAX_ARCHIVE_BYTES:
        raise RuntimeError("ARCHIVE_SIZE_OUTSIDE_SAFETY_RANGE")
    if hash_file(ARCHIVE) != EXPECTED_HASH:
        raise RuntimeError("ARCHIVE_CHECKSUM_MISMATCH")
    if not shutil.which("runuser"):
        raise RuntimeError("RUNUSER_NOT_AVAILABLE")
    try:
        pg = pwd.getpwnam("postgres")
    except KeyError:
        raise RuntimeError("POSTGRES_OS_USER_MISSING") from None
    for binary in ("initdb", "pg_ctl", "pg_restore", "psql", "createdb"):
        path = PG_BIN / binary
        if not path.is_file() or not os.access(path, os.X_OK):
            raise RuntimeError(f"POSTGRES_14_{binary.upper()}_MISSING")
    if Path("/var/tmp").is_symlink() or not Path("/var/tmp").is_dir():
        raise RuntimeError("ISOLATED_TEMP_PARENT_INVALID")
    if shutil.disk_usage("/var/tmp").free < MIN_AVAILABLE_BYTES:
        raise RuntimeError("INSUFFICIENT_DISK_FOR_ISOLATED_RESTORE")
    check_archive = call([str(PG_BIN / "pg_restore"), "--list", str(ARCHIVE)], timeout=25)
    if check_archive.returncode:
        raise RuntimeError("ARCHIVE_LIST_UNREADABLE")
    entries = check_archive.stdout.splitlines()
    tables = sum(bool(re.search(r"\sTABLE DATA\s", line)) for line in entries)
    if tables < 1:
        raise RuntimeError("ARCHIVE_HAS_NO_TABLE_DATA")
    live_health()
    return {"pg_uid": pg.pw_uid, "pg_gid": pg.pw_gid,
            "archive_size_mib": round(stat.st_size / 1048576, 2),
            "archive_sha256": EXPECTED_HASH, "table_data_entries": tables}


def local_environment(socket):
    # No inherited PostgreSQL connection information may affect this test.
    env = {k: v for k, v in os.environ.items() if not k.startswith("PG")}
    env.update({
        "PGHOST": str(socket),
        "PGPORT": PG_PORT,
        "PGUSER": "postgres",
        "PGDATABASE": "postgres",
        "PGCONNECT_TIMEOUT": "8",
        "PGAPPNAME": "circle_card_isolated_archive_restore_test",
    })
    return env


def restore_test(ctx):
    os.umask(0o077)
    root = Path(tempfile.mkdtemp(prefix="circle-card-restore-qa-", dir="/var/tmp"))
    data, socket, log = root / "cluster", root / "socket", root / "postgres.log"
    os.chown(root, ctx["pg_uid"], ctx["pg_gid"])
    os.chmod(root, 0o700)
    socket.mkdir(mode=0o700)
    os.chown(socket, ctx["pg_uid"], ctx["pg_gid"])
    isolated_archive = root / "archive.dump"
    started = False
    keep_directory = False
    result = {}
    try:
        shutil.copyfile(ARCHIVE, isolated_archive)
        os.chmod(isolated_archive, 0o600)
        os.chown(isolated_archive, ctx["pg_uid"], ctx["pg_gid"])
        if hash_file(isolated_archive) != EXPECTED_HASH:
            raise RuntimeError("ISOLATED_ARCHIVE_COPY_CHECKSUM_MISMATCH")
        init = run_as_pg([
            PG_BIN / "initdb", "--pgdata", data, "--encoding=UTF8",
            "--locale=C", "--auth-local=trust", "--auth-host=reject", "--no-instructions",
        ], timeout=80)
        if init.returncode:
            raise RuntimeError("ISOLATED_INITDB_FAILED")
        config = data / "postgresql.conf"
        # The new local cluster only listens on an isolated private Unix socket.
        # The port is irrelevant for production because TCP is explicitly off.
        with config.open("a", encoding="utf-8") as fp:
            fp.write("\nlisten_addresses = ''\n")
            fp.write(f"unix_socket_directories = '{socket}'\n")
            fp.write(f"port = {PG_PORT}\n")
        start = run_as_pg([
            PG_BIN / "pg_ctl", "-D", data, "-l", log,
            "-w", "-t", "30", "start",
        ], timeout=45)
        if start.returncode:
            raise RuntimeError("ISOLATED_POSTGRES_START_FAILED")
        started = True
        env = local_environment(socket)
        db = run_as_pg([
            PG_BIN / "createdb", "--host", socket, "--port", PG_PORT,
            "--username", "postgres", "--maintenance-db", "postgres",
            RESTORE_NAME,
        ], timeout=30, env=env)
        if db.returncode:
            raise RuntimeError("ISOLATED_DATABASE_CREATION_FAILED")
        restore = run_as_pg([
            PG_BIN / "pg_restore", "--host", socket, "--port", PG_PORT,
            "--username", "postgres", "--dbname", RESTORE_NAME,
            "--no-owner", "--no-privileges", "--exit-on-error",
            "--single-transaction", str(isolated_archive),
        ], timeout=240, env=env)
        if restore.returncode:
            raise RuntimeError("ISOLATED_PG_RESTORE_FAILED")
        sql = ("SELECT COUNT(*) FROM information_schema.tables "
               "WHERE table_schema='public' AND table_type='BASE TABLE'")
        read = run_as_pg([
            PG_BIN / "psql", "--host", socket, "--port", PG_PORT,
            "--username", "postgres", "--dbname", RESTORE_NAME,
            "--no-psqlrc", "--quiet", "--tuples-only", "--no-align",
            "--set=ON_ERROR_STOP=1", "--command", sql,
        ], timeout=20, env=env)
        if read.returncode or not re.fullmatch(r"\d+", read.stdout.strip()):
            raise RuntimeError("RESTORED_TABLE_COUNT_QUERY_FAILED")
        table_count = int(read.stdout.strip())
        if table_count < 1:
            raise RuntimeError("RESTORED_DATABASE_EMPTY")
        live_health()
        result = {
            "result": "RESTORE_TEST_PASSED",
            "isolated_postgres_version": 14,
            "restored_public_tables": table_count,
            "archive_table_data_entries": ctx["table_data_entries"],
            "archive_sha256_verified": True,
            "production_database_connected_to": False,
            "production_database_modified": False,
            "production_app_healthy": True,
        }
    finally:
        if started:
            stop = run_as_pg([PG_BIN / "pg_ctl", "-D", data,
                              "-w", "-t", "30", "-m", "fast", "stop"], timeout=42)
            if stop.returncode:
                keep_directory = True
        # If starting failed, check that a server did not survive before deleting.
        else:
            status = run_as_pg([PG_BIN / "pg_ctl", "-D", data, "status"], timeout=8)
            if status.returncode == 0:
                keep_directory = True
        if not keep_directory and root.parent == Path("/var/tmp") and root.name.startswith("circle-card-restore-qa-"):
            shutil.rmtree(root)
        if keep_directory:
            raise RuntimeError("ISOLATED_POSTGRES_STOP_UNCONFIRMED_DIRECTORY_PRESERVED")
    result["isolated_cluster_stopped_and_deleted"] = True
    print(json.dumps(result, indent=2))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--restore-test", action="store_true", help="Create and verify an isolated temporary Postgres 14 restore")
    opts = parser.parse_args()
    ctx = checks()
    if opts.restore_test:
        restore_test(ctx)
    else:
        print(json.dumps({
            "result": "RESTORE_TEST_PRECHECK_READY",
            "archive_size_mib": ctx["archive_size_mib"],
            "archive_sha256_verified": True,
            "archive_table_data_entries": ctx["table_data_entries"],
            "production_app_healthy": True,
            "production_changes": False,
        }, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        # Fixed error codes only; no raw messages, database contents or stack traces.
        reason = str(exc) if isinstance(exc, RuntimeError) else type(exc).__name__
        if not re.fullmatch(r"[A-Z0-9_]+", reason):
            reason = type(exc).__name__
        print(json.dumps({"result": "RESTORE_TEST_ABORTED",
                          "reason_code": reason,
                          "production_database_modified": False,
                          "archive_deleted": False}, indent=2))
        sys.exit(1)
