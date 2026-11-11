#!/usr/bin/env python3
"""Guarded retirement of stale Circle Card app processes (NO release file deletion).

Default: --check (read-only). --apply stops ONLY exact old services, keeps the
live service and two immediate predecessors available, checks health and starts
stopped services again on failure. Never disables units, deletes files, changes
nginx, databases, credentials or ports.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

LIVE = ("circle-card-bransons-account-20261109-115143.service", 3386)
PRESERVE = {
    "circle-card-pro-custom-upgrades-20261105-113606.service": 3385,
    "circle-card-business-discover-20261105-102907.service": 3384,
}
OLD = {
    "circle-card-lawrence-20261102-231225.service": 3373,
    "circle-card-hucknall-20261103-000635.service": 3374,
    "circle-card-hucknall-20261103-100951.service": 3375,
    "circle-card-hucknall-20261103-121602.service": 3376,
    "circle-card-hucknall-20261103-135055.service": 3377,
    "circle-card-precision-20261104-100251.service": 3378,
    "circle-card-confirm-a-kill-20261104-201336.service": 3379,
    "circle-card-confirm-a-kill-20261104-205605.service": 3380,
    "circle-card-confirm-a-kill-20261104-212214.service": 3381,
    "circle-card-hucknall-20261104-221648.service": 3382,
    "circle-card-commissions-menu-20261104-225534.service": 3383,
}
EXPECTED_ROOT = Path("/var/www/releases")


def execute(args: list[str], timeout: int = 30) -> str:
    result = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                            text=True, timeout=timeout, check=False)
    if result.returncode:
        raise RuntimeError(f"{args[0]} command failed with exit {result.returncode}")
    return result.stdout


def service(name: str) -> dict[str, str]:
    output = execute(["systemctl", "show", name, "--no-pager",
                      "--property=ActiveState,MainPID,WorkingDirectory,RequiredBy,PartOf,TriggeredBy,BoundBy,UpheldBy,WantedBy,RefuseManualStop"])
    return dict(line.split("=", 1) for line in output.splitlines() if "=" in line)


def listener_for_port(port: int) -> tuple[str, set[int]]:
    output = execute(["ss", "-H", "-lntp"])
    matches = []
    for line in output.splitlines():
        cols = line.split()
        if len(cols) < 5:
            continue
        match = re.search(r":(\d+)$", cols[3])
        if match and int(match.group(1)) == port:
            matches.append((cols[3], set(int(x) for x in re.findall(r"pid=(\d+)", line))))
    if len(matches) != 1:
        raise RuntimeError(f"Expected one listener for port {port}, found {len(matches)}")
    return matches[0]


def expected_release(name: str) -> str:
    return str(EXPECTED_ROOT / name.removesuffix(".service"))


def guard(name: str, port: int) -> None:
    props = service(name)
    if props.get("ActiveState") != "active":
        raise RuntimeError(f"{name} is no longer active; aborting rather than assuming a stale inventory")
    try:
        pid = int(props.get("MainPID", "0"))
    except ValueError:
        raise RuntimeError(f"Unexpected main PID for {name}")
    if pid <= 1:
        raise RuntimeError(f"No valid process PID for {name}")
    directory = expected_release(name)
    if props.get("WorkingDirectory") != directory:
        raise RuntimeError(f"Unknown working directory for {name}")
    try:
        process_cwd = str((Path("/proc") / str(pid) / "cwd").resolve(strict=True))
    except (OSError, RuntimeError) as e:
        raise RuntimeError(f"Cannot verify process directory for {name}") from e
    if process_cwd != directory:
        raise RuntimeError(f"PID working directory differs for {name}")
    address, pids = listener_for_port(port)
    if pids != {pid}:
        raise RuntimeError(f"Listener PID mismatch for {name}")
    if not (address.startswith("127.0.0.1:") or address.startswith("[::1]:")):
        raise RuntimeError(f"Unexpected non-loopback listener for {name}")
    for key in ("RequiredBy", "PartOf", "TriggeredBy", "BoundBy", "UpheldBy"):
        if props.get(key, "").strip():
            raise RuntimeError(f"Service {name} has {key} dependencies")
    if props.get("RefuseManualStop", "no") != "no":
        raise RuntimeError(f"Service {name} refuses manual stop")
    if props.get("WantedBy", "").split() not in ([], ["multi-user.target"]):
        raise RuntimeError(f"Unexpected reverse Want dependency for {name}")


def connections_to(ports: set[int]) -> None:
    tcp = execute(["ss", "-H", "-tn"])
    for line in tcp.splitlines():
        cols = line.split()
        if len(cols) < 5:
            continue
        for address in cols[3:5]:
            match = re.search(r":(\d+)$", address)
            if match and int(match.group(1)) in ports:
                raise RuntimeError(f"Active TCP connection exists on an old service port {match.group(1)}")


def verify_nginx() -> None:
    # Check the full effective config; if a named upstream or any other site
    # references a protected old port, do not stop services.
    conf = execute(["nginx", "-T"])
    old_ports = set(OLD.values())
    # A port reference anywhere in nginx config is a block, not an assumption.
    for port in old_ports:
        if re.search(rf":{port}(?!\d)", conf):
            raise RuntimeError(f"Nginx still references old service port {port}")
    if not re.search(r"proxy_pass\s+http://127\.0\.0\.1:3386\s*;", conf):
        raise RuntimeError("Expected live proxy destination is missing from Nginx")
    # Verify Nginx syntax, not just textual references.
    execute(["nginx", "-t"])


def verify_http() -> None:
    for path in ("/login", "/card/hucknall-circle-hub"):
        status = execute([
            "curl", "--silent", "--show-error", "--output", "/dev/null",
            "--write-out", "%{http_code}", "--connect-timeout", "5", "--max-time", "20",
            "--resolve", "circlecard.co.uk:443:127.0.0.1",
            "https://circlecard.co.uk" + path
        ]).strip()
        if status != "200":
            raise RuntimeError(f"Live website returned HTTP {status} at {path}")


def plan() -> None:
    guard(*LIVE)
    for name, port in PRESERVE.items():
        guard(name, port)
    for name, port in OLD.items():
        guard(name, port)
    verify_nginx()
    connections_to(set(OLD.values()))
    verify_http()


def apply() -> None:
    # Exact second check immediately before stopping anything.
    plan()
    stopped: list[str] = []
    try:
        for name, port in OLD.items():
            guard(name, port)
            connections_to({port})
            execute(["systemctl", "stop", name], timeout=40)
            stopped.append(name)
            if service(name).get("ActiveState") != "inactive":
                raise RuntimeError(f"{name} did not become inactive")
            guard(*LIVE)
            verify_http()
        print(json.dumps({
            "result": "STOPPED_ONLY_OLD_SERVICES",
            "stopped": stopped,
            "live_preserved": LIVE[0],
            "rollback_preserved": list(PRESERVE),
            "release_files_deleted": False,
            "services_disabled": False,
            "database_touched": False,
        }, indent=2))
    except BaseException:
        # Include KeyboardInterrupt/SIGINT so an interrupted operator shell
        # still attempts to restore previously stopped units.
        failures = []
        for name in reversed(stopped):
            try:
                execute(["systemctl", "start", name], timeout=50)
            except Exception:
                failures.append(name)
        print(json.dumps({
            "result": "ROLLED_BACK_STOP_ATTEMPT",
            "restored_services": [n for n in stopped if n not in failures],
            "restart_failures_requiring_operator": failures,
            "release_files_deleted": False,
        }, indent=2))
        raise


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Stop 11 verified old services; restarts them on failure")
    args = parser.parse_args()
    if args.apply:
        apply()
    else:
        plan()
        print(json.dumps({
            "result": "READY_FOR_EXPLICIT_APPLY",
            "old_services_checked": list(OLD),
            "live_preserved": LIVE[0],
            "rollback_preserved": list(PRESERVE),
            "no_changes_made": True,
            "warning": "Passing this preflight does not verify database backup integrity or make app deployment safe.",
        }, indent=2))


if __name__ == "__main__":
    try:
        main()
    except (OSError, RuntimeError, subprocess.TimeoutExpired) as exc:
        print(json.dumps({"result": "ABORTED", "reason": str(exc)}))
        sys.exit(1)
