#!/usr/bin/env python3
"""Read-only Circle Card Nginx, listener, process and recovery inventory.

Does not alter site, database, systemd, services, nginx or backups.
Does not print secrets, environment, service commands, config contents or logs.
"""
from __future__ import annotations

import datetime as dt
import json
from pathlib import Path
import re
import subprocess


def run(arguments, timeout=20):
    try:
        r = subprocess.run(arguments, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                           text=True, check=False, timeout=timeout)
        return r.stdout if r.returncode == 0 else ""
    except (OSError, subprocess.TimeoutExpired):
        return ""


def blocks(config, kind):
    pattern = re.compile(r"(?m)^\s*" + re.escape(kind) + r"\s+([^{}\n]*?)\s*\{" if kind == "upstream"
                         else r"(?m)^\s*server\s*\{")
    for match in pattern.finditer(config):
        depth, pos = 1, match.end()
        while depth and pos < len(config):
            if config[pos] == "{":
                depth += 1
            elif config[pos] == "}":
                depth -= 1
            pos += 1
        if depth == 0:
            yield (match.group(1).strip() if kind == "upstream" else ""), config[match.end():pos-1]


def properties(unit, keys):
    raw = run(["systemctl", "show", unit, "--no-pager"] +
              ["--property=" + ",".join(keys)])
    obj = {}
    for line in raw.splitlines():
        k, sep, v = line.partition("=")
        if sep and k in keys:
            obj[k] = v
    return obj


def process_details(pid):
    if not pid:
        return {}
    proc = Path("/proc") / str(pid)
    try:
        cwd = str((proc / "cwd").resolve(strict=True))
    except (OSError, RuntimeError):
        cwd = None
    ppid = None
    try:
        for line in (proc / "status").read_text().splitlines():
            if line.startswith("PPid:"):
                ppid = int(line.split()[1])
                break
    except (OSError, ValueError, IndexError):
        pass
    return {"pid": pid, "cwd": cwd, "ppid": ppid}


def listener_inventory(ports):
    lines = run(["ss", "-H", "-lntp"]).splitlines()
    result = []
    for line in lines:
        fields = line.split()
        if len(fields) < 5:
            continue
        local = fields[3]
        m = re.search(r":(\d+)$", local)
        if not m or int(m.group(1)) not in ports:
            continue
        pid_matches = sorted(set(int(p) for p in re.findall(r"pid=(\d+)", line)))
        result.append({
            "port": int(m.group(1)),
            "listener_address": local,
            "socket_owner_pids": pid_matches,
            "processes": [process_details(pid) for pid in pid_matches[:4]],
        })
    return result[:40]


def service_inventory():
    raw = run(["systemctl", "list-units", "--type=service", "--all",
               "--plain", "--no-legend"])
    all_services = []
    for line in raw.splitlines():
        words = line.strip().split()
        if not words:
            continue
        name = words[0].lstrip("●")
        if name.startswith("circle-card-") and name.endswith(".service"):
            props = properties(name, ["ActiveState", "MainPID", "WorkingDirectory", "MemoryCurrent"])
            if props.get("ActiveState") != "active":
                continue
            try:
                pid = int(props.get("MainPID") or "0")
            except ValueError:
                pid = 0
            mem = props.get("MemoryCurrent", "")
            all_services.append({
                "service": name,
                "main_pid": pid,
                "working_directory": props.get("WorkingDirectory", ""),
                "process_cwd": process_details(pid).get("cwd"),
                "cgroup_memory_mib": round(int(mem) / 1048576, 1) if mem.isdigit() else None,
            })
    return sorted(all_services, key=lambda s: s["service"])[:40]


def backup_metadata():
    locations = [
        "/var/backups/circle-card",
        "/var/lib/circle-card/backups",
        "/var/lib/circle-card-recovery",
        "/var/lib/circle-card/backups",
        "/var/backups",
    ]
    candidates = []
    for value in locations:
        root = Path(value)
        if not root.is_dir():
            continue
        try:
            files = sorted((p for p in root.iterdir() if p.is_file()), key=lambda p: p.stat().st_mtime, reverse=True)
            candidates.append({
                "directory": value,
                "regular_files_top_level": len(files),
                "newest_file_utc": dt.datetime.fromtimestamp(files[0].stat().st_mtime, tz=dt.timezone.utc).isoformat(timespec="seconds") if files else None,
                "newest_file_size_mib": round(files[0].stat().st_size / 1048576, 2) if files else None,
            })
        except OSError:
            candidates.append({"directory": value, "error": "Cannot list"})
    return candidates


def main():
    conf = run(["nginx", "-T"])
    if not conf:
        nginx = {"readable": False}
        circle = []
        local_ports = set()
    else:
        all_proxies = []
        circle = []
        for _, body in blocks(conf, "server"):
            names = sorted(set(re.findall(r"(?m)^\s*server_name\s+([^;]+);", body)))
            proxies = sorted(set(re.findall(r"(?m)^\s*proxy_pass\s+([^;\s]+);", body)))
            all_proxies.extend(proxies)
            if any(re.search(r"\bcirclecard\.co\.uk\b", name) for name in names):
                circle.append({
                    "server_names": names,
                    "proxy_targets": proxies,
                    "listens": sorted(set(re.findall(r"(?m)^\s*listen\s+([^;]+);", body))),
                })
        upstreams = {}
        for name, body in blocks(conf, "upstream"):
            if name:
                upstreams[name] = sorted(set(re.findall(r"(?m)^\s*server\s+([^;\s]+);", body)))
        for p in list(all_proxies):
            if p.startswith("http://") or p.startswith("https://"):
                host = p.split("://", 1)[1].split("/", 1)[0]
                if host in upstreams:
                    all_proxies.extend(upstreams[host])
        local_ports = set()
        for value in all_proxies:
            for port in re.findall(r"(?:127\.0\.0\.1|localhost|\[::1\]):(\d+)", value):
                local_ports.add(int(port))
        nginx = {
            "readable": True,
            "circlecard_vhosts": circle,
            "all_local_proxy_ports": sorted(local_ports),
            "number_of_nginx_server_blocks": len(list(blocks(conf, "server"))),
        }
    recovery = properties("circle-card-recovery.service",
                          ["ActiveState", "Result", "ExecMainStatus", "FragmentPath"])
    services = service_inventory()
    sockets = listener_inventory(local_ports)
    report = {
        "mode": "READ_ONLY_ROUTING_AND_RECOVERY",
        "timestamp_utc": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "nginx": nginx,
        "listeners": sockets,
        "active_circle_card_services": services,
        "active_circle_card_count": len(services),
        "recovery_service_status": recovery,
        "possible_backup_directory_metadata": backup_metadata(),
        "backup_verified": False,
        "restore_verified": False,
        "nginx_to_running_release_proven": False,
        "production_writes_performed": False,
        "operator_note": "Use this inventory as evidence only. Check Nginx port vs socket PID vs service CWD and verify a recoverable DB backup before deploying or stopping old services.",
    }
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
