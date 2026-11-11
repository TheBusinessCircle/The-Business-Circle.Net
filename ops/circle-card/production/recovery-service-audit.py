#!/usr/bin/env python3
"""Read-only Circle Card backup, recovery and service-retirement audit.

No writes, restarts, deletions, environment dumps, configuration or journal content.
"""
import datetime as dt
import json
import re
import subprocess
from pathlib import Path

LIVE_SERVICE = "circle-card-bransons-account-20261109-115143.service"
RECOVERY_SERVICE = "circle-card-recovery.service"


def cmd(args, seconds=15):
    try:
        result = subprocess.run(args, capture_output=True, text=True, timeout=seconds, check=False)
        return result.stdout if result.returncode == 0 else ""
    except (OSError, subprocess.TimeoutExpired):
        return ""


def show(unit, keys):
    raw = cmd(["systemctl", "show", unit, "--no-pager",
               "--property=" + ",".join(keys)])
    result = {}
    for line in raw.splitlines():
        key, sep, value = line.partition("=")
        if sep and key in keys:
            result[key] = value
    return result


def service_pids():
    raw = cmd(["systemctl", "list-units", "--all", "--type=service", "--no-legend", "--plain"])
    services = []
    for line in raw.splitlines():
        words = line.strip().split()
        if not words:
            continue
        unit = words[0].lstrip("●")
        if not (unit.startswith("circle-card-") and unit.endswith(".service")):
            continue
        props = show(unit, ["ActiveState", "MainPID", "MemoryCurrent",
                            "WorkingDirectory", "RequiredBy", "WantedBy",
                            "PartOf", "TriggeredBy", "UnitFileState"])
        if props.get("ActiveState") != "active":
            continue
        try:
            pid = int(props.get("MainPID") or "0")
        except ValueError:
            pid = 0
        try:
            memory = round(int(props.get("MemoryCurrent") or "0") / 1048576, 1)
        except ValueError:
            memory = None
        item = {
            "service": unit,
            "pid": pid,
            "memory_MiB": memory,
            "directory": props.get("WorkingDirectory") or None,
            "required_by": props.get("RequiredBy", "").split()[:8],
            "wanted_by": props.get("WantedBy", "").split()[:8],
            "part_of": props.get("PartOf", "").split()[:8],
            "triggered_by": props.get("TriggeredBy", "").split()[:8],
            "enabled_state": props.get("UnitFileState") or None,
            "public_site_release": unit == LIVE_SERVICE,
        }
        services.append(item)
    return services


def listening_pids():
    raw = cmd(["ss", "-H", "-lntp"])
    bindings = {}
    for line in raw.splitlines():
        parts = line.split()
        if len(parts) < 5:
            continue
        port_match = re.search(r":(\d+)$", parts[3])
        if not port_match:
            continue
        port = int(port_match.group(1))
        for text_pid in re.findall(r"pid=(\d+)", line):
            bindings.setdefault(int(text_pid), set()).add(port)
    return bindings


def recent_backup_candidates():
    roots = [
        "/var/backups",
        "/var/backups/circle-card",
        "/var/lib/circle-card-recovery",
        "/var/lib/circle-card/backups",
    ]
    found = []
    for root_text in roots:
        root = Path(root_text)
        if not root.is_dir():
            continue
        candidates = []
        try:
            for p in root.iterdir():
                if p.is_symlink() or not p.is_file():
                    continue
                try:
                    stat = p.stat()
                except OSError:
                    continue
                if stat.st_size <= 0:
                    continue
                name = p.name.lower()
                if not (re.search(r"circle|postgres|pgdump|database|backup|\.sql|\.dump|\.tar|\.gz|\.zst", name)):
                    continue
                candidates.append({
                    "filename": re.sub(r"[^a-zA-Z0-9_.-]", "_", p.name)[:100],
                    "size_MiB": round(stat.st_size / 1048576, 3),
                    "modified_utc": dt.datetime.fromtimestamp(
                        stat.st_mtime, tz=dt.timezone.utc).isoformat(timespec="seconds"),
                })
            candidates.sort(key=lambda a: a["modified_utc"], reverse=True)
        except OSError:
            pass
        found.append({"directory": root_text, "possible_files": candidates[:12]})
    return found


def failure_categories():
    journal = cmd(["journalctl", "--no-pager", "-o", "cat",
                   "-u", RECOVERY_SERVICE, "-n", "100"], seconds=12)
    probes = {
        "missing_or_unrecognized_release": r"unknown.*release|active.*release.*(?:missing|not found|unrecogni[sz])|cannot identify|cannot locate",
        "missing_file_or_path": r"no such file|not found|missing file|does not exist",
        "permission_error": r"permission denied|operation not permitted",
        "disk_full": r"no space left|disk full|quota exceeded",
        "database_error": r"pg_dump.*(?:error|fail)|postgres.*(?:error|fail)|database.*(?:error|fail)",
        "out_of_memory": r"out of memory|cannot allocate memory|killed process|oom",
        "exit_or_failure_mentioned": r"(?:error|failed|exception)",
    }
    return {key: bool(re.search(pattern, journal, flags=re.IGNORECASE))
            for key, pattern in probes.items()}


def main():
    services = service_pids()
    bindings = listening_pids()
    for service in services:
        service["listening_tcp_ports_on_main_pid"] = sorted(bindings.get(service["pid"], set()))
        service["no_main_pid_listener_observed"] = not bool(bindings.get(service["pid"]))
        service["safe_to_stop_proven"] = False
    report = {
        "mode": "READ_ONLY_CIRCLE_CARD_RECOVERY_AND_SERVICE_AUDIT",
        "generated_utc": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "live_service_expected": LIVE_SERVICE,
        "live_service_listening_on_3386": any(
            s["service"] == LIVE_SERVICE and 3386 in s["listening_tcp_ports_on_main_pid"]
            for s in services),
        "services": services,
        "recovery_status": show(RECOVERY_SERVICE,
            ["ActiveState", "Result", "ExecMainStatus", "ActiveEnterTimestamp",
             "InactiveEnterTimestamp", "UnitFileState", "TriggeredBy"]),
        "recovery_error_categories_without_log_contents": failure_categories(),
        "potential_backup_files_metadata_only": recent_backup_candidates(),
        "database_backup_validated": False,
        "restore_test_validated": False,
        "services_authorized_to_stop": [],
        "production_changes_made": False,
        "note": ("No-port services are not automatically safe to stop: they may run jobs, "
                 "be reverse-proxied elsewhere or be used for rollback. Verify their "
                 "dependencies and service roles separately. Backup existence is not a "
                 "successful restore test.")
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
