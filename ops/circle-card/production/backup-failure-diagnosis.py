#!/usr/bin/env python3
"""Read-only PostgreSQL backup failure diagnosis against the verified LIVE app.

The only database SQL is SHOW server_version_num. Optionally probes a schema-only
pg_dump into /dev/null, and only when server/client versions are compatible.
No database records, SQL schema, passwords, hostnames or raw errors are printed.
Never writes a dump or changes any application, systemd or database settings.
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
from urllib.parse import urlsplit

SELF = Path(__file__).resolve()
SOURCE = SELF.with_name("one-shot-safety-backup.py")
spec = importlib.util.spec_from_file_location("circle_card_database_safety", SOURCE)
if spec is None or spec.loader is None:
    raise RuntimeError("Cannot load guarded live production checks")
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)


def postgres_urls(pid):
    raw = (Path("/proc") / str(pid) / "environ").read_bytes()
    result = {}
    for part in raw.split(b"\0"):
        k, sep, v = part.partition(b"=")
        if sep and k in (b"PRODUCTION_DATABASE_URL", b"DIRECT_URL", b"DATABASE_URL"):
            key = k.decode("ascii")
            if key in ("DIRECT_URL", "DATABASE_URL"):
                try:
                    result[key] = guard.sanitized_pg_url(v.decode("utf-8", errors="strict"))
                except (UnicodeDecodeError, RuntimeError):
                    result[key] = None
    return result


def error_signals(stderr):
    raw = stderr.decode("utf8", errors="replace").lower()
    # Output only predefined, fixed category strings. No error messages.
    patterns = {
        "connection_failed": r"could not connect|connection .* failed|connection refused|connection timed out",
        "postgres_fatal": r"\bfatal\b",
        "sql_error": r"\berror\b",
        "unknown_option": r"unrecognized option|unknown option|invalid option",
        "password_or_authentication": r"password|authentication|no pg_hba",
        "role_not_found": r"role .* does not exist",
        "server_version": r"server version|server_version",
        "client_version": r"pg_dump version|client version",
        "version_incompatibility": r"version mismatch|server version not supported|incompatible",
        "permissions": r"permission denied|not permitted|not allowed",
        "timeout_or_lock": r"timeout|timed out|could not obtain lock",
        "transaction_or_pooler": r"transaction|pgbouncer|pooler|prepared statement",
        "file_or_disk": r"file|no space left|disk|write|filesystem",
        "missing_database": r"database .*does not exist",
        "missing_socket": r"socket|no such file or directory",
        "host_resolution": r"could not translate host name|could not resolve|name or service not known",
        "pg_dump_hint": r"pg_dump:",
        "query": r"query|statement",
        "recovery_mode": r"recovery mode|standby",
        "unrecognized_connection_parameter": r"invalid uri|invalid connection|invalid connection option|unknown parameter",
    }
    return [name for name, pattern in patterns.items() if re.search(pattern, raw)]


def query_version(uri, executable):
    if not executable:
        return {"result": "PSQL_NOT_INSTALLED"}
    env = dict(os.environ)
    env["PGDATABASE"] = uri
    env["PGCONNECT_TIMEOUT"] = "10"
    env["PGAPPNAME"] = "circle_card_readonly_backup_diagnosis"
    args = [
        executable, "--no-psqlrc", "--quiet", "--tuples-only", "--no-align",
        "--set=ON_ERROR_STOP=1", "--command", "SHOW server_version_num",
    ]
    try:
        proc = subprocess.run(args, env=env, capture_output=True, timeout=20, check=False)
    except subprocess.TimeoutExpired:
        return {"result": "TIMEOUT"}
    if proc.returncode:
        return {
            "result": "CONNECTION_FAILED",
            "exit_code": proc.returncode,
            "error_category": guard.classify_pg_dump_failure(proc.stderr),
            "signals": error_signals(proc.stderr),
            "stderr_nonempty": bool(proc.stderr.strip()),
        }
    value = proc.stdout.decode("ascii", errors="ignore").strip()
    if not re.fullmatch(r"\d{5,7}", value):
        return {"result": "UNEXPECTED_SERVER_VERSION_OUTPUT"}
    return {"result": "CONNECTED", "server_major": int(value) // 10000,
            "server_version_num": int(value)}


def probe_schema_dump(uri, executable):
    if not executable:
        return {"result": "PG_DUMP_NOT_INSTALLED"}
    env = dict(os.environ)
    env["PGDATABASE"] = uri
    env["PGCONNECT_TIMEOUT"] = "10"
    env["PGAPPNAME"] = "circle_card_schema_only_dump_diagnosis"
    # This reads the schema, then writes the output to /dev/null. No backup is
    # created, no production data is changed, no user table rows are dumped.
    args = [
        executable, "--schema-only", "--format=custom", "--no-owner",
        "--no-privileges", "--lock-wait-timeout=3000", "--file=/dev/null",
    ]
    try:
        proc = subprocess.run(args, env=env, stdout=subprocess.DEVNULL,
                              stderr=subprocess.PIPE, timeout=45, check=False)
    except subprocess.TimeoutExpired:
        return {"result": "TIMEOUT"}
    if proc.returncode:
        return {
            "result": "FAILED",
            "exit_code": proc.returncode,
            "error_category": guard.classify_pg_dump_failure(proc.stderr),
            "signals": error_signals(proc.stderr),
            "stderr_bytes": len(proc.stderr),
        }
    return {"result": "SCHEMA_ONLY_SUCCESS", "production_database_mutated": False}


def main():
    if os.geteuid() != 0:
        raise RuntimeError("ROOT_REQUIRED")
    pid = guard.check_live()
    urls = postgres_urls(pid)
    pg_dump = shutil.which("pg_dump")
    psql = shutil.which("psql")
    version = guard.safe_version(pg_dump) if pg_dump else None
    m = re.match(r"(\d+)", version or "")
    client_major = int(m.group(1)) if m else None
    output = {
        "mode": "READ_ONLY_DATABASE_BACKUP_FAILURE_DIAGNOSIS",
        "live_site_verified": True,
        "installed_pg_dump_version": version,
        "installed_pg_dump_clients": guard.installed_dump_clients(),
        "database_sources": {},
        "read_only": True,
        "database_writes": False,
        "dump_file_written": False,
        "connection_secrets_printed": False,
        "recommendation": "Use the findings to repair the manual backup. No automatic recovery change authorised.",
    }
    for name in ("DIRECT_URL", "DATABASE_URL"):
        uri = urls.get(name)
        if not uri:
            output["database_sources"][name] = {"result": "UNAVAILABLE"}
            continue
        # Hash the database name only for comparing that two URLs target the
        # same named database; do not print the name itself.
        db_name = urlsplit(uri).path
        found = {"result": "PARSED", "database_identifier": hashlib.sha256(
            db_name.encode("utf8")).hexdigest()[:12],
            "has_explicit_username": urlsplit(uri).username is not None}
        server = query_version(uri, psql)
        found["connection"] = server
        if server.get("result") == "CONNECTED":
            server_major = server.get("server_major")
            if client_major is not None and server_major > client_major:
                found["schema_probe"] = {
                    "result": "SKIPPED_CLIENT_TOO_OLD",
                    "server_major": server_major,
                    "client_major": client_major,
                }
            else:
                found["schema_probe"] = probe_schema_dump(uri, pg_dump)
        output["database_sources"][name] = found
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    try:
        main()
    except BaseException as e:
        # Error message may contain a secret in an unexpected exception.
        print(json.dumps({"mode": "READ_ONLY_DATABASE_BACKUP_FAILURE_DIAGNOSIS",
                          "result": "ABORTED", "exception_type": type(e).__name__,
                          "raw_error_printed": False}, indent=2))
        raise SystemExit(1)
