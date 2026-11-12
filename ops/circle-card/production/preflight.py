#!/usr/bin/env python3
"""Read-only Circle Card VPS release inventory. No credentials or file contents are printed."""
from __future__ import annotations

import datetime as dt
import json
import os
from pathlib import Path
import re
import shutil
import socket
import subprocess


def command(args: list[str], timeout: int = 15) -> tuple[int | None, str]:
    try:
        result = subprocess.run(
            args, text=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
            timeout=timeout, check=False
        )
        return result.returncode, result.stdout
    except (OSError, subprocess.TimeoutExpired):
        return None, ""


def memory_kib() -> dict[str, int]:
    keys = {"MemTotal", "MemAvailable", "SwapTotal", "SwapFree"}
    result = {}
    try:
        for line in Path("/proc/meminfo").read_text().splitlines():
            name, _, value = line.partition(":")
            if name in keys:
                result[name + "_KiB"] = int(value.strip().split()[0])
    except (OSError, ValueError, IndexError):
        pass
    return result


def disk_free_gib() -> float | None:
    for directory in ("/var/www", "/"):
        if Path(directory).is_dir():
            try:
                return round(shutil.disk_usage(directory).free / (1024 ** 3), 2)
            except OSError:
                pass
    return None


def service_inventory() -> list[dict[str, str | int | None]]:
    code, output = command([
        "systemctl", "list-units", "--type=service", "--all", "--no-legend", "--plain"
    ])
    if code != 0:
        return []
    services = []
    for line in output.splitlines():
        pieces = line.strip().split()
        if not pieces:
            continue
        name = pieces[0].lstrip("●")
        if not name.endswith(".service") or "circle-card" not in name.lower():
            continue
        _, details = command([
            "systemctl", "show", name, "--no-pager",
            "--property=ActiveState,MainPID,WorkingDirectory,FragmentPath"
        ])
        info = {}
        for entry in details.splitlines():
            key, sep, value = entry.partition("=")
            if sep and key in {"ActiveState", "MainPID", "WorkingDirectory", "FragmentPath"}:
                info[key] = value
        pid_str = info.get("MainPID", "0")
        pid = int(pid_str) if pid_str.isdigit() else 0
        current_working_dir = ""
        if pid > 1:
            try:
                current_working_dir = str((Path("/proc") / str(pid) / "cwd").resolve())
            except (OSError, RuntimeError):
                pass
        services.append({
            "service": name,
            "state": info.get("ActiveState", "unknown"),
            "working_directory": info.get("WorkingDirectory", ""),
            "process_cwd": current_working_dir,
            "service_file": info.get("FragmentPath", ""),
        })
    return services[:30]


def nginx_hints() -> dict[str, object]:
    code, output = command(["nginx", "-T"], timeout=20)
    if code != 0:
        return {"readable": False, "note": "nginx -T could not be read"}
    # These are clues only: reverse-proxy includes, upstream names and routing can
    # make a straightforward regex incomplete. Do not deploy based on this output.
    domains = sorted(set(re.findall(r"(?m)^\s*server_name\s+([^;]*circlecard\.co\.uk[^;]*);", output)))
    ports = sorted(set(int(p) for p in re.findall(
        r"proxy_pass\s+https?://(?:127\.0\.0\.1|localhost):(\d+)", output
    )))
    return {
        "readable": True,
        "circlecard_server_names": domains[:10],
        "local_proxy_ports_in_config_not_necessarily_circle_card": ports[:30],
        "authoritative_active_release_identified": False,
    }


def latest_entries(directory: str, max_entries: int = 8) -> list[dict[str, str]]:
    path = Path(directory)
    if not path.is_dir():
        return []
    try:
        candidates = sorted(
            (entry for entry in path.iterdir() if entry.name.startswith("circle-card")),
            key=lambda entry: entry.stat().st_mtime, reverse=True
        )[:max_entries]
        return [{
            "name": entry.name,
            "modified_utc": dt.datetime.fromtimestamp(
                entry.stat().st_mtime, tz=dt.timezone.utc
            ).isoformat(timespec="seconds"),
            "type": "directory" if entry.is_dir() else "file",
        } for entry in candidates]
    except OSError:
        return []


def main() -> None:
    mem = memory_kib()
    available = mem.get("MemAvailable_KiB", 0)
    report = {
        "mode": "READ_ONLY_NO_DEPLOYMENT",
        "timestamp_utc": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "hostname": socket.gethostname(),
        "effective_user_id": os.geteuid(),
        "memory": mem,
        "available_disk_GiB": disk_free_gib(),
        "existing_installer_memory_floor_met": available >= 3584 * 1024,
        "nginx": nginx_hints(),
        "circle_card_services": service_inventory(),
        "release_directory_candidates": latest_entries("/var/www/releases"),
        "hucknall_release_state_candidates": latest_entries("/var/lib/circle-card-hucknall"),
        "database_backup_verified": False,
        "restore_test_verified": False,
        "deployment_authorised_by_this_report": False,
        "operator_note": (
            "Read-only evidence only. The active Nginx-to-process-to-release chain, "
            "recoverable database backup, rollback and isolated preview must be "
            "independently verified before any production switch."
        ),
    }
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
