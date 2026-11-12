#!/usr/bin/env python3
"""Read-only bridge planning: old registry -> currently running Circle Card release.

Reports backup runner invocation structure and independent deployment evidence
without printing credentials, environment values or raw manifests.
Never executes the recovery runner or writes to production.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess

RUNNER = Path("/opt/circle-card-recovery/run.mjs")
LIVE = "circle-card-bransons-account-20261109-115143.service"
RELEASE = Path("/var/www/releases/circle-card-bransons-account-20261109-115143")
STATE = Path("/var/lib/circle-card-recovery")
BACKUPS = Path("/var/backups/circle-card-recovery")
ARTIFACTS = Path("/var/lib/thebusinesscircle/circle-card-artifacts")


def safe_run(argv):
    try:
        r = subprocess.run(argv, capture_output=True, text=True, timeout=8, check=False)
        return r.stdout if r.returncode == 0 else ""
    except (OSError, subprocess.TimeoutExpired):
        return ""


def properties(unit, keys):
    raw = safe_run(["systemctl", "show", unit, "--no-pager",
                    "--property=" + ",".join(keys)])
    return {k: v for line in raw.splitlines()
            for k, sep, v in [line.partition("=")] if sep and k in keys}


def candidate_ref(value):
    if not isinstance(value, str):
        return None
    if re.fullmatch(r"[a-fA-F0-9]{7,64}", value):
        return value[:12]
    return None


def redact_js(line):
    line = re.sub(chr(96) + "[^" + chr(96) + "]*" + chr(96), "<literal>", line)
    line = re.sub(r"""(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')""",
                  "<literal>", line)
    line = re.sub(r"[a-zA-Z0-9_+/-]{50,}", "<long-token>", line)
    return line.strip()[:420]


def backup_records():
    result = {"backup_root_exists": BACKUPS.is_dir(), "directory_count": 0,
              "latest": [], "last_run_json_exists": False, "last_run_key_names": []}
    if BACKUPS.is_dir():
        items = []
        for entry in list(BACKUPS.iterdir())[:3000]:
            if entry.is_symlink() or not entry.is_dir():
                continue
            try:
                stat = entry.stat()
            except OSError:
                continue
            items.append({"name": entry.name[:80],
                          "modified_utc": dt.datetime.fromtimestamp(
                              stat.st_mtime, dt.timezone.utc).isoformat(timespec="seconds")})
        result["directory_count"] = len(items)
        result["latest"] = sorted(items, key=lambda x: x["modified_utc"], reverse=True)[:8]
    last = STATE / "last-run.json"
    if last.is_file() and not last.is_symlink() and last.stat().st_size < 100000:
        result["last_run_json_exists"] = True
        try:
            d = json.loads(last.read_text())
            if isinstance(d, dict):
                result["last_run_key_names"] = sorted(list(d))[:40]
                for key in ("applicationSha", "publicPort", "status", "timestamp"):
                    value = d.get(key)
                    if key == "applicationSha":
                        result["last_run_application_sha_prefix"] = candidate_ref(value)
                    elif key == "publicPort" and type(value) is int:
                        result["last_run_public_port"] = value
                    elif key == "status" and isinstance(value, str) and re.fullmatch("[A-Za-z0-9_-]{1,40}", value):
                        result["last_run_status"] = value
        except (OSError, ValueError):
            result["last_run_unreadable"] = True
    return result


def alternate_deployments():
    candidates = []
    searched = 0
    root = Path("/var/lib")
    for base in list(root.iterdir())[:1200]:
        if base.is_symlink() or not base.is_dir() or not base.name.startswith("circle-card-"):
            continue
        try:
            dirs = [base] + [x for x in list(base.iterdir())[:160]
                             if x.is_dir() and not x.is_symlink()]
        except OSError:
            continue
        for sub in dirs:
            path = sub / "deployment.json"
            if path.is_symlink() or not path.is_file():
                continue
            try:
                if path.stat().st_size > 200000:
                    continue
                payload = json.loads(path.read_text(encoding="utf8"))
            except (OSError, UnicodeError, ValueError):
                continue
            searched += 1
            if not isinstance(payload, dict):
                continue
            port = payload.get("port") or payload.get("publicPort")
            release = payload.get("release")
            service = payload.get("service")
            if not (port == 3386 or service == LIVE or release == str(RELEASE)):
                continue
            candidates.append({
                "record_location": str(path),
                "field_names": sorted(payload.keys())[:35],
                "port": port if type(port) is int else None,
                "service_is_live": service == LIVE,
                "release_is_live": release == str(RELEASE),
                "git_ref_prefix": candidate_ref(payload.get("git_ref")),
            })
    return {"deployment_records_scanned": searched,
            "matching_live_candidates": candidates[:15]}


def runner_structure():
    output = {"exists": RUNNER.is_file() and not RUNNER.is_symlink()}
    if not output["exists"]:
        return output
    raw = RUNNER.read_bytes()
    if len(raw) > 200000:
        return {"exists": True, "too_large": True}
    source = raw.decode("utf8")
    lines = source.splitlines()
    output.update({
        "runner_sha256": hashlib.sha256(raw).hexdigest(),
        "source_line_count": len(lines),
        "redacted_operational_source": [
            {"line": i + 1, "code": redact_js(line)}
            for i, line in enumerate(lines)
            if 9 <= i < min(len(lines), 34)
        ],
    })
    matched = re.search(r"\bconst\s+pack\s*=\s*(['\"])(/[^'\"\n]+)\1", source)
    if matched:
        pack = Path(matched.group(2))
        if str(pack).startswith(("/opt/", "/usr/local/", "/var/lib/", "/var/backups/")):
            output["backup_pack_path"] = str(pack)
            output["backup_pack_exists"] = pack.exists()
    return output


def main():
    live = properties(LIVE, ["ActiveState", "MainPID", "WorkingDirectory"])
    try:
        pid = int(live.get("MainPID", "0"))
        cwd = str((Path("/proc") / str(pid) / "cwd").resolve(strict=True))
    except (OSError, ValueError, RuntimeError):
        cwd = None
    outputs = {
        "mode": "READ_ONLY_RECOVERY_REPAIR_BRIDGE_PLAN",
        "timestamp_utc": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "live_service_state": live.get("ActiveState"),
        "live_cwd_matches_known_release": cwd == str(RELEASE),
        "live_service_workdir_matches_release": live.get("WorkingDirectory") == str(RELEASE),
        "runner": runner_structure(),
        "existing_backup_state": backup_records(),
        "alternative_deployment_records": alternate_deployments(),
        "required_backup_tools_installed": {
            k: shutil.which(k) is not None
            for k in ("pg_dump", "pg_restore", "psql", "createdb", "node", "flock")
        },
        "app_source_exists": (RELEASE / "src").is_dir(),
        "app_node_modules_exists": (RELEASE / "node_modules").exists(),
        "registry_root_exists": ARTIFACTS.is_dir(),
        "modified_production": False,
        "recovery_executed": False,
        "secrets_or_raw_manifest_data_printed": False,
        "next_step": ("Do not patch recovery selection blindly. Verify app release identity "
                      "and determine whether the old backup pack accepts this native release "
                      "before testing a replacement."),
    }
    print(json.dumps(outputs, indent=2))


if __name__ == "__main__":
    main()
