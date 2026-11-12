#!/usr/bin/env python3
"""Read-only root cause traces for the Circle Card recovery assertion.

No raw journal output, environment/secret values, database content or config
values are exposed. No file write, restart or recovery trigger.
"""
from __future__ import annotations

import datetime as dt
import json
from pathlib import Path
import re
import shlex
import subprocess

UNIT = Path("/etc/systemd/system/circle-card-recovery.service")
ROOTS = ("/var/lib/circle-card-recovery", "/var/www/", "/usr/local/", "/opt/")
SCRIPT_SUFFIX = {".js", ".cjs", ".mjs"}


def execute(argv, timeout=15):
    try:
        result = subprocess.run(argv, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                text=True, timeout=timeout, check=False)
        return result.stdout if result.returncode == 0 else ""
    except (OSError, subprocess.TimeoutExpired):
        return ""


def locate_node_script():
    if not UNIT.is_file():
        return {"unit_file_found": False}, None
    try:
        text = UNIT.read_text(errors="replace")
    except OSError:
        return {"unit_file_found": True, "unit_file_readable": False}, None
    for raw in re.findall(r"(?m)^\s*ExecStart\s*=\s*(.+)$", text):
        try:
            arguments = shlex.split(raw)
        except ValueError:
            continue
        for arg in arguments:
            if not arg.startswith("/") or Path(arg).suffix.lower() not in SCRIPT_SUFFIX:
                continue
            if not any(arg.startswith(prefix) for prefix in ROOTS):
                continue
            path = Path(arg)
            # A symlink could lead to a sensitive file; reject it for source inspection.
            if path.is_symlink() or not path.is_file():
                return {"script_path": arg, "script_found": False}, None
            try:
                stat = path.stat()
            except OSError:
                return {"script_path": arg, "script_stat_failed": True}, None
            if stat.st_size > 1024 * 1024:
                return {"script_path": arg, "script_too_large_to_scan": True}, None
            return {
                "script_path": arg, "script_found": True,
                "script_bytes": stat.st_size,
                "modified_utc": dt.datetime.fromtimestamp(
                    stat.st_mtime, dt.timezone.utc).isoformat(timespec="seconds")
            }, path
    return {"unit_file_found": True, "node_script_not_identified": True}, None


def recent_error_trace():
    output = execute(["journalctl", "--no-pager", "--output=cat",
                      "-u", "circle-card-recovery.service", "-n", "300"])
    lines = output.splitlines()
    failure_indices = [
        i for i, line in enumerate(lines)
        if re.search(r"\bAssertionError\b|ERR_ASSERTION|triggerUncaughtException", line)
    ]
    frames = []
    source_line_numbers = []
    for i in failure_indices[-8:]:
        for line in lines[max(0, i - 2):min(len(lines), i + 15)]:
            # Node stack: at Object.<anonymous> (/path/file.mjs:line:col)
            m = re.search(r"(?:file://)?(/[^\s()]+?\.(?:mjs|cjs|js)):(\d+):(\d+)", line)
            if m and (m.group(1).startswith(ROOTS)):
                frame = {
                    "file_basename": Path(m.group(1)).name,
                    "line": int(m.group(2)),
                    "column": int(m.group(3)),
                }
                if frame not in frames:
                    frames.append(frame)
                    source_line_numbers.append(frame["line"])
    error_types = sorted(set(re.findall(
        r"\b(?:AssertionError|TypeError|ReferenceError|SyntaxError|RangeError|ERR_ASSERTION)\b",
        "\n".join(lines))))
    return {
        "errors_seen": error_types, "stack_frames": frames[:12],
        "line_numbers_from_frames": sorted(set(source_line_numbers)),
        "journal_raw_messages_excluded": True,
    }


def safe_expression(line):
    # Return only operator- and identifier-oriented code, never literal values.
    line = re.sub(r"//.*$", "", line).strip()
    line = re.sub(r"(['\"\`])(?:\\.|(?!\1).)*?\1", "<string>", line)
    line = re.sub(r"/https?://\S+", "<url>", line, flags=re.I)
    line = re.sub(r"[A-Za-z0-9+/]{36,}={0,2}", "<long-value>", line)
    if len(line) > 180:
        line = line[:180] + "..."
    return line


def script_assertions(path, error):
    if path is None:
        return {"readable": False}
    try:
        lines = path.read_text(errors="replace").splitlines()
    except OSError:
        return {"readable": False}
    nearby = error.get("line_numbers_from_frames") or []
    inspections = []
    for no in nearby:
        if not 1 <= no <= len(lines):
            continue
        inspections.append({
            "line": no,
            "expression_redacted": safe_expression(lines[no - 1]),
            "context_operators_only": [
                {
                    "line": n + 1,
                    "expression_redacted": safe_expression(lines[n]),
                }
                for n in range(max(0, no - 3), min(len(lines), no + 2))
                if re.search(r"\bassert\b|\bthrow\b|\.every\(|\.some\(|\.find\(|\.includes\(|\bif\s*\(", lines[n])
            ][:6],
        })
    assertion_lines = [
        {"line": n + 1, "expression_redacted": safe_expression(line)}
        for n, line in enumerate(lines)
        if re.search(r"\bassert(?:\.|\s*\()", line)
    ]
    return {
        "readable": True,
        "line_count": len(lines),
        "trace_locations": inspections[:8],
        "assertion_sites": assertion_lines[:30],
        "literal_strings_redacted": True,
    }


def backup_structure():
    root = Path("/var/lib/circle-card-recovery")
    if not root.is_dir():
        return {"directory_exists": False}
    items = []
    try:
        for child in sorted(root.iterdir(), key=lambda p: p.name)[:80]:
            if child.is_symlink():
                continue
            try:
                stat = child.stat()
                items.append({
                    "name": child.name[:80],
                    "kind": "directory" if child.is_dir() else "file" if child.is_file() else "other",
                    "size_mib": round(stat.st_size / 1048576, 3) if child.is_file() else None,
                    "modified_utc": dt.datetime.fromtimestamp(
                        stat.st_mtime, dt.timezone.utc).isoformat(timespec="seconds"),
                })
            except OSError:
                continue
    except OSError:
        pass
    return {"directory_exists": True, "entries": items}


def main():
    script, path = locate_node_script()
    trace = recent_error_trace()
    result = {
        "mode": "READ_ONLY_RECOVERY_FAILURE_FORENSICS",
        "generated_utc": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "recovery_script": script,
        "last_error": trace,
        "source_assertions": script_assertions(path, trace),
        "recovery_state_directory": backup_structure(),
        "writes_made": False,
        "credentials_or_raw_log_messages_included": False,
        "note": "Source expressions are redacted heuristically. Do not use the report to conclude backups have been restored or validated.",
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
