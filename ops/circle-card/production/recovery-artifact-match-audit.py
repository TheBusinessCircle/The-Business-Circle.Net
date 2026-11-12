#!/usr/bin/env python3
"""Read-only inspection of recovery's deployment-record mismatch.

No raw script, record content, private config, logs or credentials are printed.
No changes to production, systemd, services, backups or Nginx.
"""
from __future__ import annotations
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re

SCRIPT = Path("/opt/circle-card-recovery/run.mjs")
VALID_PATH_PREFIXES = ("/var/lib/", "/var/www/", "/var/backups/", "/opt/circle-card-")
LIVE_SERVICE = "circle-card-bransons-account-20261109-115143.service"
EXPECTED_PORT = 3386


def redact(line):
    # Preserve identifiers and operators. Hide all source string literal
    # contents, which can include tokens, SQL or service credentials.
    line = re.sub(r"(?:'(?:(?:\\.)|[^'\\])*'|\"(?:(?:\\.)|[^\"\\])*\"|\`[^\`]*\`)", "<literal>", line)
    line = re.sub(r"(?i)(password|token|secret|apikey)\s*[:=]\s*[^\s;]+", r"\1=<redacted>", line)
    line = re.sub(r"[A-Za-z0-9_+/-]{48,}={0,2}", "<long-value>", line)
    return line.strip()[:360]


def acceptable_directory(path_string):
    if not isinstance(path_string, str):
        return None
    if not path_string.startswith(VALID_PATH_PREFIXES):
        return None
    if re.search(r"[?@&=$%\\\s]", path_string) or ".." in Path(path_string).parts:
        return None
    if len(path_string) > 220:
        return None
    p = Path(path_string)
    if p.is_symlink() or not p.is_dir():
        return None
    return p


def extract_candidate_paths(lines):
    result = []
    source = "\n".join(lines)
    for variable in ("artifacts", "state", "parent", "root"):
        m = re.search(r"\b(?:const|let)\s+" + variable + r"\s*=\s*(['\"])(/[^'\"\n]+)\1", source)
        if m:
            value = m.group(2)
            folder = acceptable_directory(value)
            result.append({"variable": variable, "resolved_path": str(folder) if folder else None,
                           "looks_like_directory": folder is not None})
    return result


def collect_manifests(folder):
    result = {"directory": str(folder), "sampled_files": 0, "valid_json_objects": 0,
              "status_counts": {}, "records_on_port_3386": 0,
              "port_3386_examples": [], "other_public_ports": {},
              "matching_status_and_port": None}
    statuses = Counter()
    ports = Counter()
    samples = []
    expected_status = "published"
    # See script excerpts to confirm expected status; do not infer if not present.
    for file in list(folder.iterdir())[:1800]:
        if file.is_symlink() or not file.is_file() or file.stat().st_size > 262144:
            continue
        # Read only simple record files: hash manifest records, not env/config.
        if not re.fullmatch(r"[0-9a-fA-F]{40,64}(?:\.json)?", file.name):
            continue
        result["sampled_files"] += 1
        try:
            payload = json.loads(file.read_text(encoding="utf-8"))
        except (OSError, UnicodeError, ValueError):
            continue
        if not isinstance(payload, dict):
            continue
        result["valid_json_objects"] += 1
        status = payload.get("status")
        if isinstance(status, str) and re.fullmatch(r"[A-Za-z_-]{1,30}", status):
            statuses[status] += 1
        port = payload.get("publicPort")
        if isinstance(port, int) and 0 < port <= 65535:
            ports[port] += 1
        if port == EXPECTED_PORT:
            result["records_on_port_3386"] += 1
            sha = payload.get("applicationSha")
            sha_prefix = (sha[:12] if isinstance(sha, str)
                          and re.fullmatch(r"[0-9a-fA-F]{40,64}", sha) else "unrecognised")
            samples.append({"status": status if isinstance(status,str) and re.fullmatch(r"[A-Za-z_-]{1,30}",status) else None,
                            "application_sha_prefix": sha_prefix})
    result["status_counts"] = dict(statuses.most_common(15))
    result["other_public_ports"] = {str(k):v for k,v in ports.most_common(20)}
    result["port_3386_examples"] = samples[:8]
    return result


def main():
    output = {
        "mode": "READ_ONLY_RECOVERY_ARTIFACT_MISMATCH",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "public_service_expected": LIVE_SERVICE,
        "expected_port": EXPECTED_PORT,
        "script_path": str(SCRIPT),
        "script_present": SCRIPT.is_file() and not SCRIPT.is_symlink(),
        "source_statements": [],
        "directory_candidates": [],
        "deployment_record_inventories": [],
        "production_changes_made": False,
        "credentials_or_raw_records_printed": False,
    }
    if not output["script_present"]:
        print(json.dumps(output, indent=2))
        return
    lines = SCRIPT.read_text(encoding="utf-8").splitlines()
    output["script_sha256"] = hashlib.sha256(SCRIPT.read_bytes()).hexdigest()
    output["source_line_count"] = len(lines)
    output["source_statements"] = [
        {"line": n+1, "redacted_source": redact(line)}
        for n, line in enumerate(lines[:19]) if line.strip()
    ]
    paths = extract_candidate_paths(lines)
    output["directory_candidates"] = paths
    for item in paths:
        if item["variable"] != "artifacts" or not item["resolved_path"]:
            continue
        folder = Path(item["resolved_path"])
        try:
            output["deployment_record_inventories"].append(collect_manifests(folder))
        except OSError:
            output["deployment_record_inventories"].append({"error": "Unable to scan manifest folder"})
    output["note"] = (
        "The 2 October script requires exactly one matching deployment record. "
        "Use the redacted source expressions and safe inventory to locate why the current public release "
        "is not matched. Do not weaken the uniqueness check or run recovery until fixed."
    )
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
